package handlers

import (
	"log"
	"main.go/model"
	"main.go/repository"
	"net/http"
)

type KeyAccount struct{}

type UserHandler struct {
	logger *log.Logger
	repo   *repository.UserRepository
}

func (uh *UserHandler) Register(rw http.ResponseWriter, h *http.Request) {
	account := h.Context().Value(KeyAccount{}).(*model.AccountRequest)
	err := uh.repo.Register(account)
	if err != nil {
		uh.logger.Println(err)
		http.Error(rw, err.Error(), http.StatusInternalServerError)
	}

	rw.WriteHeader(http.StatusCreated)
}
