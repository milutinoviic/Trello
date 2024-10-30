package user_service

import (
	"context"
	"fmt"
	"github.com/gorilla/mux"
	"log"
	"main.go/handlers"
	"main.go/repository"
	"main.go/service"
	"net/http"
	"os"
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
	us := service.NewUserService(ur)
	uh := handlers.NewUserHandler(logger, us)

	r := mux.NewRouter()
	r.HandleFunc("/register", uh.Registration).Methods(http.MethodPost)

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
