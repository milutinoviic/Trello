package handler

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/gorilla/mux"
	"github.com/nats-io/nats.go"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
	"io/ioutil"
	"log"
	"main.go/customLogger"
	"main.go/model"
	"main.go/repository"
	"net/http"
	"strconv"
	"strings"
)

type KeyProduct struct{}

type WorkflowHandler struct {
	logger     *log.Logger
	repo       *repository.WorkflowRepo
	custLogger *customLogger.Logger
	tracer     trace.Tracer
	nc         *nats.Conn
}

func NewWorkflowHandler(l *log.Logger, r *repository.WorkflowRepo, custLogger *customLogger.Logger, tracer trace.Tracer, nc *nats.Conn) *WorkflowHandler {
	return &WorkflowHandler{l, r, custLogger, tracer, nc}
}

func ExtractTraceInfoMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := otel.GetTextMapPropagator().Extract(r.Context(), propagation.HeaderCarrier(r.Header))
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (w *WorkflowHandler) GetAllTasks(rw http.ResponseWriter, h *http.Request) {
	ctx, span := w.tracer.Start(h.Context(), "WorkflowHandler.GetAllTasks")
	defer span.End()
	w.custLogger.Info(nil, "Starting GetAllTasks request")

	vars := mux.Vars(h)
	limit, err := strconv.Atoi(vars["limit"])
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		w.logger.Printf("Expected integer, got: %d", limit)
		http.Error(rw, "Unable to convert limit to integer", http.StatusBadRequest)
		return
	}

	tasks, err := w.repo.GetAllNodesWithTask(ctx, limit)
	w.custLogger.Info(nil, fmt.Sprintf("Fetching tasks with limit: %d", limit))
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		w.logger.Print("Database exception: ", err)
	}

	if tasks == nil {
		w.custLogger.Warn(nil, "No tasks found")
		return
	}

	err = tasks.ToJSON(rw)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		w.custLogger.Error(nil, "Error converting tasks to JSON: "+err.Error())
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		w.logger.Fatal("Unable to convert to json :", err)
		return
	}
	span.SetStatus(codes.Ok, "")
}

func (m *WorkflowHandler) PostTask(rw http.ResponseWriter, h *http.Request) {
	m.custLogger.Info(nil, "Starting PostTask request")
	ctx, span := m.tracer.Start(h.Context(), "WorkflowHandler.PostTask")
	var task model.TaskGraph
	err := json.NewDecoder(h.Body).Decode(&task)
	if err != nil {
		m.custLogger.Error(nil, "Error decoding task: "+err.Error())
		m.logger.Println("Error decoding task:", err)
		rw.WriteHeader(http.StatusBadRequest)
		rw.Write([]byte("Invalid task format"))
		return
	}
	m.logger.Printf("Received task: %+v\n", task)

	err = m.repo.PostTask(ctx, &task)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		m.custLogger.Error(nil, "Database exception: "+err.Error())
		m.logger.Print("Database exception: ", err)
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}
	span.SetStatus(codes.Ok, "")
	m.custLogger.Info(nil, "Task successfully posted")
	rw.WriteHeader(http.StatusCreated)
}

func (w *WorkflowHandler) AddTaskAsDependency(rw http.ResponseWriter, h *http.Request) {
	ctx, span := w.tracer.Start(h.Context(), "WorkflowHandler.AddTaskAsDependency")
	defer span.End()
	w.custLogger.Info(nil, "Starting AddTaskAsDependency request")
	vars := mux.Vars(h)
	taskId := vars["taskId"]
	dependency := vars["dependencyId"]
	w.logger.Print("TaskId", taskId)
	w.logger.Print("dependencyId", dependency)
	err := w.repo.AddDependency(ctx, taskId, dependency)
	w.custLogger.Info(nil, fmt.Sprintf("TaskId: %s, DependencyId: %s", taskId, dependency))
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		w.logger.Print("Database exception: ", err)
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}
	////TODO: call task server and change blocked to true for dependecyId
	taskServiceURL := fmt.Sprintf("https://task-server:8080/tasks/%s/block", dependency)
	w.logger.Printf("Block task at %s", taskServiceURL)

	req, err := http.NewRequest("POST", taskServiceURL, strings.NewReader("{}"))
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		w.logger.Printf("Failed to create task blocked request: %v", err)
		w.custLogger.Error(nil, "Failed to create task blocked request: "+err.Error())
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}

	req.Header.Set("Content-Type", "application/json")

	client, err := createTLSClient()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		w.custLogger.Error(nil, "Failed to initialize TLS client: "+err.Error())
		w.logger.Printf("Failed to initalize tls: %v", err)
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}

	resp, err := client.Do(req)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		w.logger.Printf("Failed to call task server: %v", err)
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		span.RecordError(errors.New("Internal server error"))
		span.SetStatus(codes.Error, errors.New("Internal server error").Error())
		w.logger.Printf("Task server responded with status: %v", resp.Status)
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.custLogger.Info(nil, "Task successfully blocked")

	dependencyTaskServiceURL := fmt.Sprintf("https://task-server:8080/tasks/%s/dependency/%s", taskId, dependency)
	w.logger.Printf("Add depenedency to task at %s", dependencyTaskServiceURL)

	req2, err := http.NewRequest("POST", dependencyTaskServiceURL, strings.NewReader("{}"))
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		w.logger.Printf("Failed to create task blocked request: %v", err)
		w.custLogger.Error(nil, "Failed to create task blocked request: "+err.Error())
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}

	req2.Header.Set("Content-Type", "application/json")

	client2, err := createTLSClient()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		w.logger.Printf("Failed to initalize tls: %v", err)
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}

	resp2, err := client2.Do(req2)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		w.logger.Printf("Failed to call task server: %v", err)
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer resp2.Body.Close()

	if resp2.StatusCode != http.StatusOK {
		span.RecordError(errors.New("Internal server error"))
		span.SetStatus(codes.Error, errors.New("Internal server error").Error())
		w.custLogger.Error(nil, "Failed to call task server for dependency: "+err.Error())
		w.logger.Printf("Task server responded with status: %v", resp2.Status)
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}
	span.SetStatus(codes.Ok, "")

	w.custLogger.Info(nil, "Dependency successfully added")
	rw.WriteHeader(http.StatusCreated)
}

