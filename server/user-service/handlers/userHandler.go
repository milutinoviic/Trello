package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"main.go/data"
	"main.go/service"
	"net/http"
)

type KeyAccount struct{}

type UserHandler struct {
	logger  *log.Logger
	service *service.UserService
}

func NewUserHandler(logger *log.Logger, service *service.UserService) *UserHandler {
	return &UserHandler{logger, service}
}

func (uh *UserHandler) Registration(rw http.ResponseWriter, h *http.Request) {
	uh.logger.Printf("Received %s request for %s", h.Method, h.URL.Path)

	request, err := decodeBody(h.Body)
	if err != nil {
		uh.logger.Printf("Error decoding request body: %v", err)
		http.Error(rw, err.Error(), http.StatusBadRequest)
		return
	}

	uh.logger.Printf("Registration request: %+v", request)

	err = uh.service.Registration(request)
	if err != nil {
		uh.logger.Println("Registration error:", err)
		if errors.Is(err, data.ErrEmailAlreadyExists()) {
			http.Error(rw, `{"message": "Email already exists"}`, http.StatusConflict)
		} else {
			http.Error(rw, `{"message": "`+err.Error()+`"}`, http.StatusInternalServerError)
		}
		return
	}

	// Prepare the success response
	rw.Header().Set("Content-Type", "application/json")
	rw.WriteHeader(http.StatusCreated)
	response := map[string]string{"message": "Registration successful"}
	err = json.NewEncoder(rw).Encode(response)
	if err != nil {
		uh.logger.Println("Error writing response:", err)
		return
	}
}

func decodeBody(r io.Reader) (*data.AccountRequest, error) {
	dec := json.NewDecoder(r)
	dec.DisallowUnknownFields()

	var c data.AccountRequest
	if err := dec.Decode(&c); err != nil {
		return nil, err
	}
	return &c, nil
}
