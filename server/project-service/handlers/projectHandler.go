package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/gorilla/mux"
	"github.com/nats-io/nats.go"
	"github.com/sirupsen/logrus"
	"log"
	"net/http"
	"project-service/client"
	"project-service/customLogger"
	"project-service/model"
	"project-service/repositories"
	"strconv"
	"strings"
)

type KeyProject struct{}
type KeyRole struct{}

type ProjectsHandler struct {
	logger     *log.Logger
	custLogger *customLogger.Logger
	repo       *repositories.ProjectRepo
	natsConn   *nats.Conn
	userClient client.UserClient
	taskClient client.TaskClient
}

type Task struct {
	Status  TaskStatus `bson:"status" json:"status"`
	UserIDs []string   `bson:"user_ids" json:"user_ids"`
}
type TaskStatus string

func (p *ProjectsHandler) MiddlewareExtractUserFromCookie(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, h *http.Request) {
		cookie, err := h.Cookie("auth_token")
		if err != nil {
			http.Error(rw, "No token found in cookie", http.StatusUnauthorized)
			p.logger.Println("No token in cookie:", err)
			return
		}

		userID, role, err := p.verifyTokenWithUserService(cookie.Value)
		if err != nil {
			http.Error(rw, "Invalid token", http.StatusUnauthorized)
			p.logger.Println("Invalid token:", err)
			return
		}

		ctx := context.WithValue(h.Context(), KeyProject{}, userID)
		ctx = context.WithValue(ctx, KeyRole{}, role)

		h = h.WithContext(ctx)

		next.ServeHTTP(rw, h)
	})
}

func (p *ProjectsHandler) verifyTokenWithUserService(token string) (string, string, error) {
	userServiceURL := "http://user-server:8080/validate-token"
	reqBody := fmt.Sprintf(`{"token": "%s"}`, token)
	req, err := http.NewRequest("POST", userServiceURL, strings.NewReader(reqBody))
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("failed to validate token, status: %s", resp.Status)
	}

	var result struct {
		UserID string `json:"user_id"`
		Role   string `json:"role"`
	}

	err = json.NewDecoder(resp.Body).Decode(&result)
	if err != nil {
		return "", "", err
	}

	return result.UserID, result.Role, nil
}

func NewProjectsHandler(l *log.Logger, custLogger *customLogger.Logger, r *repositories.ProjectRepo, natsConn *nats.Conn, userClient client.UserClient, taskClient client.TaskClient) *ProjectsHandler {
	return &ProjectsHandler{l, custLogger, r, natsConn, userClient, taskClient}
}

func (p *ProjectsHandler) GetAllProjects(rw http.ResponseWriter, h *http.Request) {
	projects, err := p.repo.GetAll()
	if err != nil {
		p.logger.Print("Database exception: ", err)
	}

	if projects == nil {
		return
	}

	err = projects.ToJSON(rw)
	if err != nil {
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		p.logger.Fatal("Unable to convert to json :", err)
		return
	}
}

