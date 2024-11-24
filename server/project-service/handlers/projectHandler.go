package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/gorilla/mux"
	"github.com/nats-io/nats.go"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	"log"
	"net/http"
	"project-service/client"
	"project-service/model"
	"project-service/repositories"
	"strconv"
	"strings"
)

type KeyProject struct{}
type KeyRole struct{}

type ProjectsHandler struct {
	logger     *log.Logger
	repo       *repositories.ProjectRepo
	natsConn   *nats.Conn
	tracer     trace.Tracer
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

func NewProjectsHandler(l *log.Logger, r *repositories.ProjectRepo, natsConn *nats.Conn, tracer trace.Tracer, userClient client.UserClient, taskClient client.TaskClient) *ProjectsHandler {
	return &ProjectsHandler{logger: l, repo: r, natsConn: natsConn, tracer: tracer, userClient: userClient, taskClient: taskClient}
}

func (p *ProjectsHandler) GetAllProjects(rw http.ResponseWriter, h *http.Request) {
	_, span := p.tracer.Start(context.Background(), "ProjectsHandler.GetAllProjects")
	defer span.End()
	projects, err := p.repo.GetAll()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		p.logger.Print("Database exception: ", err)
	}

	if projects == nil {
		return
	}

	err = projects.ToJSON(rw)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		p.logger.Fatal("Unable to convert to json :", err)
		return
	}
	span.SetStatus(codes.Ok, "Successfully got projects")
}

func (p *ProjectsHandler) GetAllProjectsByUser(rw http.ResponseWriter, h *http.Request) {
	_, span := p.tracer.Start(context.Background(), "ProjectsHandler.GetAllProjectsByUser")
	defer span.End()
	role, e := h.Context().Value(KeyRole{}).(string)
	if !e {
		span.RecordError(errors.New("No role found in context"))
		span.SetStatus(codes.Error, errors.New("No rule found").Error())
		http.Error(rw, "Role not defined", http.StatusBadRequest)
		return
	}
	userId, ok := h.Context().Value(KeyProject{}).(string)
	if !ok {
		span.RecordError(errors.New("No role found in context"))
		span.SetStatus(codes.Error, errors.New("No rule found").Error())
		http.Error(rw, "User ID not found", http.StatusUnauthorized)
		p.logger.Println("User ID not found in context")
		return
	}
	var projects model.Projects
	var err error
	p.logger.Println("USER ID JE " + userId)
	if role == "manager" {
		projects, err = p.repo.GetAllByManager(userId)
	} else if role == "member" {
		projects, err = p.repo.GetAllByMember(userId)
	} else {
		span.RecordError(errors.New("There is an error"))
		span.SetStatus(codes.Error, errors.New("There is an error").Error())
		http.Error(rw, "Invalid role specified", http.StatusBadRequest)
		return
	}

	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		p.logger.Print("Database exception: ", err)
		http.Error(rw, "Database error", http.StatusInternalServerError)
		return
	}
	if projects == nil {

		http.Error(rw, "No projects found", http.StatusNotFound)
		return
	}

	err = projects.ToJSON(rw)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		p.logger.Fatal("Unable to convert to json :", err)
		return
	}
	span.SetStatus(codes.Ok, "Successfully got projects")
}

func (p *ProjectsHandler) GetProjectById(rw http.ResponseWriter, h *http.Request) {
	_, span := p.tracer.Start(context.Background(), "ProjectsHandler.GetProjectById")
	defer span.End()
	vars := mux.Vars(h)
	id := vars["id"]

	project, err := p.repo.GetById(id)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		p.logger.Print("Database exception: ", err)
	}

	if project == nil {
		span.RecordError(errors.New("project is null"))
		span.SetStatus(codes.Error, "project is null")
		http.Error(rw, "Patient with given id not found", http.StatusNotFound)
		p.logger.Printf("Patient with id: '%s' not found", id)
		return
	}

	err = project.ToJSON(rw)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		p.logger.Fatal("Unable to convert to json :", err)
		return
	}
	span.SetStatus(codes.Ok, "Successfully got project")
}

