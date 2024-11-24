package main

import (
	"context"
	"fmt"
	"github.com/gorilla/mux"
	"github.com/nats-io/nats.go"
	"github.com/rs/cors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"task--service/client"
	"task--service/customLogger"
	"task--service/handlers"
	"task--service/repositories"
	"time"
)

func initUserClient() client.UserClient {
	return client.NewUserClient(os.Getenv("USER_SERVICE_HOST"), os.Getenv("USER_SERVICE_PORT"))
}

func main() {

	fmt.Println("Task Service is starting...")

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

	custLogger := customLogger.GetLogger()

	timeoutContext, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	logger := log.New(os.Stdout, "[task-api] ", log.LstdFlags)
	storeLogger := log.New(os.Stdout, "[task-store] ", log.LstdFlags)

	store, err := repositories.New(timeoutContext, storeLogger)
	if err != nil {
		logger.Fatal(err)
	}
	defer store.Disconnect(timeoutContext)

	store.Ping()

	userClient := initUserClient()

	taskHandler := handlers.NewTasksHandler(logger, store, nc, userClient, custLogger)
	// subscribe to "ProjectDeleted" events to delete tasks that belong to project
	sub, err := nc.Subscribe("ProjectDeleted", func(msg *nats.Msg) {
		projectID := string(msg.Data)
		taskHandler.HandleProjectDeleted(projectID)
	})
	if err != nil {
		logger.Fatalf("Failed to subscribe to ProjectDeleted: %v", err)
	}
	defer sub.Unsubscribe()
	defer func() {
		if err := nc.Drain(); err != nil {
			logger.Printf("Error draining NATS connection: %v", err)
		}
		nc.Close()
	}()

	router := mux.NewRouter()

	router.Use(taskHandler.MiddlewareContentTypeSet)

	getRouter := router.Methods(http.MethodGet).Subrouter()
	getRouter.Handle("/tasks", taskHandler.MiddlewareExtractUserFromCookie(taskHandler.MiddlewareCheckRoles([]string{"manager", "member"}, http.HandlerFunc(taskHandler.GetAllTask))))
	getRouter.Handle("/tasks/{projectId}", taskHandler.MiddlewareExtractUserFromCookie(taskHandler.MiddlewareCheckRoles([]string{"member", "manager"}, http.HandlerFunc(taskHandler.GetAllTasksByProjectId))))
	getRouter.Handle("/tasksDetails/{projectId}", taskHandler.MiddlewareExtractUserFromCookie(taskHandler.MiddlewareCheckRoles([]string{"member", "manager"}, http.HandlerFunc(taskHandler.GetAllTasksDetailsByProjectId))))

	postPutRouter := router.Methods(http.MethodPost, http.MethodPut).Subrouter()
	postPutRouter.Handle("/tasks", taskHandler.MiddlewareExtractUserFromCookie(taskHandler.MiddlewareCheckRoles([]string{"manager"}, http.HandlerFunc(taskHandler.PostTask))))
	postPutRouter.Use(taskHandler.MiddlewareTaskDeserialization)
	router.HandleFunc("/tasks/{taskId}/members/{action}/{userId}", taskHandler.LogTaskMemberChange).Methods("POST")
	postPutRouter.Handle("/tasks/status", taskHandler.MiddlewareExtractUserFromCookie(taskHandler.MiddlewareCheckRoles([]string{"manager", "member"}, http.HandlerFunc(taskHandler.HandleStatusUpdate))))
	postPutRouter.Handle("/tasks/check", taskHandler.MiddlewareExtractUserFromCookie(taskHandler.MiddlewareCheckRoles([]string{"manager", "member"}, http.HandlerFunc(taskHandler.HandleCheckingIfUserIsInTask))))

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

	go func() {
		logger.Println("Server listening on port", port)
		err := server.ListenAndServe()
		if err != nil {
			logger.Fatal(err)
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, os.Kill)

	sig := <-sigCh
	logger.Println("Received terminate signal, shutting down...", sig)

	if err := server.Shutdown(timeoutContext); err != nil {
		logger.Fatal("Could not gracefully shutdown the server", err)
	}
	logger.Println("Server stopped successfully")
}
