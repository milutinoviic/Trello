package user_service

import (
	"context"
	"fmt"
	gorillaHandlers "github.com/gorilla/handlers"
	"github.com/gorilla/mux"
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

	port := os.Getenv("PORT")
	if len(port) == 0 {
		port = "8080"
	}

	config := loadConfig()
	timeoutContext, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	logger := log.New(os.Stdout, "[user-api] ", log.LstdFlags)
	ur, err := repository.New(timeoutContext, logger)
	if err != nil {
		logger.Fatal(err)
	}
	us := service.NewUserService(ur)
	uh := handlers.NewUserHandler(logger, us)

	r := mux.NewRouter()
	r.HandleFunc("/register", uh.Registration).Methods(http.MethodPost)

	cors := gorillaHandlers.CORS(gorillaHandlers.AllowedOrigins([]string{"*"}))

	//Initialize the server
	server := http.Server{
		Addr:         ":" + port,
		Handler:      cors(r),
		IdleTimeout:  120 * time.Second,
		ReadTimeout:  1 * time.Second,
		WriteTimeout: 1 * time.Second,
	}
	go func() {
		err := server.ListenAndServe()
		if err != nil {
			logger.Fatal(err)
		}
	}()

	logger.Println("Server listening on port", port)

	sigCh := make(chan os.Signal)
	signal.Notify(sigCh, os.Interrupt)
	signal.Notify(sigCh, os.Kill)

	//shutdown gracefully
	if server.Shutdown(timeoutContext) != nil {
		logger.Fatal("Cannot gracefully shutdown...")
	}
	logger.Println("Server stopped")

	srv := &http.Server{
		Handler: r,
		Addr:    config["address"],
	}
	log.Fatal(srv.ListenAndServe())
}

func loadConfig() map[string]string {
	config := make(map[string]string)
	config["host"] = os.Getenv("HOST")
	config["port"] = os.Getenv("PORT")
	config["address"] = fmt.Sprintf(":%s", os.Getenv("PORT"))
	config["db_host"] = os.Getenv("DB_HOST")
	config["db_port"] = os.Getenv("DB_PORT")
	config["db_user"] = os.Getenv("DB_USER")
	config["db_pass"] = os.Getenv("DB_PASS")
	config["db_name"] = os.Getenv("DB_NAME")
	config["conn_service_address"] = fmt.Sprintf("http://%s:%s", os.Getenv("CONNECTIONS_SERVICE_HOST"), os.Getenv("CONNECTIONS_SERVICE_PORT"))
	return config
}
