package handlers

import (
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
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"slices"
	"strconv"
	"strings"
	"task--service/client"
	"task--service/customLogger"
	"task--service/domain"
	"task--service/model"
	"task--service/repositories"
	"time"
)

type TasksHandler struct {
	logger     *log.Logger
	repo       *repositories.TaskRepository
	natsConn   *nats.Conn
	tracer     trace.Tracer
	userClient client.UserClient
	custLogger *customLogger.Logger
}

type KeyTask struct{}
type KeyId struct{}
type KeyRole struct{}

func NewTasksHandler(l *log.Logger, r *repositories.TaskRepository, natsConn *nats.Conn, tracer trace.Tracer, userClient client.UserClient, custLogger *customLogger.Logger) *TasksHandler {
	return &TasksHandler{l, r, natsConn, tracer, userClient, custLogger}
}

func (t *TasksHandler) PostTask(rw http.ResponseWriter, h *http.Request) {
	_, span := t.tracer.Start(context.Background(), "TaskHandler.PostTask")
	defer span.End()
	task := h.Context().Value(KeyTask{}).(*model.Task)
	t.logger.Printf("Received %s request for %s", h.Method, h.URL.Path)
	t.custLogger.Info(nil, fmt.Sprintf("Received %s request for %s", h.Method, h.URL.Path))

	// Preuzimanje Task-a iz Context-a
	task, ok := h.Context().Value(KeyTask{}).(*model.Task)
	if !ok || task == nil {
		errMsg := "Invalid task data in context"
		t.logger.Printf(errMsg)
		t.custLogger.Error(nil, errMsg)
		http.Error(rw, "Invalid task data", http.StatusBadRequest)
		return
	}
	t.custLogger.Info(logrus.Fields{"taskID": task.ID}, "Task data retrieved successfully")

	// Ubacivanje Task-a u repozitorijum
	err := t.repo.Insert(task)

	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		errMsg := "Unable to create task: " + err.Error()
		t.logger.Printf(errMsg)
		t.custLogger.Error(logrus.Fields{"taskID": task.ID}, errMsg)
		http.Error(rw, "Unable to create task", http.StatusInternalServerError)
		return
	}
	span.SetStatus(codes.Ok, "Successfully created task")
	t.custLogger.Info(logrus.Fields{"taskID": task.ID}, "Task created successfully")
	t.custLogger.Info(logrus.Fields{"projectID": task.ProjectID}, "ProjectID")

	taskIDStr := task.ID.Hex()
	// Slanje odgovora
	rw.WriteHeader(http.StatusCreated)
	response := map[string]interface{}{
		"message": "Task created successfully",
		"task":    task,
		"taskId":  taskIDStr,
	}
	err = json.NewEncoder(rw).Encode(response)
	if err != nil {
		errMsg := "Error writing response: " + err.Error()
		t.logger.Printf(errMsg)
		t.custLogger.Error(nil, errMsg)
		return
	}
	t.custLogger.Info(nil, "Task creation response sent successfully")
}

func (t *TasksHandler) GetAllTask(rw http.ResponseWriter, h *http.Request) {
	_, span := t.tracer.Start(context.Background(), "TaskHandler.GetAllTask")
	defer span.End()
	t.logger.Printf("Received %s request for %s", h.Method, h.URL.Path)
	t.custLogger.Info(nil, fmt.Sprintf("Received %s request for %s", h.Method, h.URL.Path))

	// Preuzimanje svih zadataka iz repozitorijuma
	projects, err := t.repo.GetAllTask()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		t.logger.Print("Database exception: ", err)
		errMsg := "Database exception: " + err.Error()
		t.logger.Print(errMsg)
		t.custLogger.Error(nil, errMsg)
		http.Error(rw, "Internal server error", http.StatusInternalServerError)
		return
	}
	t.custLogger.Info(nil, "All tasks retrieved successfully")

	// Konvertovanje u JSON i slanje odgovora
	err = projects.ToJSON(rw)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		errMsg := "Unable to convert to JSON: " + err.Error()
		t.custLogger.Error(nil, errMsg)
		http.Error(rw, "Unable to convert to JSON", http.StatusInternalServerError)
		return
	}
	t.custLogger.Info(nil, "Tasks successfully converted to JSON and sent in response")
	span.SetStatus(codes.Ok, "Successfully retrieved all tasks")
}

