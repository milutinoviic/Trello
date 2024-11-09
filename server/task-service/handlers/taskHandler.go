package handlers

import (
	"context"
	"encoding/json"
	"github.com/gorilla/mux"
	"log"
	"net/http"
	"task--service/model"
	"task--service/repositories"
)

type TasksHandler struct {
	logger *log.Logger
	repo   *repositories.TaskRepository
}

type KeyTask struct{}

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