func (p *ProjectsHandler) GetAllProjectsByUser(rw http.ResponseWriter, h *http.Request) {
	// Retrieve role from context
	role, e := h.Context().Value(KeyRole{}).(string)
	if !e {
		http.Error(rw, "Role not defined", http.StatusBadRequest)
		p.logger.Println("Role not defined in context")
		p.custLogger.Warn(nil, "Role not defined in context")
		return
	}

	// Retrieve user ID from context
	userId, ok := h.Context().Value(KeyProject{}).(string)
	if !ok {
		http.Error(rw, "User ID not found", http.StatusUnauthorized)
		p.logger.Println("User ID not found in context")
		p.custLogger.Warn(nil, "User ID not found in context")
		return
	}

	p.logger.Println("Processing request for user ID:", userId)
	p.custLogger.Info(logrus.Fields{
		"user_id": userId,
		"role":    role,
	}, "Processing request for user ID")

	var projects model.Projects
	var err error

	// Fetch projects based on the user's role
	if role == "manager" {
		p.logger.Println("Fetching projects for manager")
		p.custLogger.Info(logrus.Fields{
			"user_id": userId,
			"role":    role,
		}, "Fetching projects for manager")
		projects, err = p.repo.GetAllByManager(userId)
	} else if role == "member" {
		p.logger.Println("Fetching projects for member")
		p.custLogger.Info(logrus.Fields{
			"user_id": userId,
			"role":    role,
		}, "Fetching projects for member")
		projects, err = p.repo.GetAllByMember(userId)
	} else {
		http.Error(rw, "Invalid role specified", http.StatusBadRequest)
		p.logger.Println("Invalid role specified")
		p.custLogger.Warn(logrus.Fields{
			"role": role,
		}, "Invalid role specified")
		return
	}

	// Handle database errors
	if err != nil {
		p.logger.Print("Database exception:", err)
		p.custLogger.Error(logrus.Fields{
			"user_id": userId,
			"role":    role,
			"error":   err.Error(),
		}, "Database exception occurred")
		http.Error(rw, "Database error", http.StatusInternalServerError)
		return
	}

	// Handle case where no projects are found
	if projects == nil {
		http.Error(rw, "No projects found", http.StatusNotFound)
		p.logger.Println("No projects found for user:", userId)
		p.custLogger.Warn(logrus.Fields{
			"user_id": userId,
			"role":    role,
		}, "No projects found for user")
		return
	}

	// Convert projects to JSON and respond
	err = projects.ToJSON(rw)
	if err != nil {
		p.custLogger.Error(logrus.Fields{
			"user_id": userId,
			"role":    role,
			"error":   err.Error(),
		}, "Unable to convert projects to JSON")
		http.Error(rw, "Unable to convert to JSON", http.StatusInternalServerError)
		p.logger.Fatal("Unable to convert projects to JSON:", err)
		return
	}

	// Log success
	p.logger.Println("Successfully fetched projects for user:", userId)
	p.custLogger.Info(logrus.Fields{
		"user_id": userId,
		"role":    role,
	}, "Successfully fetched projects for user")
}

func (p *ProjectsHandler) GetProjectById(rw http.ResponseWriter, h *http.Request) {
	// Extract project ID from request
	vars := mux.Vars(h)
	id := vars["id"]

	p.logger.Println("Fetching project with ID:", id)
	p.custLogger.Info(logrus.Fields{
		"project_id": id,
	}, "Fetching project by ID")

	// Fetch project from repository
	project, err := p.repo.GetById(id)
	if err != nil {
		p.logger.Printf("Database exception: %v", err)
		p.custLogger.Error(logrus.Fields{
			"project_id": id,
			"error":      err.Error(),
		}, "Database exception while fetching project by ID")
		http.Error(rw, "Database error", http.StatusInternalServerError)
		return
	}

	// Handle case where project is not found
	if project == nil {
		http.Error(rw, "Project with given ID not found", http.StatusNotFound)
		p.logger.Printf("Project with ID: '%s' not found", id)
		p.custLogger.Warn(logrus.Fields{
			"project_id": id,
		}, "Project not found")
		return
	}

	// Convert project to JSON and respond
	err = project.ToJSON(rw)
	if err != nil {
		http.Error(rw, "Unable to convert to JSON", http.StatusInternalServerError)
		p.logger.Fatalf("Unable to convert project to JSON: %v", err)
		p.custLogger.Error(logrus.Fields{
			"project_id": id,
			"error":      err.Error(),
		}, "Unable to convert project to JSON")
		return
	}

	// Log successful response
	p.logger.Printf("Successfully retrieved project with ID: '%s'", id)
	p.custLogger.Info(logrus.Fields{
		"project_id": id,
	}, "Successfully retrieved project")
}

