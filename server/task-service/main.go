package main

import (
	"context"
	"fmt"
	"github.com/gorilla/mux"
	"github.com/rs/cors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"task--service/handlers"
	"task--service/repositories"
	"time"
)

func main() {

	fmt.Println("Task Service is starting...")

	port := os.Getenv("PORT")
	if len(port) == 0 {
		port = "8080"
	}

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

	taskHandler := handlers.NewTasksHandler(logger, store)

	router := mux.NewRouter()

	router.HandleFunc("/tasks", taskHandler.PostTask).Methods(http.MethodPost)
	router.HandleFunc("/tasks", taskHandler.GetAllTask).Methods(http.MethodGet)
	router.HandleFunc("/tasks/{projectId}", taskHandler.GetAllTasksByProjectId).Methods(http.MethodGet)
	router.Use(taskHandler.MiddlewareContentTypeSet)
	router.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodPost || r.Method == http.MethodPut {
				taskHandler.MiddlewareTaskDeserialization(next).ServeHTTP(w, r)
				return
			}
			next.ServeHTTP(w, r)
		})
	})

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
