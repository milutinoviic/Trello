package handler

import (
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"github.com/gorilla/mux"
	"go.opentelemetry.io/otel/trace"
	"io/ioutil"
	"log"
	"main.go/customLogger"
	"main.go/model"
	"main.go/repository"
	"net/http"
	"os"
	"strconv"
	"strings"
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
		w.logger.Print("Database exception:", err)
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}
	////TODO: call task server and change blocked to true for dependecyId
	linkToTaskService := os.Getenv("LINK_TO_TASK_SERVICE")
	taskServiceURL := fmt.Sprintf("%s/tasks/%s/block", linkToTaskService, dependency)
	w.logger.Printf("Block task at %s", taskServiceURL)

	req, err := http.NewRequest("POST", taskServiceURL, strings.NewReader("{}"))
	if err != nil {
		w.logger.Printf("Failed to create task blocked request: %v", err)
		w.custLogger.Error(nil, "Failed to create task blocked request: "+err.Error())
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}

	req.Header.Set("Content-Type", "application/json")

	client, err := createTLSClient()
	if err != nil {
		w.logger.Printf("Failed to initalize tls: %v", err)
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}

	resp, err := client.Do(req)
	if err != nil {
		w.logger.Printf("Failed to call task server: %v", err)
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		w.logger.Printf("Task server responded with status: %v", resp.Status)
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}

	//call task server to add dependecyId to task
	//linkToTaskService := os.Getenv("LINK_TO_TASK_SERVICE")
	dependencyTaskServiceURL := fmt.Sprintf("%s/tasks/%s/dependency/%s", linkToTaskService, taskId, dependency)
	w.logger.Printf("Add depenedency to task at %s", dependencyTaskServiceURL)

	req2, err := http.NewRequest("POST", dependencyTaskServiceURL, strings.NewReader("{}"))
	if err != nil {
		w.logger.Printf("Failed to create task blocked request: %v", err)
		w.custLogger.Error(nil, "Failed to create task blocked request: "+err.Error())
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}

	req2.Header.Set("Content-Type", "application/json")

	client2, err := createTLSClient()
	if err != nil {
		w.logger.Printf("Failed to initalize tls: %v", err)
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}

	resp2, err := client2.Do(req2)
	if err != nil {
		w.logger.Printf("Failed to call task server: %v", err)
		rw.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer resp2.Body.Close()

	if resp2.StatusCode != http.StatusOK {
		w.logger.Printf("Task server responded with status: %v", resp2.Status)
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
