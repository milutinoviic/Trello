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
	"slices"
	"strings"
	"task--service/client"
	"task--service/customLogger"
	"task--service/model"
	"task--service/repositories"
	"time"
)

type TasksHandler struct {
	logger     *log.Logger
	repo       *repositories.TaskRepository
	natsConn   *nats.Conn
	userClient client.UserClient
	custLogger *customLogger.Logger
}

type KeyTask struct{}
type KeyId struct{}
type KeyRole struct{}

func NewTasksHandler(l *log.Logger, r *repositories.TaskRepository, natsConn *nats.Conn, userClient client.UserClient, custLogger *customLogger.Logger) *TasksHandler {
	return &TasksHandler{l, r, natsConn, userClient, custLogger}
}

func (t *TasksHandler) PostTask(rw http.ResponseWriter, h *http.Request) {
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
		errMsg := "Unable to create task: " + err.Error()
		t.logger.Printf(errMsg)
		t.custLogger.Error(logrus.Fields{"taskID": task.ID}, errMsg)
		http.Error(rw, "Unable to create task", http.StatusInternalServerError)
		return
	}
	t.custLogger.Info(logrus.Fields{"taskID": task.ID}, "Task created successfully")

	// Slanje odgovora
	rw.WriteHeader(http.StatusCreated)
	response := map[string]string{"message": "Task created successfully"}
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
	t.logger.Printf("Received %s request for %s", h.Method, h.URL.Path)
	t.custLogger.Info(nil, fmt.Sprintf("Received %s request for %s", h.Method, h.URL.Path))

	// Preuzimanje svih zadataka iz repozitorijuma
	projects, err := t.repo.GetAllTask()
	if err != nil {
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
		errMsg := "Unable to convert to JSON: " + err.Error()
		t.logger.Fatal(errMsg)
		t.custLogger.Error(nil, errMsg)
		http.Error(rw, "Unable to convert to JSON", http.StatusInternalServerError)
		return
	}
	t.custLogger.Info(nil, "Tasks successfully converted to JSON and sent in response")
}

