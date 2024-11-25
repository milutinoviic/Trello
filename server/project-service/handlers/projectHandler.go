package handlers

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/gorilla/mux"
	"github.com/nats-io/nats.go"
	"github.com/sirupsen/logrus"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	"io/ioutil"
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
	userServiceURL := "https://user-server:8080/validate-token"
	reqBody := fmt.Sprintf(`{"token": "%s"}`, token)
	req, err := http.NewRequest("POST", userServiceURL, strings.NewReader(reqBody))
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Content-Type", "application/json")

	client, err := createTLSClient()
	if err != nil {
		log.Printf("Error creating TLS client: %v\n", err)
		return "", "", fmt.Errorf("failed to connect to certificate: %s", err)
	}
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

func createTLSClient() (*http.Client, error) {
	caCert, err := ioutil.ReadFile("/app/cert.crt")
	if err != nil {
		return nil, err
	}

	caCertPool := x509.NewCertPool()
	caCertPool.AppendCertsFromPEM(caCert)

	tlsConfig := &tls.Config{
		RootCAs: caCertPool,
	}

	transport := &http.Transport{
		TLSClientConfig: tlsConfig,
	}

	client := &http.Client{
		Transport: transport,
	}

	return client, nil
}

func NewProjectsHandler(l *log.Logger, custLogger *customLogger.Logger, r *repositories.ProjectRepo, tracer trace.Tracer, userClient client.UserClient, taskClient client.TaskClient) *ProjectsHandler {
	return &ProjectsHandler{logger: l, custLogger: custLogger, repo: r, tracer: tracer, userClient: userClient, taskClient: taskClient}
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
		p.logger.Println("Role not defined in context")
		p.custLogger.Warn(nil, "Role not defined in context")
		return
	}

	// Retrieve user ID from context
	userId, ok := h.Context().Value(KeyProject{}).(string)
	if !ok {
		span.RecordError(errors.New("No role found in context"))
		span.SetStatus(codes.Error, errors.New("No rule found").Error())
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
		span.RecordError(errors.New("There is an error"))
		span.SetStatus(codes.Error, errors.New("There is an error").Error())
		http.Error(rw, "Invalid role specified", http.StatusBadRequest)
		p.logger.Println("Invalid role specified")
		p.custLogger.Warn(logrus.Fields{
			"role": role,
		}, "Invalid role specified")
		return
	}

	// Handle database errors
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		p.logger.Print("Database exception: ", err)
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
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		p.custLogger.Error(logrus.Fields{
			"user_id": userId,
			"role":    role,
			"error":   err.Error(),
		}, "Unable to convert projects to JSON")
		http.Error(rw, "Unable to convert to JSON", http.StatusInternalServerError)
		p.logger.Fatal("Unable to convert projects to JSON:", err)
		return
	}
	span.SetStatus(codes.Ok, "Successfully got projects")

	// Log success
	p.logger.Println("Successfully fetched projects for user:", userId)
	p.custLogger.Info(logrus.Fields{
		"user_id": userId,
		"role":    role,
	}, "Successfully fetched projects for user")
}

func (p *ProjectsHandler) GetProjectById(rw http.ResponseWriter, h *http.Request) {
	_, span := p.tracer.Start(context.Background(), "ProjectsHandler.GetProjectById")
	defer span.End()
	vars := mux.Vars(h)
	id := vars["id"]

	p.logger.Println("Fetching project with ID:", id)
	p.custLogger.Info(logrus.Fields{
		"project_id": id,
	}, "Fetching project by ID")

	// Fetch project from repository
	project, err := p.repo.GetById(id)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		p.logger.Print("Database exception: ", err)
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
		span.RecordError(errors.New("project is null"))
		span.SetStatus(codes.Error, "project is null")
		http.Error(rw, "Patient with given id not found", http.StatusNotFound)
		p.logger.Printf("Patient with id: '%s' not found", id)
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
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		p.custLogger.Error(logrus.Fields{
			"project_id": id,
			"error":      err.Error(),
		}, "Unable to convert project to JSON")

		// Send HTTP response
		http.Error(rw, "Unable to convert project to JSON", http.StatusInternalServerError)
		return // Ensure no further execution
	}

	span.SetStatus(codes.Ok, "Successfully got project")

	// Log successful response
	p.logger.Printf("Successfully retrieved project with ID: '%s'", id)
	p.custLogger.Info(logrus.Fields{
		"project_id": id,
	}, "Successfully retrieved project")
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
	err = p.repo.Insert(project)
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
	span.SetStatus(codes.Ok, "Successfully created project")
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
	_, span := p.tracer.Start(context.Background(), "ProjectsHandler.AddUsersToProject")
	defer span.End()
	vars := mux.Vars(h)
	projectId := vars["id"]

	// Decode user IDs from request body
	var userIds []string
	err := json.NewDecoder(h.Body).Decode(&userIds)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Unable to decode json", http.StatusBadRequest)
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
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, err.Error(), http.StatusInternalServerError)
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
		span.RecordError(errors.New("Unable to get user id"))
		span.SetStatus(codes.Error, "Unable to get user id")
		http.Error(rw, "User ID not found", http.StatusUnauthorized)
		p.logger.Println("User ID not found in context")
		p.custLogger.Warn(logrus.Fields{
			"project_id": projectId,
		}, "User ID not found in context")
		return
	}

	// Check if the user is the project manager
	if project.Manager != userId {
		span.RecordError(errors.New("Project Manager does not match"))
		span.SetStatus(codes.Error, "Project Manager does not match")
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
		span.RecordError(errors.New("Does not have active tasks placeholder"))
		span.SetStatus(codes.Error, "Does not have active tasks placeholder")
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
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
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
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
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
		span.RecordError(errors.New("Cannot add more users than the maximum limit"))
		span.SetStatus(codes.Error, "Cannot add more users than the maximum limit")
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
		span.RecordError(errors.New("Cannot add users to a project without meeting the minimum member requirement"))
		span.SetStatus(codes.Error, "Cannot add users to a project without meeting the minimum member requirement")
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
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, err.Error(), http.StatusInternalServerError)
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
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Println("Error connecting to NATS:", err)
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

		if err := p.sendNotification(subject, message); err != nil {
			http.Error(rw, err.Error(), http.StatusInternalServerError)
			return
		}

		jsonMessage, err := json.Marshal(message)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Println("Error marshalling message:", err)
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
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Println("Error publishing message to NATS:", err)
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
	// Retrieve project details
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
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
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
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "User id added to active tasks, deletion blocked", http.StatusConflict)
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
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, err.Error(), http.StatusInternalServerError)
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
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Println("Error connecting to NATS:", err)
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

	if err := p.sendNotification(subject, message); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonMessage, err := json.Marshal(message)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Println("Error marshalling message:", err)
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
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Println("Error publishing message to NATS:", err)
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
	span.SetStatus(codes.Ok, "Successfully removed user from project")
}