func (p *ProjectsHandler) PostProject(rw http.ResponseWriter, h *http.Request) {
	_, span := p.tracer.Start(context.Background(), "ProjectsHandler.PostProject")
	defer span.End()
	patient := h.Context().Value(KeyProject{}).(*model.Project)
	err := p.repo.Insert(patient)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return
	}
	rw.WriteHeader(http.StatusCreated)
	span.SetStatus(codes.Ok, "Successfully created project")
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
	_, span := p.tracer.Start(context.Background(), "ProjectsHandler.AddUsersToProject")
	defer span.End()
	vars := mux.Vars(h)
	projectId := vars["id"]

	var userIds []string
	err := json.NewDecoder(h.Body).Decode(&userIds)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Unable to decode json", http.StatusBadRequest)
		return
	}

	project, err := p.repo.GetById(projectId)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	userId, ok := h.Context().Value(KeyProject{}).(string)
	if !ok {
		span.RecordError(errors.New("Unable to get user id"))
		span.SetStatus(codes.Error, "Unable to get user id")
		http.Error(rw, "User ID not found", http.StatusUnauthorized)
		p.logger.Println("User ID not found in context")
		return
	}

	if project.Manager != userId {
		span.RecordError(errors.New("Project Manager does not match"))
		span.SetStatus(codes.Error, "Project Manager does not match")
		http.Error(rw, "Only the project manager can add users", http.StatusForbidden)
		return
	}

	if !hasActiveTasksPlaceholder() {
		span.RecordError(errors.New("Does not have active tasks placeholder"))
		span.SetStatus(codes.Error, "Does not have active tasks placeholder")
		http.Error(rw, "Cannot add users to a project without active tasks", http.StatusForbidden)
		return
	}

	maxMembers, err := strconv.Atoi(project.MaxMembers)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Invalid maximum members value", http.StatusInternalServerError)
		return
	}

	minMembers, err := strconv.Atoi(project.MinMembers)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Invalid minimum members value", http.StatusInternalServerError)
		return
	}

	currentMembersCount := len(userIds)

	if currentMembersCount > maxMembers {
		span.RecordError(errors.New("Cannot add more users than the maximum limit"))
		span.SetStatus(codes.Error, "Cannot add more users than the maximum limit")
		http.Error(rw, "Cannot add more users than the maximum limit", http.StatusForbidden)
		return
	}

	if currentMembersCount < minMembers {
		span.RecordError(errors.New("Cannot add users to a project without meeting the minimum member requirement"))
		span.SetStatus(codes.Error, "Cannot add users to a project without meeting the minimum member requirement")
		http.Error(rw, "Cannot add users to a project without meeting the minimum member requirement", http.StatusForbidden)
		return
	}

	err = p.repo.AddUsersToProject(projectId, userIds)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	nc, err := Conn()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Println("Error connecting to NATS:", err)
		http.Error(rw, "Failed to connect to message broker", http.StatusInternalServerError)
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
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Println("Error marshalling message:", err)
			continue
		}

		err = nc.Publish(subject, jsonMessage)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Println("Error publishing message to NATS:", err)
		}
	}
	p.logger.Println("a message has been sent")

	rw.WriteHeader(http.StatusNoContent)
	span.SetStatus(codes.Ok, "Successfully added users to project")
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
	_, span := p.tracer.Start(context.Background(), "ProjectsHandler.RemoveUserFromProject")
	defer span.End()
	vars := mux.Vars(h)
	projectId := vars["id"]
	userId := vars["userId"]

	project, err := p.repo.GetById(projectId)
	if project == nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Project not found", http.StatusNotFound)
		return
	}
	cookie, err := h.Cookie("auth_token")

	if p.checkTasks(*project, userId, cookie) {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "User id added to active tasks, deletion blocked", http.StatusConflict)
		return
	}

	err = p.repo.RemoveUserFromProject(projectId, userId)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	nc, err := Conn()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Println("Error connecting to NATS:", err)
		http.Error(rw, "Failed to connect to message broker", http.StatusInternalServerError)
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
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Println("Error marshalling message:", err)
		return
	}

	err = nc.Publish(subject, jsonMessage)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Println("Error publishing message to NATS:", err)
	}

	p.logger.Println("a message has been sent")
	rw.WriteHeader(http.StatusOK)
	span.SetStatus(codes.Ok, "Successfully removed user from project")
}