func (p *ProjectsHandler) PostProject(rw http.ResponseWriter, h *http.Request) {
	// Retrieve project from context
	project, ok := h.Context().Value(KeyProject{}).(*model.Project)
	if !ok {
		http.Error(rw, "Invalid project data", http.StatusBadRequest)
		p.logger.Println("Failed to retrieve project from context")
		p.custLogger.Warn(nil, "Failed to retrieve project from context")
		return
	}

	// Log received project details
	p.logger.Printf("Received project: %+v", project)
	p.custLogger.Info(logrus.Fields{
		"project_name": project.Name,
		"project_id":   project.ID,
	}, "Received project for insertion")

	// Insert project into repository
	err := p.repo.Insert(project)
	if err != nil {
		http.Error(rw, "Database error", http.StatusInternalServerError)
		p.logger.Printf("Error inserting project into database: %v", err)
		p.custLogger.Error(logrus.Fields{
			"project_name": project.Name,
			"project_id":   project.ID,
			"error":        err.Error(),
		}, "Database error while inserting project")
		return
	}

	// Respond with success
	rw.WriteHeader(http.StatusCreated)
	p.logger.Printf("Successfully inserted project with ID: %s", project.ID)
	p.custLogger.Info(logrus.Fields{
		"project_name": project.Name,
		"project_id":   project.ID,
	}, "Successfully create project")
}

func (p *ProjectsHandler) MiddlewareContentTypeSet(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, h *http.Request) {
		p.logger.Println("Method [", h.Method, "] - Hit path :", h.URL.Path)

		rw.Header().Add("Content-Type", "application/json")

		next.ServeHTTP(rw, h)
	})
}