func (t *TasksHandler) GetAllTasksByProjectId(rw http.ResponseWriter, h *http.Request) {
	_, span := t.tracer.Start(context.Background(), "TaskHandler.GetAllTasksByProjectId")
	defer span.End()
	t.logger.Printf("Received %s request for %s", h.Method, h.URL.Path)
	t.custLogger.Info(nil, fmt.Sprintf("Received %s request for %s", h.Method, h.URL.Path))

	// Ekstrakcija projectID iz URL-a
	vars := mux.Vars(h)
	projectID := vars["projectId"]
	t.custLogger.Info(logrus.Fields{"projectID": projectID}, "Extracted project ID from request")

	// Preuzimanje zadataka za dati projectID
	tasks, err := t.repo.GetAllByProjectId(projectID)

	//http.Error(rw, "Service unavailable for testing", http.StatusServiceUnavailable)
	//return

	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		t.logger.Print("Database exception: ", err)
		errMsg := "Database exception while fetching tasks"
		t.logger.Print(errMsg, err)
		t.custLogger.Error(logrus.Fields{"projectID": projectID}, errMsg+": "+err.Error())
		http.Error(rw, "Failed to fetch tasks", http.StatusInternalServerError)
		return
	}
	t.custLogger.Info(logrus.Fields{"projectID": projectID, "taskCount": len(tasks)}, "Tasks fetched successfully")

	// Enkodovanje zadataka u JSON i slanje odgovora
	if err := json.NewEncoder(rw).Encode(tasks); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Failed to encode response", http.StatusInternalServerError)
		errMsg := "Failed to encode response"
		t.logger.Printf("%s: %v", errMsg, err)
		t.custLogger.Error(logrus.Fields{"projectID": projectID}, errMsg+": "+err.Error())
		http.Error(rw, errMsg, http.StatusInternalServerError)
		return
	}
	span.SetStatus(codes.Ok, "Successfully retrieved all tasks")

	t.custLogger.Info(logrus.Fields{"projectID": projectID}, "Tasks successfully encoded and sent in response")
}

