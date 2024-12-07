package handlers

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/eapache/go-resiliency/retrier"
	"github.com/gorilla/mux"
	"github.com/nats-io/nats.go"
	"github.com/sirupsen/logrus"
	"github.com/sony/gobreaker"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
	"log"
	"net/http"
	"os"
	"project-service/client"
	"project-service/customLogger"
	"project-service/domain"
	"project-service/model"
	"project-service/repositories"
	"strconv"
	"strings"
	"time"
)

type KeyProject struct{}
type KeyUser struct{}
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

		userID, role, err := p.verifyTokenWithUserService(h.Context(), cookie.Value)
		if err != nil {
			http.Error(rw, "Invalid token", http.StatusUnauthorized)
			p.logger.Println("Invalid token:", err)
			return
		}

		ctx := context.WithValue(h.Context(), KeyUser{}, userID)
		ctx = context.WithValue(ctx, KeyRole{}, role)

		h = h.WithContext(ctx)

		next.ServeHTTP(rw, h)
	})
}

func ExtractTraceInfoMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := otel.GetTextMapPropagator().Extract(r.Context(), propagation.HeaderCarrier(r.Header))
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (p *ProjectsHandler) verifyTokenWithUserService(ctx context.Context, token string) (string, string, error) {
	ctx, span := p.tracer.Start(ctx, "ProjectsHandler.verifyTokenWithUserService")
	defer span.End()
	linkToUserServer := os.Getenv("LINK_TO_USER_SERVICE")
	userServiceURL := fmt.Sprintf("%s/validate-token", linkToUserServer) // Use HTTPS for secure connection
	reqBody := fmt.Sprintf(`{"token": "%s"}`, token)

	req, err := http.NewRequestWithContext(ctx, "POST", userServiceURL, strings.NewReader(reqBody))
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return "", "", err
	}
	req.Header.Set("Content-Type", "application/json")
	otel.GetTextMapPropagator().Inject(ctx, propagation.HeaderCarrier(req.Header))
	c, err := createTLSClient()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return "", "", fmt.Errorf("failed to create TLS client: %s", err)
	}

	circuitBreaker := gobreaker.NewCircuitBreaker(
		gobreaker.Settings{
			Name:        "UserServiceCircuitBreaker",
			MaxRequests: 5,
			Timeout:     5 * time.Second,
			Interval:    0,
			ReadyToTrip: func(counts gobreaker.Counts) bool {
				return counts.ConsecutiveFailures > 2
			},
			OnStateChange: func(name string, from gobreaker.State, to gobreaker.State) {
				p.logger.Printf("Circuit Breaker '%s' changed from '%s' to '%s'", name, from, to)
			},
			IsSuccessful: func(err error) bool {
				if err == nil {
					return true
				}
				if _, ok := err.(domain.ErrRespTmp); ok {
					return false
				}
				return false
			},
		},
	)

	classifier := retrier.WhitelistClassifier{domain.ErrRespTmp{}}
	retryAgain := retrier.New(retrier.ConstantBackoff(3, 1000*time.Millisecond), classifier)

	var timeout time.Duration
	deadline, reqHasDeadline := ctx.Deadline()

	var userID, role string
	retryCount := 0

	err = retryAgain.RunCtx(ctx, func(ctx context.Context) error {
		retryCount++
		p.logger.Printf("Attempting validate-token request, attempt #%d", retryCount)

		if reqHasDeadline {
			timeout = time.Until(deadline)
		}

		_, err := circuitBreaker.Execute(func() (interface{}, error) {
			if timeout > 0 {
				req.Header.Add("Timeout", strconv.Itoa(int(timeout.Milliseconds())))
			}

			resp, err := c.Do(req)
			if err != nil {
				return nil, err
			}
			defer resp.Body.Close()

			if resp.StatusCode == http.StatusServiceUnavailable || resp.StatusCode == http.StatusGatewayTimeout {
				return nil, domain.ErrRespTmp{
					URL:        resp.Request.URL.String(),
					Method:     resp.Request.Method,
					StatusCode: resp.StatusCode,
				}
			}

			if resp.StatusCode != http.StatusOK {
				return nil, fmt.Errorf("failed to validate token, status: %s", resp.Status)
			}

			var result struct {
				UserID string `json:"user_id"`
				Role   string `json:"role"`
			}

			err = json.NewDecoder(resp.Body).Decode(&result)
			if err != nil {
				span.RecordError(err)
				span.SetStatus(codes.Error, err.Error())
				return nil, err
			}

			userID = result.UserID
			role = result.Role

			return result, nil
		})

		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			return err
		}
		return nil
	})

	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		p.logger.Printf("Error during validate-token request after retries: %v", err)
		return "", "", fmt.Errorf("error validating token: %w", err)
	}
	span.SetStatus(codes.Ok, "")
	return userID, role, nil
}

