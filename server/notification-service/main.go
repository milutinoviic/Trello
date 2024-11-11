package main

import (
	"context"
	"fmt"
	"github.com/gorilla/mux"
	"github.com/rs/cors"
	"log"
	"net/http"
	handler "notification-service/handlers"
	"notification-service/repository"
	"os"
	"os/signal"
	"time"
)

func main() {
	fmt.Println("Hello from notification-service")

	config := loadConfig()
	logger := log.New(os.Stdout, "NOTIFICATION-SERVICE: ", log.LstdFlags)

	timeoutContext, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	repo, err := repository.New(logger)
	if err != nil {
		logger.Fatal("Error initializing repository:", err)
	}

	repo.CreateTables()

	notificationHandler := handler.NewNotificationHandler(logger, repo)

	r := mux.NewRouter()

	r.HandleFunc("/notifications", notificationHandler.CreateNotification).Methods("POST")
	r.HandleFunc("/notifications/{id}", notificationHandler.GetNotificationByID).Methods("GET")
	r.HandleFunc("/notifications/user/{user_id}", notificationHandler.GetNotificationsByUserID).Methods("GET")
	r.HandleFunc("/notifications/{id}", notificationHandler.UpdateNotificationStatus).Methods("PUT")
	r.HandleFunc("/notifications/{id}", notificationHandler.DeleteNotification).Methods("DELETE")

	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	handler := corsHandler.Handler(r)

	server := &http.Server{
		Addr:         config["address"],
		Handler:      handler,
		IdleTimeout:  120 * time.Second,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	go func() {
		logger.Println("Server listening on", config["address"])
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Server failed: ", err)
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, os.Kill)

	sig := <-sigCh
	logger.Println("Received terminate signal, shutting down gracefully...", sig)

	if err := server.Shutdown(timeoutContext); err != nil {
		logger.Fatal("Error during graceful shutdown:", err)
	}
	logger.Println("Server gracefully stopped")
}

func loadConfig() map[string]string {
	config := make(map[string]string)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	config["address"] = fmt.Sprintf(":%s", port)

	return config
}