func (t *TasksHandler) GetAllTasksDetailsByProjectId(rw http.ResponseWriter, h *http.Request) {
	t.logger.Printf("Received %s request for %s", h.Method, h.URL.Path)
	t.custLogger.Info(nil, fmt.Sprintf("Received %s request for %s", h.Method, h.URL.Path))

	// Step 1: Get the project ID from the URL
	vars := mux.Vars(h)
	projectID := vars["projectId"]
	t.custLogger.Info(logrus.Fields{"projectID": projectID}, "Extracted project ID from request")

	// Step 2: Validate token in cookies
	cookie, err := h.Cookie("auth_token")
	if err != nil {
		errMsg := "No token found in cookie"
		t.logger.Println(errMsg, err)
		t.custLogger.Error(nil, errMsg+": "+err.Error())
		http.Error(rw, errMsg, http.StatusUnauthorized)
		return
	}
	t.custLogger.Info(nil, "Authorization token found in cookie")

	// Step 3: Fetch tasks for the given project
	tasks, err := t.repo.GetAllByProjectId(projectID)
	if err != nil {
		errMsg := "Database exception while fetching tasks"
		t.logger.Print(errMsg, err)
		t.custLogger.Error(logrus.Fields{"projectID": projectID}, errMsg+": "+err.Error())
		http.Error(rw, "Failed to fetch tasks", http.StatusInternalServerError)
		return
	}
	t.custLogger.Info(logrus.Fields{"projectID": projectID, "taskCount": len(tasks)}, "Tasks fetched successfully")

	// Step 4: Prepare a slice to store tasks with user details
	var tasksWithUserDetails []client.TaskDetails

	// Step 5: Fetch user details for each task
	for _, task := range tasks {
		t.custLogger.Info(logrus.Fields{"taskID": task.ID}, "Fetching user details for task")
		usersDetails, err := t.userClient.GetByIdsWithCookies(task.UserIDs, cookie)
		if err != nil {
			errMsg := "Error fetching user details"
			t.logger.Printf("%s for task ID '%s': %v", errMsg, task.ID, err)
			t.custLogger.Error(logrus.Fields{"taskID": task.ID}, errMsg+": "+err.Error())
			http.Error(rw, "Error fetching user details for tasks", http.StatusInternalServerError)
			return
		}
		t.custLogger.Info(logrus.Fields{"taskID": task.ID, "userCount": len(usersDetails)}, "User details fetched successfully")

		// Step 6: Map task to TaskDetails and include user details
		taskDetails := client.TaskDetails{
			ID:           task.ID,
			ProjectID:    task.ProjectID,
			Name:         task.Name,
			Description:  task.Description,
			Status:       task.Status,
			CreatedAt:    task.CreatedAt,
			UpdatedAt:    task.UpdatedAt,
			UserIDs:      task.UserIDs,
			Users:        usersDetails,
			Dependencies: task.Dependencies,
			Blocked:      task.Blocked,
		}

		// Add the task with user details to the result slice
		tasksWithUserDetails = append(tasksWithUserDetails, taskDetails)
	}

	t.logger.Printf("Tasks with details is: %+v", tasksWithUserDetails)

	// Step 7: Return the tasks with user details in the response
	if err := json.NewEncoder(rw).Encode(tasksWithUserDetails); err != nil {
		errMsg := "Failed to encode response"
		t.logger.Printf("%s: %v", errMsg, err)
		t.custLogger.Error(nil, errMsg+": "+err.Error())
		http.Error(rw, errMsg, http.StatusInternalServerError)
		return
	}
	t.custLogger.Info(logrus.Fields{"projectID": projectID}, "Tasks with user details successfully returned in response")
}

func (t *TasksHandler) HandleProjectDeleted(projectID string) {
	_, span := t.tracer.Start(context.Background(), "TaskHandler.HandleProjectDeleted")
	defer span.End()

	err := t.repo.DeleteAllTasksByProjectId(projectID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		t.logger.Printf("Failed to delete tasks for project %s: %v", projectID, err)

		_ = t.natsConn.Publish("TaskDeletionFailed", []byte(projectID))
	}
	t.logger.Printf("Successfully deleted all tasks for project %s", projectID)

	err = t.natsConn.Publish("TasksDeleted", []byte(projectID))
	if err != nil {
		t.logger.Printf("Failed to publish TasksDeleted event for project %s: %v", projectID, err)
	}

	//_ = t.natsConn.Publish("TaskDeletionFailed", []byte(projectID)) // uncomment this, and comment out the code above to test 'rollback' function

	span.SetStatus(codes.Ok, "Successfully deleted all tasks")
}

func (t *TasksHandler) MiddlewareContentTypeSet(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, h *http.Request) {
		t.logger.Println("Method [", h.Method, "] - Hit path :", h.URL.Path)
		rw.Header().Add("Content-Type", "application/json")
		next.ServeHTTP(rw, h)
	})
}

func (t *TasksHandler) MiddlewareTaskDeserialization(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, h *http.Request) {
		task := &model.Task{}
		err := task.FromJSON(h.Body)
		if err != nil {
			http.Error(rw, "Unable to decode json", http.StatusBadRequest)
			t.logger.Println("Error decoding JSON:", err)
			return
		}

		ctx := context.WithValue(h.Context(), KeyTask{}, task)
		h = h.WithContext(ctx)

		next.ServeHTTP(rw, h)
	})
}