func createTLSClient() (*http.Client, error) {
	caCert, err := os.ReadFile("/app/cert.crt")
	if err != nil {
		return nil, fmt.Errorf("failed to read certificate: %w", err)
	}

	caCertPool := x509.NewCertPool()
	if !caCertPool.AppendCertsFromPEM(caCert) {
		return nil, fmt.Errorf("failed to append certs to the pool")
	}

	tlsConfig := &tls.Config{
		RootCAs: caCertPool,
	}

	transport := &http.Transport{
		TLSClientConfig:     tlsConfig,
		MaxIdleConns:        10,
		MaxIdleConnsPerHost: 10,
		MaxConnsPerHost:     10,
	}

	c := &http.Client{
		Timeout:   10 * time.Second,
		Transport: transport,
	}

	return c, nil
}

func NewProjectsHandler(l *log.Logger, custLogger *customLogger.Logger, r *repositories.ProjectRepo, tracer trace.Tracer, userClient client.UserClient, taskClient client.TaskClient) *ProjectsHandler {
	return &ProjectsHandler{logger: l, custLogger: custLogger, repo: r, tracer: tracer, userClient: userClient, taskClient: taskClient}
}

func (p *ProjectsHandler) GetAllProjects(rw http.ResponseWriter, h *http.Request) {
	ctx, span := p.tracer.Start(h.Context(), "ProjectsHandler.GetAllProjects")
	defer span.End()
	projects, err := p.repo.GetAll(ctx)
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
	ctx, span := p.tracer.Start(h.Context(), "ProjectsHandler.GetAllProjectsByUser")
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
	userId, ok := h.Context().Value(KeyUser{}).(string)
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
		projects, err = p.repo.GetAllByManager(ctx, userId)
	} else if role == "member" {
		p.logger.Println("Fetching projects for member")
		p.custLogger.Info(logrus.Fields{
			"user_id": userId,
			"role":    role,
		}, "Fetching projects for member")
		projects, err = p.repo.GetAllByMember(ctx, userId)
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
	ctx, span := p.tracer.Start(h.Context(), "ProjectsHandler.GetProjectById")
	defer span.End()
	vars := mux.Vars(h)
	id := vars["id"]

	p.logger.Println("Fetching project with ID:", id)
	p.custLogger.Info(logrus.Fields{
		"project_id": id,
	}, "Fetching project by ID")

	// Fetch project from repository
	project, err := p.repo.GetById(ctx, id)
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
	ctx, span := p.tracer.Start(h.Context(), "ProjectsHandler.PostProject")
	defer span.End()
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
	err := p.repo.Insert(ctx, project)
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
	ctx, span := p.tracer.Start(h.Context(), "ProjectsHandler.AddUsersToProject")
	defer span.End()
	vars := mux.Vars(h)
	projectId := vars["id"]

	// Decode user IDs from request body
	var userIds []string
	err := json.NewDecoder(h.Body).Decode(&userIds)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Unable to decode JSON", http.StatusBadRequest)
		p.logger.Println("Error decoding JSON:", err)
		p.custLogger.Warn(logrus.Fields{
			"project_id": projectId,
			"error":      err.Error(),
		}, "Failed to decode JSON body for user IDs")
		return
	}

	// Retrieve project details
	project, err := p.repo.GetById(ctx, projectId)
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
	userId, ok := h.Context().Value(KeyUser{}).(string)
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
	err = p.repo.AddUsersToProject(ctx, projectId, userIds)
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

	for _, uid := range userIds {
		subject := "project.joined"
		message := struct {
			UserID      string `json:"userId"`
			ProjectName string `json:"projectName"`
		}{
			UserID:      uid,
			ProjectName: project.Name,
		}

		if err := p.sendNotification(ctx, subject, message); err != nil {
			http.Error(rw, err.Error(), http.StatusInternalServerError)
			return
		}

		currentTime := time.Now().Add(1 * time.Hour)
		formattedTime := currentTime.Format(time.RFC3339)

		event := map[string]interface{}{
			"type": "MemberAdded",
			"time": formattedTime,
			"event": map[string]interface{}{
				"memberId":  uid,
				"projectId": projectId,
			},
			"projectId": projectId,
		}

		if err := p.sendEventToAnalyticsService(ctx, event); err != nil {
			http.Error(rw, "Error sending event to analytics service", http.StatusInternalServerError)
			return
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
	connection := os.Getenv("NATS_URL")
	conn, err := nats.Connect(connection)
	if err != nil {
		log.Fatal(err)
		return nil, err
	}
	return conn, nil
}
func (p *ProjectsHandler) RemoveUserFromProject(rw http.ResponseWriter, h *http.Request) {
	ctx, span := p.tracer.Start(h.Context(), "ProjectsHandler.RemoveUserFromProject")
	defer span.End()
	vars := mux.Vars(h)
	projectId := vars["id"]
	userId := vars["userId"]

	project, err := p.repo.GetById(ctx, projectId)
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
	if p.checkTasks(h.Context(), *project, userId, cookie) {
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
	err = p.repo.RemoveUserFromProject(ctx, projectId, userId)
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

	subject := "project.removed"
	message := struct {
		UserID      string `json:"userId"`
		ProjectName string `json:"projectName"`
	}{
		UserID:      userId,
		ProjectName: project.Name,
	}

	if err := p.sendNotification(ctx, subject, message); err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	currentTime := time.Now().Add(1 * time.Hour)
	formattedTime := currentTime.Format(time.RFC3339)

	event := map[string]interface{}{
		"type": "MemberRemoved",
		"time": formattedTime,
		"event": map[string]interface{}{
			"memberId":  userId,
			"projectId": projectId,
		},
		"projectId": projectId,
	}

	// Send the event to the analytic service
	if err := p.sendEventToAnalyticsService(ctx, event); err != nil {
		http.Error(rw, "Failed to send event to analytics service", http.StatusInternalServerError)
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

func (p *ProjectsHandler) sendEventToAnalyticsService(ctx context.Context, event interface{}) error {
	ctx, span := p.tracer.Start(ctx, "ProjectsHandler.sendEventToAnalyticsService")
	defer span.End()
	linkToUserServer := os.Getenv("LINK_TO_ANALYTIC_SERVICE")
	analyticsServiceURL := fmt.Sprintf("%s/event/append", linkToUserServer)

	eventData, err := json.Marshal(event)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Printf("Error marshalling event: %v", err)
		return err
	}

	req, err := http.NewRequest("POST", analyticsServiceURL, bytes.NewBuffer(eventData))
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Printf("Error creating request: %v", err)
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	otel.GetTextMapPropagator().Inject(context.Background(), propagation.HeaderCarrier(req.Header))
	client, err := createTLSClient()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Printf("Error creating TLS client: %v", err)
		return fmt.Errorf("failed to create TLS client: %v", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Printf("Error sending request to analytics service: %v", err)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		span.RecordError(errors.New(resp.Status))
		span.SetStatus(codes.Error, resp.Status)
		log.Printf("Failed to send event to analytics service: %s", resp.Status)
		return fmt.Errorf("failed to send event to analytics service: %s", resp.Status)
	}
	span.SetStatus(codes.Ok, "Successfully sent event to analytics service")
	return nil
}

func (p *ProjectsHandler) DeleteProject(rw http.ResponseWriter, h *http.Request) {
	ctx, span := p.tracer.Start(h.Context(), "ProjectsHandler.DeleteProject")
	defer span.End()
	// Extract project ID from request
	vars := mux.Vars(h)
	projectId := vars["id"]

	project, err := p.repo.GetById(ctx, projectId)
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

	err = p.repo.PendingDeletion(ctx, projectId, true)
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

func (p *ProjectsHandler) SubscribeToEvent(ctx context.Context) {
	ctx, span := p.tracer.Start(ctx, "ProjectsHandler.SubscribeToEvent")
	defer span.End()
	nc, err := Conn()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Println("Error connecting to NATS:", err)
		p.logger.Printf("Error connecting to NATS: ", err)

		return
	}
	// Subscribe on channel to react on task deletion
	_, err = nc.QueueSubscribe("TasksDeleted", "tasks-deleted-queue", func(msg *nats.Msg) {
		projectID := string(msg.Data)
		p.HandleTasksDeleted(ctx, projectID)
	})

	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		p.logger.Printf("Failed to subscribe to TasksDeleted event: %v", err)
	}
	_, err = nc.QueueSubscribe("TaskDeletionFailed", "task-failed-queue", func(msg *nats.Msg) {
		projectID := string(msg.Data)
		p.HandleTasksDeletedRollback(ctx, projectID)
	})
	span.SetStatus(codes.Ok, "")
}

func (p *ProjectsHandler) HandleTasksDeleted(ctx context.Context, projectID string) {
	ctx, span := p.tracer.Start(ctx, "ProjectsHandler.HandleTasksDeleted")
	defer span.End()
	project, _ := p.repo.GetById(ctx, projectID)
	subject := "project.removed"
	for _, userID := range project.UserIDs {
		message := struct {
			UserID      string `json:"userId"`
			ProjectName string `json:"projectName"`
		}{
			UserID:      userID,
			ProjectName: project.Name,
		}

		if err := p.sendNotification(ctx, subject, message); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			p.logger.Println(err.Error())
			return
		}
	}

	p.logger.Println("a message has been sent")

	err := p.repo.DeleteProject(ctx, projectID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		p.logger.Printf("Failed to delete project %s: %v", projectID, err)
		return
	}

	span.SetStatus(codes.Ok, "Successfully deleted project")

	p.logger.Printf("Successfully deleted project %s", projectID)
}

func (p *ProjectsHandler) HandleTasksDeletedRollback(ctx context.Context, projectID string) {
	ctx, span := p.tracer.Start(ctx, "ProjectsHandler.HandleTasksDeletedRollback")
	defer span.End()
	err := p.repo.PendingDeletion(ctx, projectID, false)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		p.logger.Printf("Failed to delete project %s: %v", projectID, err)
		return
	}

	p.logger.Printf("Successfully retrive deleted project %s", projectID)
	span.SetStatus(codes.Ok, "Successfully retrive deleted project")
}