func (t *TasksHandler) GetAllTasksByProjectId(rw http.ResponseWriter, h *http.Request) {
	t.logger.Printf("Received %s request for %s", h.Method, h.URL.Path)
	t.custLogger.Info(nil, fmt.Sprintf("Received %s request for %s", h.Method, h.URL.Path))

	// Ekstrakcija projectID iz URL-a
	vars := mux.Vars(h)
	projectID := vars["projectId"]
	t.custLogger.Info(logrus.Fields{"projectID": projectID}, "Extracted project ID from request")

	// Preuzimanje zadataka za dati projectID
	tasks, err := t.repo.GetAllByProjectId(projectID)
	if err != nil {
		errMsg := "Database exception while fetching tasks"
		t.logger.Print(errMsg, err)
		t.custLogger.Error(logrus.Fields{"projectID": projectID}, errMsg+": "+err.Error())
		http.Error(rw, "Failed to fetch tasks", http.StatusInternalServerError)
		return
	}
	t.custLogger.Info(logrus.Fields{"projectID": projectID, "taskCount": len(tasks)}, "Tasks fetched successfully")

	// Enkodovanje zadataka u JSON i slanje odgovora
	if err := json.NewEncoder(rw).Encode(tasks); err != nil {
		errMsg := "Failed to encode response"
		t.logger.Printf("%s: %v", errMsg, err)
		t.custLogger.Error(logrus.Fields{"projectID": projectID}, errMsg+": "+err.Error())
		http.Error(rw, errMsg, http.StatusInternalServerError)
		return
	}
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

	err := t.repo.DeleteAllTasksByProjectId(projectID)
	if err != nil {
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
		userID, role, err := p.verifyTokenWithUserService(cookie.Value)
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
func (p *TasksHandler) verifyTokenWithUserService(token string) (string, string, error) {
	userServiceURL := "http://user-server:8080/validate-token"
	p.logger.Printf("Validating token with user service at %s", userServiceURL)
	p.custLogger.Info(nil, fmt.Sprintf("Sending token validation request to %s", userServiceURL))

	// Kreiranje zahteva
	reqBody := fmt.Sprintf(`{"token": "%s"}`, token)
	req, err := http.NewRequest("POST", userServiceURL, strings.NewReader(reqBody))
	if err != nil {
		p.logger.Printf("Failed to create token validation request: %v", err)
		p.custLogger.Error(nil, "Failed to create token validation request: "+err.Error())
		return "", "", err
	}
	req.Header.Set("Content-Type", "application/json")

	// Slanje zahteva
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		p.logger.Printf("Error sending token validation request: %v", err)
		p.custLogger.Error(nil, "Error sending token validation request: "+err.Error())
		return "", "", err
	}
	defer resp.Body.Close()

	// Provera statusa odgovora
	if resp.StatusCode != http.StatusOK {
		errMsg := fmt.Sprintf("Failed to validate token, status: %s", resp.Status)
		p.logger.Println(errMsg)
		p.custLogger.Warn(nil, errMsg)
		return "", "", fmt.Errorf(errMsg)
	}
	p.custLogger.Info(nil, "Token validation request successful")

	// Dekodovanje odgovora
	var result struct {
		UserID string `json:"user_id"`
		Role   string `json:"role"`
	}
	err = json.NewDecoder(resp.Body).Decode(&result)
	if err != nil {
		p.logger.Printf("Error decoding token validation response: %v", err)
		p.custLogger.Error(nil, "Error decoding token validation response: "+err.Error())
		return "", "", err
	}
	p.custLogger.Info(logrus.Fields{"userID": result.UserID, "role": result.Role}, "Token validated successfully")

	// Povratak korisničkog ID-a i uloge
	return result.UserID, result.Role, nil
}

func (t *TasksHandler) LogTaskMemberChange(rw http.ResponseWriter, h *http.Request) {
	vars := mux.Vars(h)
	taskID := vars["taskId"]
	action := vars["action"] // Can be "add" or "remove"
	userID := vars["userId"]

	if action != "add" && action != "remove" {
		http.Error(rw, "Invalid action", http.StatusBadRequest)
		return
	}

	task, err := t.repo.GetByID(taskID)
	if err != nil {
		http.Error(rw, "Task not found", http.StatusNotFound)
		t.logger.Println("Error fetching task:", err)
		return
	}

	if action == "add" {
		if !t.isUserInProject(task.ProjectID, userID) {
			http.Error(rw, "User not part of the project", http.StatusForbidden)
			return
		}

		if contains(task.UserIDs, userID) {
			http.Error(rw, "User is already a member of this task", http.StatusConflict)
			return
		}
	}

	if action == "remove" {
		if task.Status == model.Completed {
			http.Error(rw, "Cannot remove member from a completed task", http.StatusForbidden)
			return
		}

		if !contains(task.UserIDs, userID) {
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
		http.Error(rw, "Failed to log task member change", http.StatusInternalServerError)
		t.logger.Println("Error inserting task member change:", err)
		return
	}

	if action == "add" {
		task.UserIDs = append(task.UserIDs, userID)
		nc, err := Conn()
		if err != nil {
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
			log.Println("Error marshalling message:", err)
			return
		}

		err = nc.Publish(subject, jsonMessage)
		if err != nil {
			log.Println("Error publishing message to NATS:", err)
		}

		t.logger.Println("a message has been sent")
	} else if action == "remove" {
		task.UserIDs = remove(task.UserIDs, userID)
		nc, err := Conn()
		if err != nil {
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
			log.Println("Error marshalling message:", err)
			return
		}

		err = nc.Publish(subject, jsonMessage)
		if err != nil {
			log.Println("Error publishing message to NATS:", err)
		}

		t.logger.Println("a message has been sent")
	}

	err = t.repo.Update(task)
	if err != nil {
		http.Error(rw, "Failed to update task", http.StatusInternalServerError)
		t.logger.Println("Error updating task:", err)
		return
	}

	t.ProcessTaskMemberActivity()

	rw.WriteHeader(http.StatusCreated)
	fmt.Fprintf(rw, "Task member change logged and task updated successfully")
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
	activities, err := t.repo.GetUnprocessedActivities()
	if err != nil {
		t.logger.Println("Error fetching unprocessed changes:", err)
		return
	}

	for _, activity := range activities {
		task, err := t.repo.GetByID(activity.TaskID)
		if err != nil {
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
			t.logger.Println("Error updating task:", err)
			continue
		}

		err = t.repo.MarkChangeAsProcessed(activity.ID)
		if err != nil {
			t.logger.Println("Error marking change as processed:", err)
			continue
		}
	}
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
	projectServiceURL := "http://project-server:8080/projects/" + projectID + "/users/" + userID + "/check"

	resp, err := http.Get(projectServiceURL)
	if err != nil {
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
	return false
}

func (th *TasksHandler) HandleStatusUpdate(rw http.ResponseWriter, req *http.Request) {
	th.logger.Println("Received request to update task status")
	th.custLogger.Info(nil, "Received request to update task status")

	// Ekstrakcija task-a iz konteksta
	task, ok := req.Context().Value(KeyTask{}).(*model.Task)
	if !ok || task == nil {
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
		errMsg := "Failed to update task status"
		th.logger.Println(errMsg, err)
		th.custLogger.Error(logrus.Fields{"taskID": task.ID, "status": task.Status}, errMsg+": "+err.Error())
		http.Error(rw, errMsg, http.StatusInternalServerError)
		return
	}
	th.custLogger.Info(logrus.Fields{"taskID": task.ID, "status": task.Status}, "Task status updated successfully")

	// Slanje uspešnog odgovora
	rw.WriteHeader(http.StatusOK)
	th.logger.Println("Task status updated successfully")
	th.custLogger.Info(logrus.Fields{"taskID": task.ID, "status": task.Status}, "Response sent successfully")
}

func (th *TasksHandler) HandleCheckingIfUserIsInTask(rw http.ResponseWriter, r *http.Request) {
	th.logger.Println("Received request to check if user is part of the task")
	th.custLogger.Info(nil, "Received request to check if user is part of the task")

	// Ekstrakcija zadatka iz konteksta
	task, ok := r.Context().Value(KeyTask{}).(*model.Task)
	if !ok || task == nil {
		errMsg := "Task data is missing or invalid"
		th.logger.Println(errMsg)
		th.custLogger.Error(nil, errMsg)
		http.Error(rw, errMsg, http.StatusBadRequest)
		return
	}
	th.custLogger.Info(logrus.Fields{"taskID": task.ID}, "Task extracted from context successfully")

	// Ekstrakcija korisničkog ID-a iz konteksta
	id, ok := r.Context().Value(KeyId{}).(string)
	if !ok || id == "" {
		errMsg := "User ID is missing or invalid"
		th.logger.Println(errMsg)
		th.custLogger.Error(nil, errMsg)
		http.Error(rw, errMsg, http.StatusUnauthorized)
		return
	}
	th.custLogger.Info(logrus.Fields{"userID": id}, "User ID extracted from context successfully")

	// Provera da li je korisnik deo zadatka
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
}