func (uh *TasksHandler) MiddlewareCheckRoles(allowedRoles []string, next http.Handler) http.Handler {
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

func (p *TasksHandler) MiddlewareExtractUserFromCookie(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, h *http.Request) {
		p.logger.Printf("Received %s request for %s", h.Method, h.URL.Path)
		p.custLogger.Info(nil, fmt.Sprintf("Received %s request for %s", h.Method, h.URL.Path))

		// Ekstrakcija auth_token iz kolačića
		cookie, err := h.Cookie("auth_token")
		if err != nil {
			errMsg := "No token found in cookie"
			p.logger.Println(errMsg, err)
			p.custLogger.Error(nil, errMsg+": "+err.Error())
			http.Error(rw, errMsg, http.StatusUnauthorized)
			return
		}
		p.custLogger.Info(nil, "Authorization token found in cookie")

		// Verifikacija tokena preko korisničkog servisa
		userID, role, err := p.verifyTokenWithUserService(h.Context(), cookie.Value)
		if err != nil {
			errMsg := "Invalid token"
			p.logger.Println(errMsg, err)
			p.custLogger.Error(nil, errMsg+": "+err.Error())
			http.Error(rw, errMsg, http.StatusUnauthorized)
			return
		}
		p.custLogger.Info(logrus.Fields{"userID": userID, "role": role}, "Token verified successfully")

		// Dodavanje korisničkih podataka u kontekst
		ctx := context.WithValue(h.Context(), KeyId{}, userID)
		ctx = context.WithValue(ctx, KeyRole{}, role)
		h = h.WithContext(ctx)

		// Nastavak do sledećeg handler-a
		p.custLogger.Info(logrus.Fields{"userID": userID, "role": role}, "Context updated with user ID and role, proceeding to next handler")
		next.ServeHTTP(rw, h)
	})
}

func (p *TasksHandler) verifyTokenWithUserService(ctx context.Context, token string) (string, string, error) {
	_, span := p.tracer.Start(ctx, "TaskHandler.verifyTokenWithUserService")
	defer span.End()

	linkToUserService := os.Getenv("LINK_TO_USER_SERVICE")
	userServiceURL := fmt.Sprintf("%s/validate-token", linkToUserService)
	p.logger.Printf("Validating token with user service at %s", userServiceURL)
	p.custLogger.Info(nil, fmt.Sprintf("Sending token validation request to %s", userServiceURL))

	reqBody := fmt.Sprintf(`{"token": "%s"}`, token)
	req, err := http.NewRequest("POST", userServiceURL, strings.NewReader(reqBody))
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		p.logger.Printf("Failed to create token validation request: %v", err)
		p.custLogger.Error(nil, "Failed to create token validation request: "+err.Error())
		return "", "", err
	}
	req.Header.Set("Content-Type", "application/json")

	clientToDo, err := createTLSClient()
	if err != nil {
		log.Printf("Error creating TLS client: %v\n", err)
		return "", "", err
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
				log.Printf("Circuit Breaker '%s' changed from '%s' to '%s'\n", name, from, to)
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

	retryCount := 0
	var userID, role string

	err = retryAgain.RunCtx(ctx, func(ctx context.Context) error {
		retryCount++
		log.Printf("Attempting validate-token request, attempt #%d", retryCount)

		if reqHasDeadline {
			timeout = time.Until(deadline)
		}

		_, err := circuitBreaker.Execute(func() (interface{}, error) {
			if timeout > 0 {
				req.Header.Add("Timeout", strconv.Itoa(int(timeout.Milliseconds())))
			}

			resp, err := clientToDo.Do(req)
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
				return nil, err
			}

			userID = result.UserID
			role = result.Role

			return result, nil
		})

		if err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Printf("Error during validate-token request after retries: %v", err)
		p.custLogger.Error(nil, fmt.Sprintf("Error during validate-token request after retries: %v", err))
		return "", "", fmt.Errorf("error validating token: %w", err)
	}

	p.custLogger.Info(logrus.Fields{"userID": userID, "role": role}, "Token validated successfully")
	span.SetStatus(codes.Ok, "Successfully validated token")

	return userID, role, nil
}