func (p *ProjectsHandler) MiddlewarePatientDeserialization(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, h *http.Request) {
		patient := &model.Project{}
		err := patient.FromJSON(h.Body)
		if err != nil {
			http.Error(rw, "Unable to decode json", http.StatusBadRequest)
			p.logger.Fatal(err)
			return
		}

		ctx := context.WithValue(h.Context(), KeyProject{}, patient)
		h = h.WithContext(ctx)

		next.ServeHTTP(rw, h)
	})
}
func (p *ProjectsHandler) AddUsersToProject(rw http.ResponseWriter, h *http.Request) {
	// Extract project ID from request
	vars := mux.Vars(h)
	projectId := vars["id"]

	// Decode user IDs from request body
	var userIds []string
	err := json.NewDecoder(h.Body).Decode(&userIds)
	if err != nil {
		http.Error(rw, "Unable to decode JSON", http.StatusBadRequest)
		p.logger.Println("Error decoding JSON:", err)
		p.custLogger.Warn(logrus.Fields{
			"project_id": projectId,
			"error":      err.Error(),
		}, "Failed to decode JSON body for user IDs")
		return
	}

	// Retrieve project details
	project, err := p.repo.GetById(projectId)
	if err != nil {
		http.Error(rw, "Error retrieving project", http.StatusInternalServerError)
		p.logger.Println("Error retrieving project:", err)
		p.custLogger.Error(logrus.Fields{
			"project_id": projectId,
			"error":      err.Error(),
		}, "Failed to retrieve project")
		return
	}

	// Retrieve user ID from context
	userId, ok := h.Context().Value(KeyProject{}).(string)
	if !ok {
		http.Error(rw, "User ID not found", http.StatusUnauthorized)
		p.logger.Println("User ID not found in context")
		p.custLogger.Warn(logrus.Fields{
			"project_id": projectId,
		}, "User ID not found in context")
		return
	}

	// Check if the user is the project manager
	if project.Manager != userId {
		http.Error(rw, "Only the project manager can add users", http.StatusForbidden)
		p.logger.Printf("User %s is not the manager of project %s", userId, projectId)
		p.custLogger.Warn(logrus.Fields{
			"user_id":    userId,
			"project_id": projectId,
		}, "Unauthorized attempt to add users to project")
		return
	}

	// Check if the project has active tasks
	if !hasActiveTasksPlaceholder() {
		http.Error(rw, "Cannot add users to a project without active tasks", http.StatusForbidden)
		p.logger.Println("Project has no active tasks")
		p.custLogger.Warn(logrus.Fields{
			"project_id": projectId,
		}, "Attempt to add users to a project without active tasks")
		return
	}

	// Validate min and max members
	maxMembers, err := strconv.Atoi(project.MaxMembers)
	if err != nil {
		http.Error(rw, "Invalid maximum members value", http.StatusInternalServerError)
		p.logger.Println("Invalid max members value:", err)
		p.custLogger.Error(logrus.Fields{
			"project_id": projectId,
			"error":      err.Error(),
		}, "Invalid max members value")
		return
	}

	minMembers, err := strconv.Atoi(project.MinMembers)
	if err != nil {
		http.Error(rw, "Invalid minimum members value", http.StatusInternalServerError)
		p.logger.Println("Invalid min members value:", err)
		p.custLogger.Error(logrus.Fields{
			"project_id": projectId,
			"error":      err.Error(),
		}, "Invalid min members value")
		return
	}

	currentMembersCount := len(userIds)
	if currentMembersCount > maxMembers {
		http.Error(rw, "Cannot add more users than the maximum limit", http.StatusForbidden)
		p.logger.Printf("Too many users for project %s: current=%d, max=%d", projectId, currentMembersCount, maxMembers)
		p.custLogger.Warn(logrus.Fields{
			"project_id":      projectId,
			"current_members": currentMembersCount,
			"max_members":     maxMembers,
		}, "Exceeded maximum members for project")
		return
	}

	if currentMembersCount < minMembers {
		http.Error(rw, "Cannot add users to a project without meeting the minimum member requirement", http.StatusForbidden)
		p.logger.Printf("Too few users for project %s: current=%d, min=%d", projectId, currentMembersCount, minMembers)
		p.custLogger.Warn(logrus.Fields{
			"project_id":      projectId,
			"current_members": currentMembersCount,
			"min_members":     minMembers,
		}, "Below minimum members for project")
		return
	}

	// Add users to project
	err = p.repo.AddUsersToProject(projectId, userIds)
	if err != nil {
		http.Error(rw, "Error adding users to project", http.StatusInternalServerError)
		p.logger.Println("Error adding users to project:", err)
		p.custLogger.Error(logrus.Fields{
			"project_id": projectId,
			"error":      err.Error(),
		}, "Failed to add users to project")
		return
	}

	// Publish messages to NATS
	nc, err := Conn()
	if err != nil {
		http.Error(rw, "Failed to connect to message broker", http.StatusInternalServerError)
		p.logger.Println("Error connecting to NATS:", err)
		p.custLogger.Error(logrus.Fields{
			"error": err.Error(),
		}, "Failed to connect to NATS")
		return
	}
	defer nc.Close()

	for _, uid := range userIds {
		subject := "project.joined"
		message := struct {
			UserID      string `json:"userId"`
			ProjectName string `json:"projectName"`
		}{
			UserID:      uid,
			ProjectName: project.Name,
		}

		jsonMessage, err := json.Marshal(message)
		if err != nil {
			p.logger.Println("Error marshalling message:", err)
			p.custLogger.Error(logrus.Fields{
				"user_id": uid,
				"project": project.Name,
				"error":   err.Error(),
			}, "Error marshalling message for NATS")
			continue
		}

		err = nc.Publish(subject, jsonMessage)
		if err != nil {
			p.logger.Println("Error publishing message to NATS:", err)
			p.custLogger.Error(logrus.Fields{
				"user_id": uid,
				"project": project.Name,
				"error":   err.Error(),
			}, "Error publishing message to NATS")
		}
	}
	p.logger.Println("Messages sent to NATS for project:", projectId)
	p.custLogger.Info(logrus.Fields{
		"project_id": projectId,
		"user_ids":   userIds,
	}, "Messages sent to NATS for added users")

	// Respond with success
	rw.WriteHeader(http.StatusNoContent)
}

