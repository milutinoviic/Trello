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
	"slices"
	"strings"
	"task--service/client"
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
}

type KeyTask struct{}
type KeyId struct{}
type KeyRole struct{}

func NewTasksHandler(l *log.Logger, r *repositories.TaskRepository, natsConn *nats.Conn, tracer trace.Tracer, userClient client.UserClient) *TasksHandler {
	return &TasksHandler{l, r, natsConn, tracer, userClient}
}

func (t *TasksHandler) PostTask(rw http.ResponseWriter, h *http.Request) {
	_, span := t.tracer.Start(context.Background(), "TaskHandler.PostTask")
	defer span.End()
	task := h.Context().Value(KeyTask{}).(*model.Task)
	err := t.repo.Insert(task)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Unable to create task", http.StatusInternalServerError)
		return
	}
	span.SetStatus(codes.Ok, "Successfully created task")
	rw.WriteHeader(http.StatusCreated)
}

func (t *TasksHandler) GetAllTask(rw http.ResponseWriter, h *http.Request) {
	_, span := t.tracer.Start(context.Background(), "TaskHandler.GetAllTask")
	defer span.End()
	projects, err := t.repo.GetAllTask()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		t.logger.Print("Database exception: ", err)
	}

	err = projects.ToJSON(rw)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		t.logger.Fatal("Unable to convert to json :", err)
		return
	}
	span.SetStatus(codes.Ok, "Successfully retrieved all tasks")
}

func (t *TasksHandler) GetAllTasksByProjectId(rw http.ResponseWriter, h *http.Request) {
	_, span := t.tracer.Start(context.Background(), "TaskHandler.GetAllTasksByProjectId")
	defer span.End()
	vars := mux.Vars(h)
	projectID := vars["projectId"]

	tasks, err := t.repo.GetAllByProjectId(projectID)

	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		t.logger.Print("Database exception: ", err)
		http.Error(rw, "Failed to fetch tasks", http.StatusInternalServerError)
		return
	}

	if err := json.NewEncoder(rw).Encode(tasks); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Failed to encode response", http.StatusInternalServerError)
	}
	span.SetStatus(codes.Ok, "Successfully retrieved all tasks")

}

func (t *TasksHandler) GetAllTasksDetailsByProjectId(rw http.ResponseWriter, h *http.Request) {
	// Step 1: Get the project ID from the URL
	vars := mux.Vars(h)
	projectID := vars["projectId"]

	cookie, err := h.Cookie("auth_token")
	if err != nil {
		http.Error(rw, "No token found in cookie", http.StatusUnauthorized)
		t.logger.Println("No token in cookie:", err)
		return
	}

	// Step 2: Fetch tasks for the given project
	tasks, err := t.repo.GetAllByProjectId(projectID)
	if err != nil {
		t.logger.Print("Database exception: ", err)
		http.Error(rw, "Failed to fetch tasks", http.StatusInternalServerError)
		return
	}

	// Step 3: Prepare a slice to store tasks with user details
	var tasksWithUserDetails []client.TaskDetails

	// Step 4: Fetch user details for each task
	for _, task := range tasks {
		// Fetch user details for the task based on UserIDs
		usersDetails, err := t.userClient.GetByIdsWithCookies(task.UserIDs, cookie)
		if err != nil {
			t.logger.Printf("Error fetching user details for task ID '%s': %v", task.ID, err)
			http.Error(rw, "Error fetching user details for tasks", http.StatusInternalServerError)
			return
		}

		// Step 5: Map task to TaskDetails and include user details
		taskDetails := client.TaskDetails{
			ID:           task.ID,
			ProjectID:    task.ProjectID,
			Name:         task.Name,
			Description:  task.Description,
			Status:       task.Status,
			CreatedAt:    task.CreatedAt,
			UpdatedAt:    task.UpdatedAt,
			UserIDs:      task.UserIDs,
			Users:        usersDetails, // Add the user details
			Dependencies: task.Dependencies,
			Blocked:      task.Blocked,
		}

		// Add the task with user details to the result slice
		tasksWithUserDetails = append(tasksWithUserDetails, taskDetails)
	}

	// Step 6: Return the tasks with user details in the response
	if err := json.NewEncoder(rw).Encode(tasksWithUserDetails); err != nil {
		http.Error(rw, "Failed to encode response", http.StatusInternalServerError)
		t.logger.Printf("Error encoding response: %v", err)
	}
}

func (t *TasksHandler) HandleProjectDeleted(projectID string) {
	_, span := t.tracer.Start(context.Background(), "TaskHandler.HandleProjectDeleted")
	defer span.End()

	err := t.repo.DeleteAllTasksByProjectId(projectID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		t.logger.Printf("Failed to delete tasks for project %s: %v", projectID, err)

		// Publish a "CompensateProjectDeletion" event via NATS
		//event := map[string]string{"projectId": projectID}
		//eventData, err := json.Marshal(event) // Convert event to JSON format
		//if err != nil {
		//	t.logger.Printf("Failed to marshal compensate event: %v", err)
		//	return
		//}
		//
		//err = t.natsConn.Publish("CompensateProjectDeletion", eventData)
		//if err != nil {
		//	t.logger.Printf("Failed to publish compensate event: %v", err)
		//}
	}
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

		ctx := context.WithValue(h.Context(), KeyId{}, userID)
		ctx = context.WithValue(ctx, KeyRole{}, role)

		h = h.WithContext(ctx)

		next.ServeHTTP(rw, h)
	})
}