func createTLSClient() (*http.Client, error) {
	caCert, err := ioutil.ReadFile("/app/cert.crt")
	if err != nil {
		return nil, err
	}
	caCertPool := x509.NewCertPool()
	if !caCertPool.AppendCertsFromPEM(caCert) {
		return nil, err
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

func (t *TasksHandler) LogTaskMemberChange(rw http.ResponseWriter, h *http.Request) {
	_, span := t.tracer.Start(context.Background(), "TaskHandler.LogTaskMemberChange")
	defer span.End()
	vars := mux.Vars(h)
	taskID := vars["taskId"]
	action := vars["action"] // Can be "add" or "remove"
	userID := vars["userId"]

	t.logger.Println("User id is " + userID)
	t.logger.Println("Action is " + action)

	if action != "add" && action != "remove" {
		span.RecordError(errors.New("Invalid action"))
		span.SetStatus(codes.Error, "Invalid action")
		http.Error(rw, "Invalid action", http.StatusBadRequest)
		return
	}

	task, err := t.repo.GetByID(taskID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Task not found", http.StatusNotFound)
		t.logger.Println("Error fetching task:", err)
		return
	}

	if action == "add" {
		if !t.isUserInProject(task.ProjectID, userID) {
			span.RecordError(errors.New("Invalid userId"))
			span.SetStatus(codes.Error, "Invalid userId")
			http.Error(rw, "User not part of the project", http.StatusForbidden)
			return
		}

		if contains(task.UserIDs, userID) {
			span.RecordError(errors.New("user is already a member of this task"))
			span.SetStatus(codes.Error, "User is already a member of this task")
			http.Error(rw, "User is already a member of this task", http.StatusConflict)
			return
		}
	}

	if action == "remove" {
		if task.Status == model.Completed {
			span.RecordError(errors.New("cannot remove task"))
			span.SetStatus(codes.Error, "cannot remove task")
			http.Error(rw, "Cannot remove member from a completed task", http.StatusForbidden)
			return
		}

		if !contains(task.UserIDs, userID) {
			span.RecordError(errors.New("Invalid userId"))
			span.SetStatus(codes.Error, "Invalid userId")
			t.logger.Println("Invalid userId " + userID)
			http.Error(rw, "User is not a member of this task", http.StatusBadRequest)
			return
		}
	}

	activity := model.TaskMemberActivity{
		TaskID:    taskID,
		UserID:    userID,
		Action:    action,
		Timestamp: time.Now(),
		Processed: false,
	}

	err = t.repo.InsertTaskMemberActivity(&activity)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Failed to log task member change", http.StatusInternalServerError)
		t.logger.Println("Error inserting task member change:", err)
		return
	}

	if action == "add" {
		task.UserIDs = append(task.UserIDs, userID)
		nc, err := Conn()
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Println("Error connecting to NATS:", err)
			http.Error(rw, "Failed to connect to message broker", http.StatusInternalServerError)
			return
		}
		defer nc.Close()

		subject := "task.joined"

		message := struct {
			UserID   string `json:"userId"`
			TaskName string `json:"taskName"`
		}{
			UserID:   userID,
			TaskName: task.Name,
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

		t.logger.Println("a message has been sent")
	} else {
		task.UserIDs = remove(task.UserIDs, userID)
		nc, err := Conn()
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Println("Error connecting to NATS:", err)
			http.Error(rw, "Failed to connect to message broker", http.StatusInternalServerError)
			return
		}
		defer nc.Close()

		subject := "task.removed"

		message := struct {
			UserID   string `json:"userId"`
			TaskName string `json:"taskName"`
		}{
			UserID:   userID,
			TaskName: task.Name,
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

		t.logger.Println("a message has been sent")
	}

	err = t.repo.Update(task)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Failed to update task", http.StatusInternalServerError)
		t.logger.Println("Error updating task:", err)
		return
	}

	t.ProcessTaskMemberActivity()

	rw.Header().Set("Content-Type", "application/json")
	rw.WriteHeader(http.StatusCreated)
	json.NewEncoder(rw).Encode(map[string]string{
		"message": "Task member change logged and task updated successfully",
	})

	span.SetStatus(codes.Ok, "Successfully updated task")
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

func (t *TasksHandler) ProcessTaskMemberActivity() {
	_, span := t.tracer.Start(context.Background(), "TaskHandler.ProcessTaskMemberActivity")
	defer span.End()
	activities, err := t.repo.GetUnprocessedActivities()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		t.logger.Println("Error fetching unprocessed changes:", err)
		return
	}

	for _, activity := range activities {
		task, err := t.repo.GetByID(activity.TaskID)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			t.logger.Println("Error fetching task for change:", err)
			continue
		}

		switch activity.Action {
		case "add":
			if !contains(task.UserIDs, activity.UserID) {
				task.UserIDs = append(task.UserIDs, activity.UserID)
			}
		case "remove":
			if contains(task.UserIDs, activity.UserID) {
				task.UserIDs = remove(task.UserIDs, activity.UserID)
			}
		}

		err = t.repo.Update(task)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			t.logger.Println("Error updating task:", err)
			continue
		}

		err = t.repo.MarkChangeAsProcessed(activity.ID)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			t.logger.Println("Error marking change as processed:", err)
			continue
		}
	}
	span.SetStatus(codes.Ok, "Successfully updated task")
}

