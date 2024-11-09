package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"main.go/data"
	"main.go/repository"
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

	rw.Header().Set("Content-Type", "application/json")
	rw.WriteHeader(http.StatusCreated)
	response := map[string]string{"message": "Registration successful"}
	err = json.NewEncoder(rw).Encode(response)
	if err != nil {
		uh.logger.Println("Error writing response:", err)
		return
	}
}

func (uh *UserHandler) GetManagers(rw http.ResponseWriter, h *http.Request) {
	managers, err := uh.service.GetAll()
	if err != nil {
		uh.logger.Print("Database exception: ", err)
	}

	if managers == nil {
		return
	}

	err = managers.ToJSON(rw)
	if err != nil {
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		uh.logger.Fatal("Unable to convert to json :", err)
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

func decodeLoginBody(r io.Reader) (*data.LoginCredentials, error) {
	dec := json.NewDecoder(r)
	dec.DisallowUnknownFields()

	var c data.LoginCredentials
	if err := dec.Decode(&c); err != nil {
		return nil, err
	}
	return &c, nil
}

func (uh *UserHandler) GetAllMembers(rw http.ResponseWriter, h *http.Request) {
	uh.logger.Printf("Received %s request for %s", h.Method, h.URL.Path)

	accounts, err := uh.service.GetAllMembers(h.Context())
	if err != nil {
		uh.logger.Println("Error retrieving members:", err)
		http.Error(rw, `{"message": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	rw.WriteHeader(http.StatusOK)
	err = json.NewEncoder(rw).Encode(accounts)
	if err != nil {
		uh.logger.Println("Error writing response:", err)
		return
	}
}

func (uh *UserHandler) VerifyTokenExistence(rw http.ResponseWriter, h *http.Request) {
	userID := h.Header.Get("X-User-ID")
	if userID == "" {
		http.Error(rw, "User ID missing", http.StatusBadRequest)
		return
	}
	repo, _ := repository.New(context.Background(), uh.logger)

	cache, err := repository.NewCache(uh.logger, repo)
	if err != nil {
		uh.logger.Println("Error initializing cache:", err)
		http.Error(rw, `{"message": "Internal Server Error"}`, http.StatusInternalServerError)
		return
	}

	exists, err := cache.VerifyToken(userID)
	if err != nil {
		uh.logger.Println("Error verifying token:", err)
		http.Error(rw, `{"message": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	if exists {
		rw.Write([]byte("true"))
	} else {
		rw.Write([]byte("false"))
	}
}

func (uh *UserHandler) Login(rw http.ResponseWriter, h *http.Request) {
	request, err := decodeLoginBody(h.Body)
	if err != nil {
		uh.logger.Println("Error decoding request:", err)
		http.Error(rw, err.Error(), http.StatusBadRequest)
		return
	}

	id, err := uh.service.Login(request)
	if err != nil {
		uh.logger.Println("Error logging in:", err)
		http.Error(rw, `{"message": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	rw.WriteHeader(http.StatusCreated)

	response := map[string]string{"id": id}
	jsonResponse, err := json.Marshal(response)
	if err != nil {
		uh.logger.Println("Error encoding response:", err)
		http.Error(rw, `{"message": "Internal Server Error"}`, http.StatusInternalServerError)
		return
	}

	_, err = rw.Write(jsonResponse)
	if err != nil {
		uh.logger.Println("Error writing response:", err)
	}
}

func (uh *UserHandler) Logout(rw http.ResponseWriter, h *http.Request) {
	body, err := io.ReadAll(h.Body)
	if err != nil {
		http.Error(rw, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer h.Body.Close()
	requestString := string(body)

	err = uh.service.Logout(requestString)
	if err != nil {
		uh.logger.Println("Error logging out:", err)
		http.Error(rw, `{"message": "Internal Server Error"}`, http.StatusInternalServerError)
	}
	rw.Header().Set("Content-Type", "application/json")
	rw.WriteHeader(http.StatusOK)
}

func (uh *UserHandler) CheckPasswords(rw http.ResponseWriter, r *http.Request) {
	var req data.ChangePasswordRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(rw, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	isPasswordCorrect := uh.service.PasswordCheck(req.Id, req.Password)
	uh.logger.Println("Password is correct:", isPasswordCorrect)

	responseString := "false"
	if isPasswordCorrect {
		responseString = "true"
	}

	rw.Header().Set("Content-Type", "text/plain")
	rw.WriteHeader(http.StatusOK)

	_, writeErr := rw.Write([]byte(responseString))
	if writeErr != nil {
		http.Error(rw, "Failed to write response", http.StatusInternalServerError)
		return
	}
}

func (uh *UserHandler) ChangePassword(rw http.ResponseWriter, h *http.Request) {
	var req data.ChangePasswordRequest
	err := json.NewDecoder(h.Body).Decode(&req)
	if err != nil {
		http.Error(rw, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer h.Body.Close()

	err = uh.service.ChangePassword(req.Id, req.Password)
	if err != nil {
		http.Error(rw, "Failed to change password", http.StatusInternalServerError)
		return
	}

	rw.WriteHeader(http.StatusOK)
}

func (uh *UserHandler) HandleRecovery(rw http.ResponseWriter, h *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	err := json.NewDecoder(h.Body).Decode(&req)
	if err != nil {
		http.Error(rw, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer h.Body.Close()
	err = uh.service.RecoveryRequest(req.Email)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
	}
	rw.WriteHeader(http.StatusOK)

}