func (ph *ProjectsHandler) checkTasks(ctx context.Context, project model.Project, userID string, authTokenCookie *http.Cookie) bool {
	// Start a new trace span for distributed tracing
	ctx, span := ph.tracer.Start(ctx, "ProjectsHandler.checkTasks")
	defer span.End()

	// Create the custom TLS client for secure communication
	c, err := createTLSClient()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ph.logger.Printf("Error creating TLS client: %v\n", err)
		return false
	}

	// Prepare the request to the task service
	taskServiceURL := fmt.Sprintf("https://task-server:8080/tasks/%s", project.ID.Hex())

	taskReq, err := http.NewRequestWithContext(ctx, "GET", taskServiceURL, nil)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ph.logger.Println("Failed to create request to task-service:", err)
		return false
	}
	otel.GetTextMapPropagator().Inject(ctx, propagation.HeaderCarrier(taskReq.Header))
	taskReq.Header.Set("Content-Type", "application/json")
	taskReq.AddCookie(authTokenCookie)

	// Circuit breaker and retry mechanism for resilience
	circuitBreaker := gobreaker.NewCircuitBreaker(
		gobreaker.Settings{
			Name:        "TaskServiceCircuitBreaker",
			MaxRequests: 5,
			Timeout:     5 * time.Second,
			Interval:    0,
			ReadyToTrip: func(counts gobreaker.Counts) bool {
				return counts.ConsecutiveFailures > 2
			},
			OnStateChange: func(name string, from gobreaker.State, to gobreaker.State) {
				ph.logger.Printf("Circuit Breaker '%s' changed from '%s' to '%s'", name, from, to)
			},
			IsSuccessful: func(err error) bool {
				if err == nil {
					return true
				}
				if _, ok := err.(domain.ErrRespTmp); ok {
					return false
				}
				return false
			},
		},
	)

	// Set up the retryAgain with backoff strategy for retrying the request
	classifier := retrier.WhitelistClassifier{domain.ErrRespTmp{}}
	retryAgain := retrier.New(retrier.ConstantBackoff(3, 1000*time.Millisecond), classifier)

	var timeout time.Duration
	deadline, reqHasDeadline := ctx.Deadline()

	var taskResp *http.Response
	retryCount := 0

	// Retry the task request if it fails (with circuit breaker)
	err = retryAgain.RunCtx(ctx, func(ctx context.Context) error {
		retryCount++
		ph.logger.Printf("Attempting task-service request, attempt #%d", retryCount)

		if reqHasDeadline {
			timeout = time.Until(deadline)
		}

		// Execute the circuit breaker logic for the task request
		_, err := circuitBreaker.Execute(func() (interface{}, error) {
			if timeout > 0 {
				taskReq.Header.Add("Timeout", strconv.Itoa(int(timeout.Milliseconds())))
			}

			// Send the HTTP request using the TLS client
			resp, err := c.Do(taskReq)
			if err != nil {
				span.RecordError(err)
				span.SetStatus(codes.Error, err.Error())
				return nil, err
			}

			// Handle the case where the service is unavailable or timed out
			if resp.StatusCode == http.StatusServiceUnavailable || resp.StatusCode == http.StatusGatewayTimeout {
				return nil, domain.ErrRespTmp{
					URL:        resp.Request.URL.String(),
					Method:     resp.Request.Method,
					StatusCode: resp.StatusCode,
				}
			}

			// Check if the response status is OK
			if resp.StatusCode != http.StatusOK {
				return nil, fmt.Errorf("unexpected status code from task-service: %s", resp.Status)
			}

			// Store the response for further processing
			taskResp = resp
			return resp, nil
		})

		// If an error occurred, return it for retrying
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			return err
		}
		return nil
	})

	// If the retries failed, log the error and return false
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ph.logger.Printf("Error during task-service request after retries: %v", err)
		return false
	}

	// Ensure the response body is closed once we're done processing it
	defer taskResp.Body.Close()

	// Decode the task response body
	var tasks []Task
	if err := json.NewDecoder(taskResp.Body).Decode(&tasks); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ph.logger.Println("Failed to decode task-service response:", err)
		return false
	}

	// Check if the user is associated with any pending or in-progress tasks
	for _, task := range tasks {
		if task.Status == "Pending" || task.Status == "InProgress" {
			for _, id := range task.UserIDs {
				if id == userID {
					span.SetStatus(codes.Ok, "User is assigned to a task")
					return true
				}
			}
		}
	}

	// No matching task found for the user
	span.SetStatus(codes.Ok, "No tasks found for the user")
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
	ctx, span := p.tracer.Start(h.Context(), "ProjectsHandler.IsUserInProject")
	defer span.End()
	vars := mux.Vars(h)
	projectID := vars["id"]
	userID := vars["userId"]

	isMember := p.isUserInProject(ctx, projectID, userID)

	if isMember {
		rw.WriteHeader(http.StatusOK)
		json.NewEncoder(rw).Encode(map[string]bool{"is_member": true})
	} else {
		rw.WriteHeader(http.StatusNotFound)
		json.NewEncoder(rw).Encode(map[string]bool{"is_member": false})
	}
	span.SetStatus(codes.Ok, "Successful function")
}