func contains(slice []string, item string) bool {
	for _, v := range slice {
		if v == item {
			return true
		}
	}
	return false
}

func remove(slice []string, item string) []string {
	result := []string{}
	for _, v := range slice {
		if v != item {
			result = append(result, v)
		}
	}
	return result
}

func (t *TasksHandler) isUserInProject(projectID, userID string) bool {
	_, span := t.tracer.Start(context.Background(), "TaskHandler.isUserInProject")
	defer span.End()

	linkToProjectService := os.Getenv("LINK_TO_PROJECT_SERVICE")
	projectServiceURL := fmt.Sprintf("%s/projects/%s/users/%s/check", linkToProjectService, projectID, userID)

	clientToDo, err := createTLSClient()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		t.logger.Println("Error creating TLS client:", err)
		return false
	}

	resp, err := clientToDo.Get(projectServiceURL)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		t.logger.Println("Error making GET request:", err)
		return false
	}
	defer resp.Body.Close()
	t.logger.Println("Response code: " + resp.Status)
	switch resp.StatusCode {
	case http.StatusOK:
		return true
	case http.StatusNotFound:
		return false
	default:
		t.logger.Println("Unexpected status code:", resp.StatusCode)
		span.SetStatus(codes.Ok, "Function is working with unexpected response")
		return false
	}
}