func (p *TasksHandler) verifyTokenWithUserService(token string) (string, string, error) {
	_, span := p.tracer.Start(context.Background(), "TaskHandler.verifyTokenWithUserService")
	defer span.End()
	userServiceURL := "http://user-server:8080/validate-token"
	reqBody := fmt.Sprintf(`{"token": "%s"}`, token)
	req, err := http.NewRequest("POST", userServiceURL, strings.NewReader(reqBody))
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return "", "", err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return "", "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		span.RecordError(errors.New(resp.Status))
		span.SetStatus(codes.Error, errors.New(resp.Status).Error())
		return "", "", fmt.Errorf("failed to validate token, status: %s", resp.Status)
	}

	var result struct {
		UserID string `json:"user_id"`
		Role   string `json:"role"`
	}

	err = json.NewDecoder(resp.Body).Decode(&result)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return "", "", err
	}

	span.SetStatus(codes.Ok, "Successfully validated token")
	return result.UserID, result.Role, nil
}

func (t *TasksHandler) LogTaskMemberChange(rw http.ResponseWriter, h *http.Request) {
	_, span := t.tracer.Start(context.Background(), "TaskHandler.LogTaskMemberChange")
	defer span.End()
	vars := mux.Vars(h)
	taskID := vars["taskId"]
	action := vars["action"] // Can be "add" or "remove"
	userID := vars["userId"]

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
	} else if action == "remove" {
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

	rw.WriteHeader(http.StatusCreated)
	fmt.Fprintf(rw, "Task member change logged and task updated successfully")
	span.SetStatus(codes.Ok, "Successfully updated task")
}

func Conn() (*nats.Conn, error) {
	conn, err := nats.Connect("nats://nats:4222")
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
	projectServiceURL := "http://project-server:8080/projects/" + projectID + "/users/" + userID + "/check"

	resp, err := http.Get(projectServiceURL)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		t.logger.Println("Error checking user in project:", err)
		return false
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		return true
	}

	if resp.StatusCode == http.StatusNotFound {
		return false
	}

	t.logger.Println("Unexpected status code:", resp.StatusCode)
	span.SetStatus(codes.Ok, "Function is working")
	return false
}

func (th *TasksHandler) HandleStatusUpdate(rw http.ResponseWriter, req *http.Request) {
	_, span := th.tracer.Start(context.Background(), "TaskHandler.HandleStatusUpdate")
	defer span.End()
	th.logger.Println("Received request to update task status")

	task, ok := req.Context().Value(KeyTask{}).(*model.Task)
	if !ok || task == nil {
		span.RecordError(errors.New("cannot get task from context"))
		span.SetStatus(codes.Error, "cannot get task from context")
		http.Error(rw, "Task data is missing or invalid", http.StatusBadRequest)
		th.logger.Println("Error retrieving task from context")
		return
	}

	th.logger.Printf("Task received: %+v", task)

	err := th.repo.UpdateStatus(task)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		th.logger.Println("Failed to update task status:", err)
		http.Error(rw, "Failed to update status", http.StatusInternalServerError)
		return
	}

	rw.WriteHeader(http.StatusOK)
	th.logger.Println("Task status updated successfully")
	span.SetStatus(codes.Ok, "Successfully updated task")
}

func (th *TasksHandler) HandleCheckingIfUserIsInTask(rw http.ResponseWriter, r *http.Request) {
	_, span := th.tracer.Start(context.Background(), "TaskHandler.HandleCheckingIfUserIsInTask")
	defer span.End()
	task, ok := r.Context().Value(KeyTask{}).(*model.Task)
	if !ok || task == nil {
		span.RecordError(errors.New("task data is missing or invalid"))
		span.SetStatus(codes.Error, "task data is missing or invalid")
		http.Error(rw, "Task data is missing or invalid", http.StatusBadRequest)
		th.logger.Println("Error retrieving task from context")
		return
	}

	id, ok := r.Context().Value(KeyId{}).(string)
	if !ok || id == "" {
		span.RecordError(errors.New("User ID is missing or invalid"))
		span.SetStatus(codes.Error, "User ID is missing or invalid")
		http.Error(rw, "User ID is missing or invalid", http.StatusUnauthorized)
		th.logger.Println("Error retrieving user ID from context")
		return
	}

	itContains := slices.Contains(task.UserIDs, id)
	rw.Header().Set("Content-Type", "text/plain")

	if itContains {
		rw.WriteHeader(http.StatusOK)
		rw.Write([]byte("true"))
		th.logger.Println("User is part of the task")
	} else {
		rw.WriteHeader(http.StatusOK)
		rw.Write([]byte("false"))
		th.logger.Println("User is not part of the task")
	}
	span.SetStatus(codes.Ok, "Successfully checked user")
}