func Conn() (*nats.Conn, error) {
	conn, err := nats.Connect("nats://nats:4222")
	if err != nil {
		log.Fatal(err)
		return nil, err
	}
	return conn, nil
}
func (p *ProjectsHandler) RemoveUserFromProject(rw http.ResponseWriter, h *http.Request) {
	// Extract project ID and user ID from request
	vars := mux.Vars(h)
	projectId := vars["id"]
	userId := vars["userId"]

	// Retrieve project details
	project, err := p.repo.GetById(projectId)
	if err != nil {
		http.Error(rw, "Error retrieving project", http.StatusInternalServerError)
		p.logger.Printf("Error retrieving project with ID %s: %v", projectId, err)
		p.custLogger.Error(logrus.Fields{
			"project_id": projectId,
			"error":      err.Error(),
		}, "Failed to retrieve project")
		return
	}

	if project == nil {
		http.Error(rw, "Project not found", http.StatusNotFound)
		p.logger.Printf("Project with ID %s not found", projectId)
		p.custLogger.Warn(logrus.Fields{
			"project_id": projectId,
		}, "Project not found")
		return
	}

	// Retrieve auth token from cookie
	cookie, err := h.Cookie("auth_token")
	if err != nil {
		http.Error(rw, "Authentication token missing", http.StatusUnauthorized)
		p.logger.Println("Auth token missing in cookie:", err)
		p.custLogger.Warn(logrus.Fields{
			"project_id": projectId,
			"user_id":    userId,
			"error":      err.Error(),
		}, "Auth token missing")
		return
	}

	// Check if user is linked to active tasks
	if p.checkTasks(*project, userId, cookie) {
		http.Error(rw, "User is linked to active tasks, removal blocked", http.StatusConflict)
		p.logger.Printf("User %s in project %s is linked to active tasks, removal blocked", userId, projectId)
		p.custLogger.Warn(logrus.Fields{
			"project_id": projectId,
			"user_id":    userId,
		}, "User is linked to active tasks, removal blocked")
		return
	}

	// Remove user from project
	err = p.repo.RemoveUserFromProject(projectId, userId)
	if err != nil {
		http.Error(rw, "Error removing user from project", http.StatusInternalServerError)
		p.logger.Printf("Error removing user %s from project %s: %v", userId, projectId, err)
		p.custLogger.Error(logrus.Fields{
			"project_id": projectId,
			"user_id":    userId,
			"error":      err.Error(),
		}, "Failed to remove user from project")
		return
	}

	// Publish removal event to NATS
	nc, err := Conn()
	if err != nil {
		http.Error(rw, "Failed to connect to message broker", http.StatusInternalServerError)
		p.logger.Println("Error connecting to NATS:", err)
		p.custLogger.Error(logrus.Fields{
			"error": err.Error(),
		}, "Failed to connect to NATS")
		return
	}
	defer nc.Close()

	subject := "project.removed"
	message := struct {
		UserID      string `json:"userId"`
		ProjectName string `json:"projectName"`
	}{
		UserID:      userId,
		ProjectName: project.Name,
	}

	jsonMessage, err := json.Marshal(message)
	if err != nil {
		p.logger.Println("Error marshalling message:", err)
		p.custLogger.Error(logrus.Fields{
			"user_id": userId,
			"project": project.Name,
			"error":   err.Error(),
		}, "Error marshalling message for NATS")
		return
	}

	err = nc.Publish(subject, jsonMessage)
	if err != nil {
		p.logger.Println("Error publishing message to NATS:", err)
		p.custLogger.Error(logrus.Fields{
			"user_id": userId,
			"project": project.Name,
			"error":   err.Error(),
		}, "Error publishing message to NATS")
		return
	}

	p.logger.Printf("Removal message sent for user %s in project %s", userId, projectId)
	p.custLogger.Info(logrus.Fields{
		"project_id": projectId,
		"user_id":    userId,
	}, "Removal message sent to NATS")

	rw.WriteHeader(http.StatusOK)
}