func (th *TasksHandler) HandleStatusUpdate(rw http.ResponseWriter, req *http.Request) {
	_, span := th.tracer.Start(context.Background(), "TaskHandler.HandleStatusUpdate")
	defer span.End()
	th.logger.Println("Received request to update task status")
	th.custLogger.Info(nil, "Received request to update task status")

	// Ekstrakcija task-a iz konteksta
	task, ok := req.Context().Value(KeyTask{}).(*model.Task)
	if !ok || task == nil {
		span.RecordError(errors.New("cannot get task from context"))
		span.SetStatus(codes.Error, "cannot get task from context")
		http.Error(rw, "Task data is missing or invalid", http.StatusBadRequest)
		th.logger.Println("Error retrieving task from context")
		errMsg := "Task data is missing or invalid"
		th.logger.Println(errMsg)
		th.custLogger.Error(nil, errMsg)
		http.Error(rw, errMsg, http.StatusBadRequest)
		return
	}
	th.custLogger.Info(logrus.Fields{"taskID": task.ID, "status": task.Status}, "Task extracted from context successfully")

	// Ažuriranje statusa zadatka
	err := th.repo.UpdateStatus(task)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		th.logger.Println("Failed to update task status:", err)
		http.Error(rw, "Failed to update status", http.StatusInternalServerError)
		errMsg := "Failed to update task status"
		th.logger.Println(errMsg, err)
		th.custLogger.Error(logrus.Fields{"taskID": task.ID, "status": task.Status}, errMsg+": "+err.Error())
		http.Error(rw, errMsg, http.StatusInternalServerError)
		return
	}
	th.custLogger.Info(logrus.Fields{"taskID": task.ID, "status": task.Status}, "Task status updated successfully")

	err = th.publishStatusUpdate(task)
	if err != nil {
		th.logger.Println("Error publishing status update:", err)
		http.Error(rw, "Failed to notify task members", http.StatusInternalServerError)
		return
	}

	rw.WriteHeader(http.StatusOK)
	th.logger.Println("Task status updated successfully")
	span.SetStatus(codes.Ok, "Successfully updated task")
	th.custLogger.Info(logrus.Fields{"taskID": task.ID, "status": task.Status}, "Response sent successfully")
}

func (t *TasksHandler) publishStatusUpdate(task *model.Task) error {
	nc, err := Conn()
	if err != nil {
		return fmt.Errorf("failed to connect to NATS: %w", err)
	}
	defer nc.Close()

	message := struct {
		TaskName   string   `json:"taskName"`
		TaskStatus string   `json:"taskStatus"`
		MemberIds  []string `json:"memberIds"`
	}{
		TaskName:   task.Name,
		TaskStatus: string(task.Status),
		MemberIds:  task.UserIDs,
	}

	jsonMessage, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	subject := "task.status.update"
	err = nc.Publish(subject, jsonMessage)
	if err != nil {
		return fmt.Errorf("failed to publish message to NATS: %w", err)
	}

	t.logger.Println("Task status update message sent to NATS")

	return nil
}

func (th *TasksHandler) HandleCheckingIfUserIsInTask(rw http.ResponseWriter, r *http.Request) {
	th.logger.Println("Received request to check if user is part of the task")
	th.custLogger.Info(nil, "Received request to check if user is part of the task")

	// Ekstrakcija zadatka iz konteksta
	_, span := th.tracer.Start(context.Background(), "TaskHandler.HandleCheckingIfUserIsInTask")
	defer span.End()
	task, ok := r.Context().Value(KeyTask{}).(*model.Task)
	if !ok || task == nil {
		span.RecordError(errors.New("task data is missing or invalid"))
		span.SetStatus(codes.Error, "task data is missing or invalid")
		http.Error(rw, "Task data is missing or invalid", http.StatusBadRequest)
		th.logger.Println("Error retrieving task from context")
		errMsg := "Task data is missing or invalid"
		th.logger.Println(errMsg)
		th.custLogger.Error(nil, errMsg)
		http.Error(rw, errMsg, http.StatusBadRequest)
		return
	}
	th.custLogger.Info(logrus.Fields{"taskID": task.ID}, "Task extracted from context successfully")

	id, ok := r.Context().Value(KeyId{}).(string)
	if !ok || id == "" {
		span.RecordError(errors.New("User ID is missing or invalid"))
		span.SetStatus(codes.Error, "User ID is missing or invalid")
		http.Error(rw, "User ID is missing or invalid", http.StatusUnauthorized)
		th.logger.Println("Error retrieving user ID from context")
		errMsg := "User ID is missing or invalid"
		th.logger.Println(errMsg)
		th.custLogger.Error(nil, errMsg)
		http.Error(rw, errMsg, http.StatusUnauthorized)
		return
	}
	th.custLogger.Info(logrus.Fields{"userID": id}, "User ID extracted from context successfully")

	itContains := slices.Contains(task.UserIDs, id)
	rw.Header().Set("Content-Type", "text/plain")

	if itContains {
		rw.WriteHeader(http.StatusOK)
		rw.Write([]byte("true"))
		th.logger.Println("User is part of the task")
		th.custLogger.Info(logrus.Fields{"taskID": task.ID, "userID": id}, "User is part of the task")
	} else {
		rw.WriteHeader(http.StatusOK)
		rw.Write([]byte("false"))
		th.logger.Println("User is not part of the task")
		th.custLogger.Info(logrus.Fields{"taskID": task.ID, "userID": id}, "User is not part of the task")
	}
	span.SetStatus(codes.Ok, "Successfully checked user")
}

