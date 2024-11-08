package handlers

import (
	"context"
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
			t.logger.Fatal(err)
			return
		}

		ctx := context.WithValue(h.Context(), KeyTask{}, task)
		h = h.WithContext(ctx)

		next.ServeHTTP(rw, h)
	})
}