func (p *ProjectsHandler) DeleteProject(rw http.ResponseWriter, h *http.Request) {
	_, span := p.tracer.Start(context.Background(), "ProjectsHandler.DeleteProject")
	defer span.End()
	vars := mux.Vars(h)
	projectId := vars["id"]

	project, err := p.repo.GetById(projectId)
	if project == nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Project not found", http.StatusNotFound)
		return
	}

	//TODO: before deleting project implement archive project functionality, in case if 'rollback' is necessary
	//TODO: finish SAGA pattern with rollback

	err = p.repo.DeleteProject(projectId)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	// publish a "ProjectDeleted" event to NATS, => this will be executed in taskHnadler/HandleProjectDeleted
	err = p.natsConn.Publish("ProjectDeleted", []byte(projectId))
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		p.logger.Printf("Failed to publish ProjectDeleted event: %v", err)
		http.Error(rw, "Failed to publish event", http.StatusInternalServerError)
		return
	}

	rw.WriteHeader(http.StatusOK)
	span.SetStatus(codes.Ok, "Successfully deleted project")
}

func (ph *ProjectsHandler) checkTasks(project model.Project, userID string, authTokenCookie *http.Cookie) bool {
	_, span := ph.tracer.Start(context.Background(), "ProjectsHandler.checkTasks")
	defer span.End()
	client := &http.Client{}
	taskServiceURL := fmt.Sprintf("http://task-server:8080/tasks/%s", project.ID.Hex())
	taskReq, err := http.NewRequest("GET", taskServiceURL, nil)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ph.logger.Println("Failed to create request to task-service:", err)
		return false
	}
	taskReq.Header.Set("Content-Type", "application/json")
	taskReq.AddCookie(authTokenCookie)

	taskResp, err := client.Do(taskReq)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ph.logger.Println("Failed to reach task-service:", err)
		return false
	}
	defer taskResp.Body.Close()

	if taskResp.StatusCode != http.StatusOK {
		span.RecordError(errors.New("Task service returned non-200 status code"))
		span.SetStatus(codes.Error, "Task service returned non-200 status code")
		ph.logger.Printf("Unexpected response from task-service for project %s: %s", project.ID, taskResp.Status)
		return false
	}

	var tasks []Task
	if err := json.NewDecoder(taskResp.Body).Decode(&tasks); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ph.logger.Println("Failed to decode task-service response:", err)
		return false
	}
	for _, task := range tasks {
		if task.Status == "Pending" || task.Status == "InProgress" {
			for _, id := range task.UserIDs {
				if id == userID {

					span.SetStatus(codes.Ok, "Successful function")
					return true
				}
			}
		}
	}
	span.SetStatus(codes.Ok, "Successful function")
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
	_, span := p.tracer.Start(context.Background(), "ProjectsHandler.IsUserInProject")
	defer span.End()
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
	span.SetStatus(codes.Ok, "Successful function")
}

func (p *ProjectsHandler) isUserInProject(projectID, userID string) bool {
	_, span := p.tracer.Start(context.Background(), "ProjectsHandler.isUserInProject")
	defer span.End()
	project, err := p.repo.GetById(projectID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		p.logger.Println("Error fetching project:", err)
		return false
	}

	span.SetStatus(codes.Ok, "Successful function")
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
	_, span := p.tracer.Start(context.Background(), "ProjectsHandler.CheckIfUserIsManager")
	defer span.End()
	role, ok := h.Context().Value(KeyRole{}).(string)
	if !ok {
		span.RecordError(errors.New("Role not found in context"))
		span.SetStatus(codes.Error, "Role not found in context")
		http.Error(rw, "Role not found in context", http.StatusUnauthorized)
		return
	}

	userId, ok := h.Context().Value(KeyProject{}).(string)
	if !ok {
		span.RecordError(errors.New("User not found in context"))
		span.SetStatus(codes.Error, "User not found in context")
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
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
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
	span.SetStatus(codes.Ok, "Successful function")
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
