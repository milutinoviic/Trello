package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/gorilla/mux"
	"log"
	"net/http"
	"slices"
	"strings"
	"task--service/model"
	"task--service/repositories"
)

type TasksHandler struct {
	logger *log.Logger
	repo   *repositories.TaskRepository
}

type KeyTask struct{}
type KeyId struct{}
type KeyRole struct{}

func NewTasksHandler(l *log.Logger, r *repositories.TaskRepository) *TasksHandler {
	return &TasksHandler{l, r}
}

func (t *TasksHandler) PostTask(rw http.ResponseWriter, h *http.Request) {
	task := h.Context().Value(KeyTask{}).(*model.Task)
	err := t.repo.Insert(task)
	if err != nil {
		http.Error(rw, "Unable to create task", http.StatusInternalServerError)
		return
	}
	rw.WriteHeader(http.StatusCreated)
}

func (t *TasksHandler) GetAllTask(rw http.ResponseWriter, h *http.Request) {
	projects, err := t.repo.GetAllTask()
	if err != nil {
		t.logger.Print("Database exception: ", err)
	}

	err = projects.ToJSON(rw)
	if err != nil {
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		t.logger.Fatal("Unable to convert to json :", err)
		return
	}
}

func (t *TasksHandler) GetAllTasksByProjectId(rw http.ResponseWriter, h *http.Request) {
	vars := mux.Vars(h)
	projectID := vars["projectId"]

	tasks, err := t.repo.GetAllByProjectId(projectID)

	if err != nil {
		t.logger.Print("Database exception: ", err)
		http.Error(rw, "Failed to fetch tasks", http.StatusInternalServerError)
		return
	}

	if err := json.NewEncoder(rw).Encode(tasks); err != nil {
		http.Error(rw, "Failed to encode response", http.StatusInternalServerError)
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

func (th *TasksHandler) HandleStatusUpdate(rw http.ResponseWriter, req *http.Request) {
	th.logger.Println("Received request to update task status")

	task, ok := req.Context().Value(KeyTask{}).(*model.Task)
	if !ok || task == nil {
		http.Error(rw, "Task data is missing or invalid", http.StatusBadRequest)
		th.logger.Println("Error retrieving task from context")
		return
	}

	th.logger.Printf("Task received: %+v", task)

	err := th.repo.UpdateStatus(task)
	if err != nil {
		th.logger.Println("Failed to update task status:", err)
		http.Error(rw, "Failed to update status", http.StatusInternalServerError)
		return
	}

	rw.WriteHeader(http.StatusOK)
	th.logger.Println("Task status updated successfully")
}

func (th *TasksHandler) HandleCheckingIfUserIsInTask(rw http.ResponseWriter, r *http.Request) {
	task, ok := r.Context().Value(KeyTask{}).(*model.Task)
	if !ok || task == nil {
		http.Error(rw, "Task data is missing or invalid", http.StatusBadRequest)
		th.logger.Println("Error retrieving task from context")
		return
	}

	id, ok := r.Context().Value(KeyId{}).(string)
	if !ok || id == "" {
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
}
