package main

import (
	config2 "analytics-service/config"
	"analytics-service/handlers"
	"analytics-service/repository"
	"github.com/gorilla/mux"
	"github.com/rs/cors"

	"context"
	"fmt"
	"github.com/EventStore/EventStore-Client-Go/esdb"
	"log"
	"net/http"
	"os"
	"os/signal"
	"time"
)

func main() {
	fmt.Println("Hello from analytic-service")

	config := loadConfig()
	logger := log.New(os.Stdout, "ANALYTICS-SERVICE: ", log.LstdFlags)

	timeoutContext, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cfg := config2.NewConfig()

	connString := fmt.Sprintf("esdb://%s:%s@%s:%s?tls=false", cfg.ESDBUser, cfg.ESDBPass, cfg.ESDBHost, cfg.ESDBPort)
	settings, err := esdb.ParseConnectionString(connString)
	if err != nil {
		log.Fatal(err)
	}

	/*
		eventStoreConfig := &esdb.Configuration{
			Address:                     "localhost:2113", // Use TCP port (1113)
			KeepAliveInterval:           110 * time.Second,
			KeepAliveTimeout:            220 * time.Second,
			MaxDiscoverAttempts:         70,
			DisableTLS:                  true, // Ensure TLS is disabled
			SkipCertificateVerification: true, // Skip cert verification (no TLS)
		}
		log.Printf("Connecting to EventStore at address: %s", eventStoreConfig.Address)
	*/
	client, err := esdb.NewClient(settings)
	if err != nil {
		logger.Fatal("Error initializing EventStore client: ", err)
	} else {
		logger.Println("Successfully connected to EventStore!")
	}

	esdbClient, err := repository.NewESDBClient(client, "analytics-group")
	if err != nil {
		log.Fatal("Error initializing ESDBClient:", err)
	}

	eventHandler := handlers.NewEventHandler(esdbClient)
	r := mux.NewRouter()

	// Define routes with mux variables
	r.HandleFunc("/event/append", eventHandler.ProcessEventHandler).Methods("POST")   // POST method to process event
	r.HandleFunc("/events/{projectID}", eventHandler.GetEventsHandler).Methods("GET") // GET method to retrieve events

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
		if err := server.ListenAndServeTLS("/app/cert.crt", "/app/privat.key"); err != nil && err != http.ErrServerClosed {
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