func (p *ProjectsHandler) DeleteProject(rw http.ResponseWriter, h *http.Request) {
	_, span := p.tracer.Start(context.Background(), "ProjectsHandler.DeleteProject")
	defer span.End()
	// Extract project ID from request
	vars := mux.Vars(h)
	projectId := vars["id"]

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
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
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

	err = p.repo.PendingDeletion(projectId, true)
	//err = p.repo.DeleteProject(projectId)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		http.Error(rw, "Error deleting project", http.StatusInternalServerError)
		p.logger.Printf("Error deleting project with ID %s: %v", projectId, err)
		p.custLogger.Error(logrus.Fields{
			"project_id": projectId,
			"error":      err.Error(),
		}, "Failed to delete project")
		return
	}

	nc, err := Conn()
	if err != nil {
		log.Println("Error connecting to NATS:", err)
		http.Error(rw, "Failed to connect to message broker", http.StatusInternalServerError)
		return
	}
	// publish a "ProjectDeleted" event to NATS, => this will be executed in taskHnadler/HandleProjectDeleted
	err = nc.Publish("ProjectDeleted", []byte(projectId))
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		p.logger.Printf("Failed to publish ProjectDeleted event: %v", err)
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
	span.SetStatus(codes.Ok, "Successfully deleted project")
}

func (p *ProjectsHandler) SubscribeToEvent() {
	nc, err := Conn()
	if err != nil {
		log.Println("Error connecting to NATS:", err)
		p.logger.Printf("Error connecting to NATS: ", err)

		return
	}
	// Subscribe on channel to react on task deletion
	_, err = nc.QueueSubscribe("TasksDeleted", "tasks-deleted-queue", func(msg *nats.Msg) {
		projectID := string(msg.Data)
		p.HandleTasksDeleted(projectID)
	})

	if err != nil {
		p.logger.Printf("Failed to subscribe to TasksDeleted event: %v", err)
	}
	_, err = nc.QueueSubscribe("TaskDeletionFailed", "task-failed-queue", func(msg *nats.Msg) {
		projectID := string(msg.Data)
		p.HandleTasksDeletedRollback(projectID)
	})
}

func (p *ProjectsHandler) HandleTasksDeleted(projectID string) {
	project, _ := p.repo.GetById(projectID)
	subject := "project.removed"
	for _, userID := range project.UserIDs {
		message := struct {
			UserID      string `json:"userId"`
			ProjectName string `json:"projectName"`
		}{
			UserID:      userID,
			ProjectName: project.Name,
		}

		if err := p.sendNotification(subject, message); err != nil {
			p.logger.Println(err.Error())
			return
		}
	}

	p.logger.Println("a message has been sent")

	err := p.repo.DeleteProject(projectID)
	if err != nil {
		p.logger.Printf("Failed to delete project %s: %v", projectID, err)
		return
	}

	p.logger.Printf("Successfully deleted project %s", projectID)
}
func (p *ProjectsHandler) HandleTasksDeletedRollback(projectID string) {
	err := p.repo.PendingDeletion(projectID, false)
	if err != nil {
		p.logger.Printf("Failed to delete project %s: %v", projectID, err)
		return
	}

	p.logger.Printf("Successfully retrive deleted project %s", projectID)
}

func (ph *ProjectsHandler) checkTasks(project model.Project, userID string, authTokenCookie *http.Cookie) bool {
	_, span := ph.tracer.Start(context.Background(), "ProjectsHandler.checkTasks")
	defer span.End()
	client, err := createTLSClient()
	if err != nil {
		log.Printf("Error creating TLS client: %v\n", err)
		return false
	}
	taskServiceURL := fmt.Sprintf("https://task-server:8080/tasks/%s", project.ID.Hex())
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

func (p *ProjectsHandler) sendNotification(subject string, message interface{}) error {
	nc, err := Conn()
	if err != nil {
		log.Println("Error connecting to NATS:", err)
		return fmt.Errorf("failed to connect to message broker: %w", err)
	}
	defer nc.Close()

	jsonMessage, err := json.Marshal(message)
	if err != nil {
		log.Println("Error marshalling message:", err)
		return fmt.Errorf("error marshalling message: %w", err)
	}

	err = nc.Publish(subject, jsonMessage)
	if err != nil {
		log.Println("Error publishing message to NATS:", err)
		return fmt.Errorf("error publishing message to NATS: %w", err)
	}

	p.logger.Println("Notification sent:", subject)
	return nil
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
