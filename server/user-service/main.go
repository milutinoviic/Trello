package main

import (
	"context"
	"fmt"
	"github.com/gorilla/mux"
	"github.com/rs/cors"
	"log"
	"main.go/handlers"
	"main.go/repository"
	"main.go/service"
	"net/http"
	"os"
	"os/signal"
	"time"
)

func main() {
	config := loadConfig()
	timeoutContext, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	logger := log.New(os.Stdout, "[user-api] ", log.LstdFlags)
	ur, err := repository.New(timeoutContext, logger)
	if err != nil {
		logger.Fatal(err)
	}
	uc, err := repository.NewCache(logger, ur)
	us := service.NewUserService(ur, uc)
	uh := handlers.NewUserHandler(logger, us)

	r := mux.NewRouter()
	r.HandleFunc("/register", uh.Registration).Methods(http.MethodPost)
	r.HandleFunc("/members", uh.GetAllMembers).Methods(http.MethodGet)
	r.HandleFunc("/register", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK) // FOR OPTIONS METHOD
	}).Methods(http.MethodOptions)
	r.HandleFunc("/managers", uh.GetManagers).Methods(http.MethodGet)
	r.HandleFunc("/verify", uh.VerifyTokenExistence).Methods(http.MethodGet)
	r.HandleFunc("/login", uh.Login).Methods(http.MethodPost)
	r.HandleFunc("/logout", uh.Logout).Methods(http.MethodPost)

	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	handler := corsHandler.Handler(r)

	server := http.Server{
		Addr:         config["address"],
		Handler:      handler,
		IdleTimeout:  120 * time.Second,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	logger.Println("Server listening on port", config["address"])

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

func loadConfig() map[string]string {
	config := make(map[string]string)
	config["address"] = fmt.Sprintf(":%s", os.Getenv("PORT"))
	return config
}
