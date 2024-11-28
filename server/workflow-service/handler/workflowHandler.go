package handler

import (
	"github.com/gorilla/mux"
	"go.opentelemetry.io/otel/trace"
	"log"
	"main.go/customLogger"
	"main.go/model"
	"main.go/repository"
	"net/http"
	"strconv"
)

type KeyProduct struct{}

type WorkflowHandler struct {
	logger     *log.Logger
	repo       *repository.WorkflowRepo
	custLogger *customLogger.Logger
	tracer     trace.Tracer
}

func NewWorkflowHandler(l *log.Logger, r *repository.WorkflowRepo, custLogger *customLogger.Logger, tracer trace.Tracer) *WorkflowHandler {
	return &WorkflowHandler{l, r, custLogger, tracer}
}

func (w *WorkflowHandler) GetAllTasks(rw http.ResponseWriter, h *http.Request) {
	vars := mux.Vars(h)
	limit, err := strconv.Atoi(vars["limit"])
	if err != nil {
		w.logger.Printf("Expected integer, got: %d", limit)
		http.Error(rw, "Unable to convert limit to integer", http.StatusBadRequest)
		return
	}

	tasks, err := w.repo.GetAllNodesWithTask(limit)
	if err != nil {
		w.logger.Print("Database exception: ", err)
	}

	if tasks == nil {
		return
	}

	err = tasks.ToJSON(rw)
	if err != nil {
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		w.logger.Fatal("Unable to convert to json :", err)
		return
	}
}

func (m *WorkflowHandler) PostTask(rw http.ResponseWriter, h *http.Request) {
	task := h.Context().Value(KeyProduct{}).(*model.TaskGraph)
	err := m.repo.PostTask(task)
	if err != nil {
		m.logger.Print("Database exception: ", err)
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}
	rw.WriteHeader(http.StatusCreated)
}

func (w *WorkflowHandler) AddTaskAsDependency(rw http.ResponseWriter, h *http.Request) {
	vars := mux.Vars(h)
	taskId, err := strconv.Atoi(vars["taskId"])
	dependency, err := strconv.Atoi(vars["addTaskId"])
	err = w.repo.AddDependency(taskId, dependency)
	if err != nil {
		w.logger.Print("Database exception: ", err)
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}
	rw.WriteHeader(http.StatusCreated)
}

func (w *WorkflowHandler) MiddlewareContentTypeSet(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, h *http.Request) {
		w.logger.Println("Method [", h.Method, "] - Hit path :", h.URL.Path)

		rw.Header().Add("Content-Type", "application/json")

		next.ServeHTTP(rw, h)
	})
}
