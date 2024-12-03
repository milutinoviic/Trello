package main

import (
	"context"
	"fmt"
	"github.com/gorilla/mux"
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
	"time"
	"workflow-service/customLogger"
	"workflow-service/handler"
	"workflow-service/repository"
)

func main() {
	config := loadConfig()

	timeoutContext, cancel := context.WithTimeout(context.Background(), 30*time.Second)
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

	workflowHandler := handler.NewWorkflowHandler(logger, store, custLogger, tracer)

	router := mux.NewRouter()

	//router.Use(workflowHandler.MiddlewareContentTypeSet)

	//TODO: add authorization to every route
	//router.Handle("/workflow/{limit}", workflowHandler.MiddlewareExtractUserFromCookie(workflowHandler.MiddlewareCheckRoles([]string{"manager", "member"}, http.HandlerFunc(workflowHandler.GetAllTasks)))).Methods(http.MethodGet)
	router.Handle("/workflow/{limit}", http.HandlerFunc(workflowHandler.GetAllTasks)).Methods(http.MethodGet)
	router.Handle("/workflow", http.HandlerFunc(workflowHandler.PostTask)).Methods(http.MethodPost)
	router.Handle("/workflow/{taskId}/add/{addTaskId}", http.HandlerFunc(workflowHandler.AddTaskAsDependency)).Methods(http.MethodPost)

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
			semconv.ServiceNameKey.String("user-service"),
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