func (p *ProjectsHandler) DeleteProject(rw http.ResponseWriter, h *http.Request) {
	// Extract project ID from request
	vars := mux.Vars(h)
	projectId := vars["id"]

	// Retrieve project details
	project, err := p.repo.GetById(projectId)
	if err != nil {
		http.Error(rw, "Error retrieving project", http.StatusInternalServerError)
		p.logger.Printf("Error retrieving project with ID %s: %v", projectId, err)
		p.custLogger.Error(logrus.Fields{
			"project_id": projectId,
			"error":      err.Error(),
		}, "Failed to retrieve project")
		return
	}

	if project == nil {
		http.Error(rw, "Project not found", http.StatusNotFound)
		p.logger.Printf("Project with ID %s not found", projectId)
		p.custLogger.Warn(logrus.Fields{
			"project_id": projectId,
		}, "Project not found")
		return
	}

	// Log that project deletion has started
	p.logger.Printf("Deleting project with ID: %s", projectId)
	p.custLogger.Info(logrus.Fields{
		"project_id": projectId,
	}, "Deleting project")

	// TODO: Archive project before deletion to enable rollback
	// TODO: Implement SAGA pattern for rollback functionality

	// Delete project from repository
	err = p.repo.DeleteProject(projectId)
	if err != nil {
		http.Error(rw, "Error deleting project", http.StatusInternalServerError)
		p.logger.Printf("Error deleting project with ID %s: %v", projectId, err)
		p.custLogger.Error(logrus.Fields{
			"project_id": projectId,
			"error":      err.Error(),
		}, "Failed to delete project")
		return
	}

	// Publish "ProjectDeleted" event to NATS
	err = p.natsConn.Publish("ProjectDeleted", []byte(projectId))
	if err != nil {
		http.Error(rw, "Failed to publish event", http.StatusInternalServerError)
		p.logger.Printf("Failed to publish ProjectDeleted event for project ID %s: %v", projectId, err)
		p.custLogger.Error(logrus.Fields{
			"project_id": projectId,
			"error":      err.Error(),
		}, "Failed to publish ProjectDeleted event")
		return
	}

	// Log success
	p.logger.Printf("Project with ID %s successfully deleted", projectId)
	p.custLogger.Info(logrus.Fields{
		"project_id": projectId,
	}, "Project successfully deleted and event published")

	// Respond with success
	rw.WriteHeader(http.StatusOK)
}

func (ph *ProjectsHandler) checkTasks(project model.Project, userID string, authTokenCookie *http.Cookie) bool {
	client := &http.Client{}
	taskServiceURL := fmt.Sprintf("http://task-server:8080/tasks/%s", project.ID.Hex())
	taskReq, err := http.NewRequest("GET", taskServiceURL, nil)
	if err != nil {
		ph.logger.Println("Failed to create request to task-service:", err)
		return false
	}
	taskReq.Header.Set("Content-Type", "application/json")
	taskReq.AddCookie(authTokenCookie)

	taskResp, err := client.Do(taskReq)
	if err != nil {
		ph.logger.Println("Failed to reach task-service:", err)
		return false
	}
	defer taskResp.Body.Close()

	if taskResp.StatusCode != http.StatusOK {
		ph.logger.Printf("Unexpected response from task-service for project %s: %s", project.ID, taskResp.Status)
		return false
	}

	var tasks []Task
	if err := json.NewDecoder(taskResp.Body).Decode(&tasks); err != nil {
		ph.logger.Println("Failed to decode task-service response:", err)
		return false
	}
	for _, task := range tasks {
		if task.Status == "Pending" || task.Status == "InProgress" {
			for _, id := range task.UserIDs {
				if id == userID {
					return true
				}
			}
		}
	}

	return false
}

func hasActiveTasksPlaceholder() bool {
	return true
}

func (uh *ProjectsHandler) MiddlewareCheckRoles(allowedRoles []string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, h *http.Request) {
		role, ok := h.Context().Value(KeyRole{}).(string)
		if !ok {
			http.Error(rw, "Forbidden", http.StatusForbidden)
			uh.logger.Println("Role not found in context")
			return
		}

		allowed := false
		for _, r := range allowedRoles {
			if role == r {
				allowed = true
				break
			}
		}

		if !allowed {
			http.Error(rw, "Forbidden", http.StatusForbidden)
			uh.logger.Println("Role validation failed: missing permissions")
			return
		}

		next.ServeHTTP(rw, h)
	})
}