func (p *ProjectsHandler) isUserInProject(ctx context.Context, projectID, userID string) bool {
	ctx, span := p.tracer.Start(ctx, "ProjectsHandler.isUserInProject")
	defer span.End()
	project, err := p.repo.GetById(ctx, projectID)
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
	ctx, span := p.tracer.Start(h.Context(), "ProjectsHandler.CheckIfUserIsManager")
	defer span.End()
	role, ok := h.Context().Value(KeyRole{}).(string)
	if !ok {
		span.RecordError(errors.New("Role not found in context"))
		span.SetStatus(codes.Error, "Role not found in context")
		http.Error(rw, "Role not found in context", http.StatusUnauthorized)
		return
	}

	userId, ok := h.Context().Value(KeyUser{}).(string)
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

	isManager, err := p.repo.IsUserManagerOfProject(ctx, userId, projectId)
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

func (p *ProjectsHandler) sendNotification(ctx context.Context, subject string, message interface{}) error {
	_, span := p.tracer.Start(ctx, "ProjectsHandler.AddUsersToProject")
	defer span.End()
	nc, err := Conn()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Println("Error connecting to NATS:", err)
		p.logger.Println("Error connecting to NATS:", err)
		p.custLogger.Error(logrus.Fields{
			"error": err.Error(),
		}, "Failed to connect to NATS")
	}
	defer nc.Close()

	jsonMessage, err := json.Marshal(message)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Println("Error marshalling message:", err)
		p.logger.Println("Error marshalling message:", err)

	}

	err = nc.Publish(subject, jsonMessage)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Println("Error publishing message to NATS:", err)
		p.logger.Println("Error publishing message to NATS:", err)
	}

	p.logger.Println("Notification sent:", subject)
	return nil
}
func (p *ProjectsHandler) GetProjectDetailsById(rw http.ResponseWriter, h *http.Request) {
	ctx, span := p.tracer.Start(h.Context(), "ProjectsHandler.GetProjectDetailsById")
	defer span.End()
	// Step 1: Extract the auth_token cookie from the incoming request
	cookie, err := h.Cookie("auth_token")
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "No token found in cookie", http.StatusUnauthorized)
		p.logger.Println("No token in cookie:", err)
		return
	}

	// Step 2: Get the project ID from the URL
	vars := mux.Vars(h)
	id := vars["id"]

	// Step 3: Fetch the project from the database
	project, err := p.repo.GetById(ctx, id)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		p.logger.Print("Database exception: ", err)
		http.Error(rw, "Error fetching project details", http.StatusInternalServerError)
		return
	}

	// If project is not found, return an error
	if project == nil {
		span.SetStatus(codes.Error, "Project not found")
		span.SetStatus(codes.Error, "Project not found")
		http.Error(rw, "Project with given id not found", http.StatusNotFound)
		p.logger.Printf("Project with id: '%s' not found", id)
		return
	}

	// Step 4: Fetch the user details associated with the project
	usersDetails, err := p.userClient.GetByIdsWithCookies(project.UserIDs, cookie)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Error fetching user details", http.StatusInternalServerError)
		return
	}

	// Step 5: Fetch the tasks associated with the project
	tasksDetails, err := p.taskClient.GetTasksByProjectId(id, cookie)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, err.Error(), http.StatusInternalServerError)
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
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		p.logger.Fatal("Unable to convert to json:", err)
		return
	}
	span.SetStatus(codes.Ok, "")
}
