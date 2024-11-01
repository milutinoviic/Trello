package handlers

import (
	"encoding/json"
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
		log.Printf("Error decoding request body: %v", err)
		http.Error(rw, err.Error(), http.StatusBadRequest)
		return
	}

	err = uh.service.Registration(request)
	if err != nil {
		uh.logger.Println(err)
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	rw.WriteHeader(http.StatusCreated)
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