func (p *ProjectsHandler) IsUserInProject(rw http.ResponseWriter, h *http.Request) {
	vars := mux.Vars(h)
	projectID := vars["id"]
	userID := vars["userId"]

	isMember := p.isUserInProject(projectID, userID)

	if isMember {
		rw.WriteHeader(http.StatusOK)
		json.NewEncoder(rw).Encode(map[string]bool{"is_member": true})
	} else {
		rw.WriteHeader(http.StatusNotFound)
		json.NewEncoder(rw).Encode(map[string]bool{"is_member": false})
	}
}

func (p *ProjectsHandler) isUserInProject(projectID, userID string) bool {
	project, err := p.repo.GetById(projectID)
	if err != nil {
		p.logger.Println("Error fetching project:", err)
		return false
	}

	return contains(project.UserIDs, userID)
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func (p *ProjectsHandler) CheckIfUserIsManager(rw http.ResponseWriter, h *http.Request) {
	role, ok := h.Context().Value(KeyRole{}).(string)
	if !ok {
		http.Error(rw, "Role not found in context", http.StatusUnauthorized)
		return
	}

	userId, ok := h.Context().Value(KeyProject{}).(string)
	if !ok {
		http.Error(rw, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(h)
	projectId := vars["id"]

	if role != "manager" {
		rw.WriteHeader(http.StatusOK)
		_, _ = rw.Write([]byte("false"))
		return
	}

	isManager, err := p.repo.IsUserManagerOfProject(userId, projectId)
	if err != nil {
		http.Error(rw, "Error checking manager status", http.StatusInternalServerError)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	rw.WriteHeader(http.StatusOK)
	if isManager {
		_, _ = rw.Write([]byte("true"))
	} else {
		_, _ = rw.Write([]byte("false"))
	}
}

func (p *ProjectsHandler) GetProjectDetailsById(rw http.ResponseWriter, h *http.Request) {
	// Step 1: Extract the auth_token cookie from the incoming request
	cookie, err := h.Cookie("auth_token")
	if err != nil {
		http.Error(rw, "No token found in cookie", http.StatusUnauthorized)
		p.logger.Println("No token in cookie:", err)
		return
	}

	// Step 2: Get the project ID from the URL
	vars := mux.Vars(h)
	id := vars["id"]

	// Step 3: Fetch the project from the database
	project, err := p.repo.GetById(id)
	if err != nil {
		p.logger.Print("Database exception: ", err)
		http.Error(rw, "Error fetching project details", http.StatusInternalServerError)
		return
	}

	// If project is not found, return an error
	if project == nil {
		http.Error(rw, "Project with given id not found", http.StatusNotFound)
		p.logger.Printf("Project with id: '%s' not found", id)
		return
	}

	// Step 4: Fetch the user details associated with the project
	usersDetails, err := p.userClient.GetByIdsWithCookies(project.UserIDs, cookie)
	if err != nil {
		http.Error(rw, "Error fetching user details", http.StatusInternalServerError)
		return
	}

	// Step 5: Fetch the tasks associated with the project
	tasksDetails, err := p.taskClient.GetTasksByProjectId(id, cookie)
	if err != nil {
		http.Error(rw, "Error fetching task details", http.StatusInternalServerError)
		return
	}

	// Step 6: Construct the response with project details, user details, and tasks
	projectDetails := client.ProjectDetails{
		ID:         project.ID,
		Name:       project.Name,
		EndDate:    project.EndDate,
		MinMembers: project.MinMembers,
		MaxMembers: project.MaxMembers,
		Users:      usersDetails,
		Tasks:      tasksDetails, // Add the task details to the response
		UserIDs:    project.UserIDs,
		Manager:    project.Manager,
	}

	// Step 7: Send the project details with users and tasks as a response
	err = projectDetails.ToJSON(rw)
	if err != nil {
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		p.logger.Fatal("Unable to convert to json:", err)
		return
	}
}