func (w *WorkflowHandler) MiddlewareContentTypeSet(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, h *http.Request) {
		w.logger.Println("Method [", h.Method, "] - Hit path :", h.URL.Path)

		rw.Header().Add("Content-Type", "application/json")

		next.ServeHTTP(rw, h)
	})
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

func (w *WorkflowHandler) GetTaskGraphByProject(rw http.ResponseWriter, h *http.Request) {

	w.custLogger.Info(nil, "Starting GetTaskGraphByProject request")

	vars := mux.Vars(h)
	ctx, span := w.tracer.Start(h.Context(), "WorkflowHandler.GetTaskGraphByProject")
	defer span.End()
	projectID, ok := vars["project_id"]
	if !ok {
		span.RecordError(errors.New("Missing project_id"))
		span.SetStatus(codes.Error, "Missing project_id")
		http.Error(rw, "Missing project_id in route parameters", http.StatusBadRequest)
		return
	}

	w.custLogger.Info(nil, fmt.Sprintf("Processing project_id: %s", projectID))

	objectID, err := primitive.ObjectIDFromHex(projectID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Invalid project_id format", http.StatusBadRequest)
		return
	}

	taskGraph, err := w.repo.GetTaskGraph(ctx, objectID.Hex())
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Error fetching task graph: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.custLogger.Info(nil, "Successfully fetched task graph")
	rw.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(rw).Encode(taskGraph)
	if err != nil {
		errMsg := "Error encoding response"
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		w.custLogger.Error(nil, errMsg+": "+err.Error())
		http.Error(rw, "Error encoding response: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.custLogger.Info(nil, "GetTaskGraphByProject completed successfully")
	span.SetStatus(codes.Ok, "Successfully fetched task graph")
	//rw.WriteHeader(http.StatusOK) // no need to set this when using .Encode, encode already sets statusOK
}

func (t *WorkflowHandler) HandleProjectDeleted(projectID string) {
	_, span := t.tracer.Start(context.Background(), "WorkflowHandler.HandleProjectDeleted")
	defer span.End()

	err := t.repo.UpdateAllWorkflowByProjectId(projectID, true)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		t.logger.Printf("Failed to delete workflows for project %s: %v", projectID, err)

		_ = t.nc.Publish("WorkflowsDeletionFailed", []byte(projectID))
	}
	t.logger.Printf("Successfully deleted all tasks for project %s", projectID)

	err = t.nc.Publish("WorkflowsDeleted", []byte(projectID))
	if err != nil {
		t.logger.Printf("Failed to publish TasksDeleted event for project %s: %v", projectID, err)
	}

	span.SetStatus(codes.Ok, "Successfully deleted all workflows")
}

func (t *WorkflowHandler) DeletedWorkflows(projectID string) {
	_, span := t.tracer.Start(context.Background(), "WorkflowHandler.HandleProjectDeleted")
	defer span.End()

	err := t.repo.DeleteAllWorkflowByProjectId(projectID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		t.logger.Printf("Failed to delete workflows for project %s: %v", projectID, err)

		_ = t.nc.Publish("WorkflowsDeletionFailed", []byte(projectID))
	}
	t.logger.Printf("Successfully deleted all tasks for project %s", projectID)

	err = t.nc.Publish("WorkflowsDeleted", []byte(projectID))
	if err != nil {
		t.logger.Printf("Failed to publish TasksDeleted event for project %s: %v", projectID, err)
	}

	span.SetStatus(codes.Ok, "Successfully deleted all workflows")
}

func (w *WorkflowHandler) RollbackWorkflows(ctx context.Context, projectID string) {
	_, span := w.tracer.Start(context.Background(), "WorkflowHandler.HandleProjectDeleted")
	defer span.End()

	err := w.repo.UpdateAllWorkflowByProjectId(projectID, false)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		w.logger.Printf("Failed to delete workflows for project %s: %v", projectID, err)

		_ = w.nc.Publish("WorkflowsDeletionFailed", []byte(projectID))
	}
	w.logger.Printf("Successfully deleted all tasks for project %s", projectID)

	err = w.nc.Publish("WorkflowsDeleted", []byte(projectID))
	if err != nil {
		w.logger.Printf("Failed to publish TasksDeleted event for project %s: %v", projectID, err)
	}

	span.SetStatus(codes.Ok, "Successfully deleted all workflows")
}
