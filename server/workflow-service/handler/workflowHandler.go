package handler

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.opentelemetry.io/otel/codes"
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
	var task model.TaskGraph
	err := json.NewDecoder(h.Body).Decode(&task)
	if err != nil {
		m.logger.Println("Error decoding task:", err)
		rw.WriteHeader(http.StatusBadRequest)
		rw.Write([]byte("Invalid task format"))
		return
	}
	m.logger.Printf("Received task: %+v\n", task)

	err = m.repo.PostTask(&task)
	if err != nil {
		m.logger.Print("Database exception: ", err)
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}
	rw.WriteHeader(http.StatusCreated)
}

func (w *WorkflowHandler) AddTaskAsDependency(rw http.ResponseWriter, h *http.Request) {
	vars := mux.Vars(h)
	taskId := vars["taskId"]
	dependency := vars["dependencyId"]
	w.logger.Print("TaskId", taskId)
	w.logger.Print("dependencyId", dependency)
	err := w.repo.AddDependency(taskId, dependency)
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

func (w *WorkflowHandler) GetTaskGraphByProject(rw http.ResponseWriter, h *http.Request) {
	vars := mux.Vars(h)
	_, span := w.tracer.Start(context.Background(), "WorkflowHandler.GetTaskGraphByProject")
	defer span.End()
	projectID, ok := vars["project_id"]
	if !ok {
		span.RecordError(errors.New("Missing project_id"))
		span.SetStatus(codes.Error, "Missing project_id")
		http.Error(rw, "Missing project_id in route parameters", http.StatusBadRequest)
		return
	}

	objectID, err := primitive.ObjectIDFromHex(projectID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Invalid project_id format", http.StatusBadRequest)
		return
	}

	taskGraph, err := w.repo.GetTaskGraph(objectID.Hex())
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Error fetching task graph: "+err.Error(), http.StatusInternalServerError)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(rw).Encode(taskGraph)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Error encoding response: "+err.Error(), http.StatusInternalServerError)
		return
	}
	span.SetStatus(codes.Ok, "Successfully fetched task graph")
	//rw.WriteHeader(http.StatusOK) // no need to set this when using .Encode, encode already sets statusOK
}
