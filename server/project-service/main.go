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
	"net/http"
	"os"
	"os/signal"
	"project-service/client"
	"project-service/handlers"
	"project-service/repositories"
	"time"
)

func initUserClient() client.UserClient {
	return client.NewUserClient(os.Getenv("USER_SERVICE_HOST"), os.Getenv("USER_SERVICE_PORT"))
}
func initTaskClient() client.TaskClient {
	return client.NewTaskClient(os.Getenv("TASK_SERVICE_HOST"), os.Getenv("TASK_SERVICE_PORT"))
}

func main() {
	fmt.Print("Hello from project-service")

	natsURL := os.Getenv("NATS_URL")
	if natsURL == "" {
		natsURL = "nats://nats:4222"
	}
	nc, err := nats.Connect(natsURL)
	if err != nil {
		log.Fatalf("Error connecting to NATS: %v", err)
	}
	defer nc.Close()

	port := os.Getenv("PORT")
	if len(port) == 0 {
		port = "8080"
	}

	timeoutContext, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	logger := log.New(os.Stdout, "[product-api] ", log.LstdFlags)
	storeLogger := log.New(os.Stdout, "[project-store] ", log.LstdFlags)
	cfg := os.Getenv("JAEGER_ADDRESS")
	exp, err := newExporter(cfg)
	if err != nil {
		log.Fatalf("Jaeger exporter initialization failed: %v", err)
	} else {
		log.Println("Jaeger initialization succeeded")
	}
	log.Printf("Using JAEGER_ADDRESS: %s", cfg)
	tp := newTraceProvider(exp)
	defer func() { _ = tp.Shutdown(timeoutContext) }()
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.TraceContext{})
	tracer := tp.Tracer("project-service")
	store, err := repositories.New(timeoutContext, storeLogger, tracer)
	if err != nil {
		logger.Fatal(err)
	}
	defer store.Disconnect(timeoutContext)

	store.Ping()

	userClient := initUserClient()
	taskClient := initTaskClient()

	projectsHandler := handlers.NewProjectsHandler(logger, store, nc, tracer, userClient, taskClient)

	router := mux.NewRouter()

	router.Use(projectsHandler.MiddlewareContentTypeSet)

	getRouter := router.Methods(http.MethodGet).Subrouter()
	getRouter.HandleFunc("/", projectsHandler.GetAllProjects)
	getRouter.Handle("/projects", projectsHandler.MiddlewareExtractUserFromCookie(projectsHandler.MiddlewareCheckRoles([]string{"member", "manager"}, http.HandlerFunc(projectsHandler.GetAllProjectsByUser))))
	getRouter.HandleFunc("/projects/{id}/users/{userId}/check", projectsHandler.IsUserInProject).Methods("GET")
	getRouter.Handle("/projects/{id}/manager", projectsHandler.MiddlewareExtractUserFromCookie(projectsHandler.MiddlewareCheckRoles([]string{"manager"}, http.HandlerFunc(projectsHandler.CheckIfUserIsManager)))).Methods("GET")

	postRouter := router.Methods(http.MethodPost).Subrouter()
	postRouter.HandleFunc("/", projectsHandler.PostProject)
	postRouter.Use(projectsHandler.MiddlewarePatientDeserialization)
	router.Handle("/projects/{id}/addUsers", projectsHandler.MiddlewareExtractUserFromCookie(projectsHandler.MiddlewareCheckRoles([]string{"manager"}, http.HandlerFunc(projectsHandler.AddUsersToProject))))

	getByIdRouter := router.Methods(http.MethodGet).Subrouter()
	getByIdRouter.Handle("/{id}", projectsHandler.MiddlewareExtractUserFromCookie(projectsHandler.MiddlewareCheckRoles([]string{"member", "manager"}, http.HandlerFunc(projectsHandler.GetProjectById))))

	getDetailsByIdRouter := router.Methods(http.MethodGet).Subrouter()
	getDetailsByIdRouter.Handle("/projectDetails/{id}", projectsHandler.MiddlewareExtractUserFromCookie(projectsHandler.MiddlewareCheckRoles([]string{"member", "manager"}, http.HandlerFunc(projectsHandler.GetProjectDetailsById))))

	deleteRouter := router.Methods(http.MethodDelete).Subrouter()
	deleteRouter.Handle("/projects/{id}/users/{userId}", projectsHandler.MiddlewareExtractUserFromCookie(projectsHandler.MiddlewareCheckRoles([]string{"manager"}, http.HandlerFunc(projectsHandler.RemoveUserFromProject))))

	deleteRouter.Handle("/projects/{id}", projectsHandler.MiddlewareExtractUserFromCookie(projectsHandler.MiddlewareCheckRoles([]string{"manager"}, http.HandlerFunc(projectsHandler.DeleteProject))))

	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	handler := corsHandler.Handler(router)

	server := http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		IdleTimeout:  120 * time.Second,
		ReadTimeout:  1 * time.Second,
		WriteTimeout: 1 * time.Second,
	}

	logger.Println("Server listening on port", port)
	go func() {
		err := server.ListenAndServe()
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

func newExporter(address string) (*jaeger.Exporter, error) {
	if address == "" {
		return nil, fmt.Errorf("jaeger collector endpoint address is empty")
	}
	exp, err := jaeger.New(jaeger.WithCollectorEndpoint(jaeger.WithEndpoint(address)))
	if err != nil {
		return nil, fmt.Errorf("failed to create Jaeger exporter: %w", err)
	}
	return exp, nil
}

func newTraceProvider(exp sdktrace.SpanExporter) *sdktrace.TracerProvider {
	r, err := resource.Merge(
		resource.Default(),
		resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceNameKey.String("project-service"),
		),
	)
	if err != nil {
		log.Fatalf("failed to create resource: %v", err)
	}

	return sdktrace.NewTracerProvider(
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
		sdktrace.WithBatcher(exp),
		sdktrace.WithResource(r),
	)
}
