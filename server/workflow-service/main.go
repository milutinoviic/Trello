package main

import (
	"context"
	"fmt"
	"github.com/gorilla/mux"
	"github.com/nats-io/nats.go"
	"github.com/rs/cors"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/jaeger"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	"log"
	"main.go/client"
	"main.go/customLogger"

	"main.go/handler"
	"main.go/repository"
	"net/http"
	"os"
	"os/signal"
	"time"
)

func initTaskClient() client.TaskClient {
	return client.NewTaskClient(os.Getenv("TASK_SERVICE_HOST"), os.Getenv("PORT"))
}

func main() {
	config := loadConfig()

	natsURL := os.Getenv("NATS_URL")
	if natsURL == "" {
		natsURL = "nats://nats:4222"
	}
	nc, err := nats.Connect(natsURL)
	if err != nil {
		log.Fatalf("Error connecting to NATS: %v", err)
	}
	defer nc.Close()
	defer func() {
		if err := nc.Drain(); err != nil {
			log.Printf("Error draining NATS connection: %v", err)
		}
		nc.Close()
	}()

	timeoutContext, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	logger := log.New(os.Stdout, "[workflow-api] ", log.LstdFlags)
	cfg := os.Getenv("JAEGER_ADDRESS")
	exp, err := newExporter(cfg)
	if err != nil {
		log.Fatal(err)
	}
	tp := newTraceProvider(exp)
	defer func() { _ = tp.Shutdown(timeoutContext) }()
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.TraceContext{})
	tracer := tp.Tracer("workflow-service")
	custLogger := customLogger.GetLogger()

	store, err := repository.New(logger, custLogger, tracer)
	if err != nil {
		logger.Fatal(err)
	}
	defer store.CloseDriverConnection(timeoutContext)
	store.CheckConnection()

	taskClient := initTaskClient()

	workflowHandler := handler.NewWorkflowHandler(logger, store, custLogger, tracer, nc, taskClient)

	sub, err := nc.QueueSubscribe("ProjectDeleted", "workflow-queue", func(msg *nats.Msg) {
		projectID := string(msg.Data)
		workflowHandler.HandleProjectDeleted(projectID)
	})
	if err != nil {
		logger.Fatalf("Failed to subscribe to ProjectDeleted: %v", err)
	}
	defer sub.Unsubscribe()

	sub2, err := nc.Subscribe("WorkflowsDeletionComplete", func(msg *nats.Msg) {
		projectID := string(msg.Data)
		workflowHandler.DeletedWorkflows(projectID)
	})
	if err != nil {
		logger.Fatalf("Failed to subscribe to ProjectDeleted: %v", err)
	}
	defer sub2.Unsubscribe()
	sub3, err := nc.Subscribe("TaskDeletionFailed", func(msg *nats.Msg) {
		projectID := string(msg.Data)
		timeoutContext, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		workflowHandler.RollbackWorkflows(timeoutContext, projectID)
	})
	if err != nil {
		logger.Fatalf("Failed to subscribe to ProjectDeleted: %v", err)
	}
	defer sub3.Unsubscribe()

	defer func() {
		if err := nc.Drain(); err != nil {
			logger.Printf("Error draining NATS connection: %v", err)
		}
		nc.Close()
	}()

	router := mux.NewRouter()
	router.Use(handler.ExtractTraceInfoMiddleware)

	//TODO: add authorization to every route
	//router.Handle("/workflow/{limit}", workflowHandler.MiddlewareExtractUserFromCookie(workflowHandler.MiddlewareCheckRoles([]string{"manager", "member"}, http.HandlerFunc(workflowHandler.GetAllTasks)))).Methods(http.MethodGet)
	router.Handle("/workflow/{limit}", http.HandlerFunc(workflowHandler.GetAllTasks)).Methods(http.MethodGet)
	router.Handle("/workflow", http.HandlerFunc(workflowHandler.PostTask)).Methods(http.MethodPost)
	router.Handle("/workflow/{taskId}/add/{dependencyId}", http.HandlerFunc(workflowHandler.AddTaskAsDependency)).Methods(http.MethodPost)
	router.Handle("/workflow/project/{project_id}", http.HandlerFunc(workflowHandler.GetTaskGraphByProject)).Methods(http.MethodGet)

	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	h := corsHandler.Handler(router)

	server := http.Server{
		Addr:         config["address"],
		Handler:      h,
		IdleTimeout:  120 * time.Second,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	logger.Println("Server listening on port", config["address"])

	go func() {
		err := server.ListenAndServeTLS("/app/cert.crt", "/app/privat.key")
		if err != nil {
			logger.Fatal(err)
		}
	}()

	sigCh := make(chan os.Signal)
	signal.Notify(sigCh, os.Interrupt)
	signal.Notify(sigCh, os.Kill)

	sig := <-sigCh
	logger.Println("Received terminate, graceful shutdown", sig)

	if server.Shutdown(timeoutContext) != nil {
		logger.Fatal("Cannot gracefully shutdown...")
	}
	logger.Println("Server stopped")
}

func loadConfig() map[string]string {
	config := make(map[string]string)
	config["address"] = fmt.Sprintf(":%s", os.Getenv("PORT"))
	return config
}

func newExporter(address string) (*jaeger.Exporter, error) {
	exp, err := jaeger.New(jaeger.WithCollectorEndpoint(jaeger.WithEndpoint(address)))
	if err != nil {
		return nil, err
	}
	return exp, nil
}

func newTraceProvider(exp sdktrace.SpanExporter) *sdktrace.TracerProvider {
	r, err := resource.Merge(
		resource.Default(),
		resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceNameKey.String("workflow-service"),
		),
	)
	if err != nil {
		log.Fatalf("failed to create resource: %v", err)
	}

	return sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exp),
		sdktrace.WithResource(r),
	)
}