func (th *TasksHandler) BlockTask(rw http.ResponseWriter, r *http.Request) {
	th.logger.Println("Received request to block task")
	th.custLogger.Info(nil, "Received request to block task")

	vars := mux.Vars(r)
	taskId := vars["taskId"]
	task, err := th.repo.GetByID(taskId)
	if err != nil {
		th.logger.Print("Database exception:", err)
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}
	err = th.repo.UpdateFlag(task)
	if err != nil {
		th.logger.Print("Database exception:", err)
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}

}

func (th *TasksHandler) AddDependencyToTask(rw http.ResponseWriter, r *http.Request) {
	th.logger.Println("Received request to add dependency to task")
	th.custLogger.Info(nil, "Received request to add dependency to task")

	vars := mux.Vars(r)
	taskId := vars["taskId"]
	task, err := th.repo.GetByID(taskId)
	if err != nil {
		th.logger.Print("Database exception:", err)
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}
	dependencyId := vars["dependencyId"]
	//dependency, err := th.repo.GetByID(dependencyId)
	//if err != nil {
	//	th.logger.Print("Database exception:", err)
	//	rw.WriteHeader(http.StatusInternalServerError)
	//	return
	//}
	th.logger.Println("dependencyId: ", dependencyId)
	th.logger.Println("taskId: ", taskId)

	err = th.repo.AddDependency(task, dependencyId)
	if err != nil {
		th.logger.Print("Database exception:", err)
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}

}

// TODO: check this and make it work( it has to receive a nats request and block task)
func (th *TasksHandler) listenForDependencyUpdates() {
	nc, err := Conn()
	if err != nil {
		th.logger.Printf("Failed to connect to NATS: %v", err)
		return
	}
	defer nc.Close()

	_, err = nc.Subscribe("task.dependency.updated", func(msg *nats.Msg) {
		th.logger.Printf("Message received: %s", string(msg.Data))
		var event map[string]string
		err := json.Unmarshal(msg.Data, &event)
		if err != nil {
			th.logger.Printf("Error unmarshalling event: %v", err)
			return
		}

		taskID := event["taskID"]
		dependencyID := event["dependencyID"]

		th.logger.Printf("Processing dependency update for TaskID: %s, DependencyID: %s", taskID, dependencyID)
		th.updateBlockedStatus(dependencyID)
	})
	if err != nil {
		log.Fatalf("Error subscribing to NATS subject: %v", err)
	}

	select {}
}

func (th *TasksHandler) updateBlockedStatus(taskID string) {
	th.custLogger.Info(nil, "Received nats request to change flag of task to blocked")
	th.logger.Println("Received nats request to change flag of task to blocked")

	task, err := th.repo.GetByID(taskID)
	if err != nil {
		th.custLogger.Info(nil, "Cannot find task by id")
		return
	}
	task.Blocked = true
	err = th.repo.UpdateFlag(task)
	if err != nil {
		th.custLogger.Info(nil, "Cannot find task by id")
		return
	}
}
