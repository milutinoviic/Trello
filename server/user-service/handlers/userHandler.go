package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/sirupsen/logrus"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	"io"
	"log"
	"main.go/customLogger"
	"main.go/data"
	"main.go/repository"
	"main.go/service"
	"net/http"
)

type KeyAccount struct{}

type KeyRole struct{}

type UserHandler struct {
	logger     *log.Logger
	service    *service.UserService
	tracer     trace.Tracer
	custLogger *customLogger.Logger
}
type Task struct {
	Status  TaskStatus `bson:"status" json:"status"`
	UserIDs []string   `bson:"user_ids" json:"user_ids"`
}
type TaskStatus string

func NewUserHandler(logger *log.Logger, service *service.UserService, tracer trace.Tracer, custLogger *customLogger.Logger) *UserHandler {
	return &UserHandler{logger, service, tracer, custLogger}
}

func (uh *UserHandler) Registration(rw http.ResponseWriter, h *http.Request) {
	uh.logger.Printf("Received %s request for %s", h.Method, h.URL.Path)
	_, span := uh.tracer.Start(context.Background(), "UserHandler.Registration")
	defer span.End()
	uh.custLogger.Info(nil, fmt.Sprintf("Received %s request for %s", h.Method, h.URL.Path))

	// Decode request body
	request, err := decodeBody(h.Body)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Printf("Error decoding request body: %v", err)
		uh.custLogger.Error(nil, "Error decoding request body: "+err.Error())
		http.Error(rw, err.Error(), http.StatusBadRequest)
		return
	}
	uh.custLogger.Info(logrus.Fields{"email": request.Email}, "Registration request body decoded successfully")

	// Process registration
	err = uh.service.Registration(request)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Registration error:", err)
		if errors.Is(err, data.ErrEmailAlreadyExists()) {
			uh.custLogger.Warn(logrus.Fields{"email": request.Email}, "Registration failed: Email already exists")
			http.Error(rw, `{"message": "Email already exists"}`, http.StatusConflict)
		} else {
			uh.custLogger.Error(logrus.Fields{"email": request.Email}, "Registration error: "+err.Error())
			http.Error(rw, `{"message": "`+err.Error()+`"}`, http.StatusInternalServerError)
		}
		return
	}
	uh.custLogger.Info(logrus.Fields{"email": request.Email}, "Registration successful")

	// Send success response
	rw.Header().Set("Content-Type", "application/json")
	rw.WriteHeader(http.StatusCreated)
	response := map[string]string{"message": "Registration successful"}
	err = json.NewEncoder(rw).Encode(response)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Error writing response:", err)
		uh.custLogger.Error(nil, "Error writing registration response: "+err.Error())
		return
	}
	span.SetStatus(codes.Ok, "Registration handled successfully")
	uh.custLogger.Info(nil, "Registration response sent successfully")
}

func (uh *UserHandler) GetManagers(rw http.ResponseWriter, h *http.Request) {
	_, span := uh.tracer.Start(context.Background(), "UserHandler.GetManagers")
	defer span.End()
	managers, err := uh.service.GetAll()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Print("Database exception: ", err)
	}

	if managers == nil {
		return
	}

	err = managers.ToJSON(rw)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		uh.logger.Fatal("Unable to convert to json :", err)
		return
	}
	span.SetStatus(codes.Ok, "Retrieving managers handled successfully")
}

func (uh *UserHandler) MiddlewareExtractUserFromCookie(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, h *http.Request) {

		// Retrieve the auth token from the cookie
		cookie, err := h.Cookie("auth_token")
		if err != nil {
			http.Error(rw, "No token found in cookie", http.StatusUnauthorized)
			uh.logger.Println("No token in cookie:", err)
			uh.custLogger.Warn(logrus.Fields{
				"error": err.Error(),
			}, "No token found in cookie")
			return
		}

		uh.logger.Println("Token retrieved from cookie:", cookie.Value) // Log token value
		uh.custLogger.Info(logrus.Fields{
			"token": cookie.Value,
		}, "Token retrieved from cookie")

		// Validate the token
		userID, role, err := uh.service.ValidateToken(cookie.Value)
		if err != nil {
			uh.logger.Println("Token validation failed:", err)
			uh.custLogger.Error(logrus.Fields{
				"token": cookie.Value,
				"error": err.Error(),
			}, "Token validation failed")
			http.Error(rw, `{"message": "Invalid token"}`, http.StatusUnauthorized)
			return
		}

		uh.logger.Println("Token validated successfully. User ID:", userID, "Role:", role)
		uh.custLogger.Info(logrus.Fields{
			"user_id": userID,
			"role":    role,
		}, "Token validated successfully mankiiiiiiiiiiii")

		// Add user ID and role to the request context
		ctx := context.WithValue(h.Context(), KeyAccount{}, userID)
		ctx = context.WithValue(ctx, KeyRole{}, role)

		// Update the request with the new context
		h = h.WithContext(ctx)

		// Call the next handler
		next.ServeHTTP(rw, h)
	})
}

func (uh *UserHandler) GetManager(rw http.ResponseWriter, h *http.Request) {
	_, span := uh.tracer.Start(context.Background(), "UserHandler.GetManager")
	defer span.End()
	userID, ok := h.Context().Value(KeyAccount{}).(string)
	if !ok {
		span.RecordError(errors.New("user id not found"))
		span.SetStatus(codes.Error, errors.New("user id not found").Error())
		http.Error(rw, "User ID not found", http.StatusUnauthorized)
		uh.logger.Println("User ID not found in context")
		return
	}
	_, findOneSpan := uh.tracer.Start(context.Background(), "UserHandler.GetManager.FindOne")
	manager, err := uh.service.GetOne(userID)
	findOneSpan.End()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Print("Database exception: ", err)
		uh.logger.Print("Id: ", userID)
	}

	if manager == nil {
		span.RecordError(errors.New("manager not found"))
		span.SetStatus(codes.Error, errors.New("manager not found").Error())
		http.Error(rw, "Manager not found", http.StatusNotFound)
		return
	}

	err = manager.ToJSON(rw)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		uh.logger.Fatal("Unable to convert to json :", err)
		return
	}
	span.SetStatus(codes.Ok, "Manager retrieval handled successfully")
}

func (uh *UserHandler) DeleteUser(rw http.ResponseWriter, h *http.Request) {
	_, span := uh.tracer.Start(context.Background(), "UserHandler.DeleteUser")
	defer span.End()
	userID, _ := h.Context().Value(KeyAccount{}).(string)
	manager, err := uh.service.GetOne(userID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Print("Database exception: ", err)
		uh.logger.Print("Id: ", userID)
		http.Error(rw, "Error fetching manager details", http.StatusInternalServerError)
		return
	}

	projectServiceURL := "http://project-server:8080/projects"
	req, err := http.NewRequest("GET", projectServiceURL, nil)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Failed to create request to project-service:", err)
		http.Error(rw, "Error communicating with project service", http.StatusInternalServerError)
		return
	}
	authTokenCookie, err := h.Cookie("auth_token")
	if err == nil {
		req.AddCookie(authTokenCookie)
	} else {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("No auth token cookie found:", err)
		http.Error(rw, "Authorization token required", http.StatusUnauthorized)
		return
	}
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Failed to reach project-service:", err)
		http.Error(rw, "Error reaching project service", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var projects []service.Project
	if resp.StatusCode == http.StatusNotFound {
		span.RecordError(errors.New("not found"))
		span.SetStatus(codes.Error, errors.New("not found").Error())
		uh.logger.Println("No active projects found, proceeding with deletion.")
	} else if resp.StatusCode != http.StatusOK {
		span.RecordError(errors.New("error checking manager projects"))
		span.SetStatus(codes.Error, errors.New("error checking manager projects").Error())
		uh.logger.Printf("Unexpected response from project-service: %s", resp.Status)
		http.Error(rw, "Error checking manager projects", http.StatusInternalServerError)
		return
	} else { // if found projects, check if project has all completed tasks
		if err := json.NewDecoder(resp.Body).Decode(&projects); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			uh.logger.Println("Failed to decode project-service response:", err)
			http.Error(rw, "Error parsing project service response", http.StatusInternalServerError)
			return
		}
		if manager.Role == "member" { // check if member is part of project, if so don`t delete account
			for _, project := range projects {
				for _, user := range project.UserIDs {
					if user == userID {
						span.RecordError(errors.New("Member has active projects, deletion blocked"))
						span.SetStatus(codes.Error, errors.New("Member has active projects, deletion blocked").Error())
						http.Error(rw, "Member has active projects, deletion blocked", http.StatusConflict)
						return
					}
				}
			}

		}
		if uh.checkTasks(projects, userID, manager.Role, authTokenCookie) {
			span.RecordError(errors.New("User has active projects, deletion blocked"))
			span.SetStatus(codes.Error, errors.New("User has active projects, deletion blocked").Error())
			http.Error(rw, "User has active projects, deletion blocked", http.StatusConflict)
			return
		}
	}

	err = uh.service.Delete(userID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Failed to delete manager:", err)
		http.Error(rw, "Error deleting user", http.StatusInternalServerError)
		return
	}

	rw.WriteHeader(http.StatusOK)
	rw.Write([]byte("User deleted successfully"))
	span.SetStatus(codes.Ok, "User deleted successfully")

}

func (uh *UserHandler) checkTasks(projects []service.Project, userID, role string, authTokenCookie *http.Cookie) bool {
	_, span := uh.tracer.Start(context.Background(), "UserHandler.checkTasks")
	defer span.End()
	client := &http.Client{}
	for _, project := range projects {
		taskServiceURL := fmt.Sprintf("http://task-server:8080/tasks/%s", project.ID)
		taskReq, err := http.NewRequest("GET", taskServiceURL, nil)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			uh.logger.Println("Failed to create request to task-service:", err)
			continue
		}
		taskReq.Header.Set("Content-Type", "application/json")
		taskReq.AddCookie(authTokenCookie)

		taskResp, err := client.Do(taskReq)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			uh.logger.Println("Failed to reach task-service:", err)
			continue
		}
		defer taskResp.Body.Close()

		if taskResp.StatusCode != http.StatusOK {
			span.RecordError(errors.New("Unexpected response from task-service"))
			span.SetStatus(codes.Error, errors.New("Unexpected response from task-service").Error())
			uh.logger.Printf("Unexpected response from task-service for project %s: %s", project.ID, taskResp.Status)
			continue
		}

		var tasks []Task
		if err := json.NewDecoder(taskResp.Body).Decode(&tasks); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			uh.logger.Println("Failed to decode task-service response:", err)
			continue
		}

		if role == "manager" { // if user is manager check if the project he made has tasks with status: pending/inProgress
			for _, task := range tasks {
				if task.Status == "Pending" || task.Status == "InProgress" {
					return true
				}

			}
		} else { // if member check if he is added to task with status pending/inProgress
			for _, task := range tasks {
				if task.Status == "Pending" || task.Status == "InProgress" {
					for _, id := range task.UserIDs {
						if id == userID {
							span.SetStatus(codes.Ok, "Checking task handled correctly.")
							return true
						}
					}
				}
			}
		}

	}
	span.SetStatus(codes.Ok, "Checking task handled correctly.")
	return false
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
	_, span := uh.tracer.Start(context.Background(), "UserHandler.GetAllMembers")
	defer span.End()
	uh.logger.Printf("Received %s request for %s", h.Method, h.URL.Path)

	accounts, err := uh.service.GetAllMembers(h.Context())
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Error retrieving members:", err)
		http.Error(rw, `{"message": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	rw.WriteHeader(http.StatusOK)
	err = json.NewEncoder(rw).Encode(accounts)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Error writing response:", err)
		return
	}
	span.SetStatus(codes.Ok, "Successfully retrieved members")
}

func (uh *UserHandler) VerifyTokenExistence(rw http.ResponseWriter, h *http.Request) {
	_, span := uh.tracer.Start(context.Background(), "UserHandler.VerifyTokenExistence")
	defer span.End()
	userID := h.Header.Get("X-User-ID")
	if userID == "" {
		span.RecordError(errors.New("user id is missing"))
		span.SetStatus(codes.Error, "user id is missing")
		http.Error(rw, "User ID missing", http.StatusBadRequest)
		return
	}
	repo, _ := repository.New(context.Background(), uh.logger, uh.custLogger, uh.tracer)

	cache, err := repository.NewCache(uh.logger, repo, uh.tracer)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Error initializing cache:", err)
		http.Error(rw, `{"message": "Internal Server Error"}`, http.StatusInternalServerError)
		return
	}

	exists, err := cache.VerifyToken(userID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Error verifying token:", err)
		http.Error(rw, `{"message": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	if exists {
		rw.Write([]byte("true"))
	} else {
		rw.Write([]byte("false"))
	}
	span.SetStatus(codes.Ok, "Verification handled successfully")
}

func (uh *UserHandler) Login(rw http.ResponseWriter, h *http.Request) {
	_, span := uh.tracer.Start(context.Background(), "UserHandler.Login")
	defer span.End()
	uh.logger.Println("Processing login request")
	uh.custLogger.Info(nil, "Processing login request")

	// Decode the login request body
	request, err := decodeLoginBody(h.Body)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Error decoding request:", err)
		uh.custLogger.Error(nil, "Error decoding request: "+err.Error())
		http.Error(rw, err.Error(), http.StatusBadRequest)
		return
	}
	uh.custLogger.Info(logrus.Fields{}, "Login request decoded successfully")

	// Verify reCAPTCHA
	boolean, err := uh.service.VerifyRecaptcha(request.RecaptchaToken)
	if !boolean {
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			uh.logger.Println("Error verifying reCAPTCHA:", err)
			uh.custLogger.Error(nil, "Error verifying reCAPTCHA: "+err.Error())
			http.Error(rw, err.Error(), http.StatusForbidden)
			return
		}
		uh.logger.Println("reCAPTCHA validation failed")
		uh.custLogger.Warn(nil, "reCAPTCHA validation failed")
		http.Error(rw, "Error validating reCAPTCHA", http.StatusForbidden)
		return
	}
	uh.custLogger.Info(nil, "reCAPTCHA verified successfully")

	// Process login
	id, role, token, err := uh.service.Login(request)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Error logging in:", err)
		uh.custLogger.Error(logrus.Fields{
			"user_email": request.Email,
		}, "Error logging in: "+err.Error())
		http.Error(rw, `{"message": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}
	uh.custLogger.Info(logrus.Fields{
		"user_id": id,
		"role":    role,
	}, "Login successful")

	// Set auth token cookie
	http.SetCookie(rw, &http.Cookie{
		Name:     "auth_token",
		Value:    token,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode, // Set SameSite policy to prevent CSRF attacks
		Path:     "/",                     // Cookie valid for the entire site
	})
	uh.custLogger.Info(logrus.Fields{
		"token": "auth_token_set",
	}, "Authentication token set in cookie")

	// Send success response
	rw.Header().Set("Content-Type", "application/json")
	rw.WriteHeader(http.StatusCreated)

	response := map[string]string{
		"id":   id,
		"role": role,
	}
	jsonResponse, err := json.Marshal(response)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Error encoding response:", err)
		uh.custLogger.Error(nil, "Error encoding response: "+err.Error())
		http.Error(rw, `{"message": "Internal Server Error"}`, http.StatusInternalServerError)
		return
	}

	_, err = rw.Write(jsonResponse)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Error writing response:", err)
		uh.custLogger.Error(nil, "Error writing response: "+err.Error())
	}
	span.SetStatus(codes.Ok, "Successfully logged in")
	uh.logger.Println("Login response sent successfully")
	uh.custLogger.Info(nil, "Login response sent successfully")
}

func (uh *UserHandler) Logout(rw http.ResponseWriter, h *http.Request) {
	_, span := uh.tracer.Start(context.Background(), "UserHandler.Logout")
	defer span.End()
	// Dohvatanje User ID iz konteksta
	userID, ok := h.Context().Value(KeyAccount{}).(string)
	if !ok {
		span.RecordError(errors.New("user id not found"))
		span.SetStatus(codes.Error, "user id not found")
		http.Error(rw, "User ID not found", http.StatusUnauthorized)
		uh.logger.Println("User ID not found in context")
		uh.custLogger.Warn(nil, "User ID not found in context")
		return
	}
	uh.custLogger.Info(logrus.Fields{"user_id": userID}, "Processing logout request")

	// Poziv servisa za logout
	err := uh.service.Logout(userID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Error logging out:", err)
		uh.custLogger.Error(logrus.Fields{"user_id": userID}, "Error logging out: "+err.Error())
		http.Error(rw, `{"message": "Internal Server Error"}`, http.StatusInternalServerError)
		return
	}
	uh.custLogger.Info(logrus.Fields{"user_id": userID}, "User logged out successfully")

	// Brisanje auth tokena
	http.SetCookie(rw, &http.Cookie{
		Name:     "auth_token",
		Value:    "", // Brisanje vrednostiiiii
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
		Path:     "/", // Cookie važi za cijeliiiii
		MaxAge:   0,   // MaxAge 0 za brisanje cookie-jaaaaaa
	})
	uh.custLogger.Info(logrus.Fields{"user_id": userID}, "Authentication token cleared in cookie")

	// Slanje uspešnog odgovora
	rw.Header().Set("Content-Type", "application/json")
	rw.WriteHeader(http.StatusOK)

	response := map[string]string{"message": "Logged out successfully"}
	jsonResponse, err := json.Marshal(response)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Error encoding response:", err)
		uh.custLogger.Error(logrus.Fields{"user_id": userID}, "Error encoding logout response: "+err.Error())
		http.Error(rw, `{"message": "Internal Server Error"}`, http.StatusInternalServerError)
		return
	}

	_, err = rw.Write(jsonResponse)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Error writing response:", err)
		uh.custLogger.Error(logrus.Fields{"user_id": userID}, "Error writing logout response: "+err.Error())
	}
	span.SetStatus(codes.Ok, "Successfully logged out")
	uh.logger.Println("Logout response sent successfully")
	uh.custLogger.Info(logrus.Fields{"user_id": userID}, "Logout response sent successfully")
}

func (uh *UserHandler) CheckPasswords(rw http.ResponseWriter, r *http.Request) {
	_, span := uh.tracer.Start(context.Background(), "UserHandler.CheckPasswords")
	defer span.End()
	var req data.ChangePasswordRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	userID, ok := r.Context().Value(KeyAccount{}).(string)
	if !ok {
		span.RecordError(errors.New("user id not found"))
		span.SetStatus(codes.Error, "user id not found")
		http.Error(rw, "User ID not found", http.StatusUnauthorized)
		uh.logger.Println("User ID not found in context")
		return
	}

	isPasswordCorrect := uh.service.PasswordCheck(userID, req.Password)
	uh.logger.Println("Password is correct:", isPasswordCorrect)

	responseString := "false"
	if isPasswordCorrect {
		responseString = "true"
	}

	rw.Header().Set("Content-Type", "text/plain")
	rw.WriteHeader(http.StatusOK)

	_, writeErr := rw.Write([]byte(responseString))
	if writeErr != nil {
		span.RecordError(writeErr)
		span.SetStatus(codes.Error, writeErr.Error())
		http.Error(rw, "Failed to write response", http.StatusInternalServerError)
		return
	}
	span.SetStatus(codes.Ok, "Successfully checked passwords")
}

func (uh *UserHandler) ChangePassword(rw http.ResponseWriter, h *http.Request) {
	_, span := uh.tracer.Start(context.Background(), "UserHandler.ChangePassword")
	defer span.End()
	uh.custLogger.Info(nil, "Processing change password request")

	// Parsiranje zahteva
	var req data.ChangePasswordRequest
	err := json.NewDecoder(h.Body).Decode(&req)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Invalid request body", http.StatusBadRequest)
		uh.logger.Println("Invalid request body:", err)
		uh.custLogger.Error(nil, "Invalid request body: "+err.Error())
		return
	}
	defer h.Body.Close()
	uh.custLogger.Info(nil, "Request body decoded successfully")

	// Dohvatanje korisničkog ID-a iz konteksta
	userID, ok := h.Context().Value(KeyAccount{}).(string)
	if !ok {
		span.RecordError(errors.New("user id not found"))
		span.SetStatus(codes.Error, "user id not found")
		http.Error(rw, "User ID not found", http.StatusUnauthorized)
		uh.logger.Println("User ID not found in context")
		uh.custLogger.Warn(nil, "User ID not found in context")
		return
	}
	uh.custLogger.Info(logrus.Fields{"user_id": userID}, "User ID retrieved from context")

	// Promena lozinke
	err = uh.service.ChangePassword(userID, req.Password)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Failed to change password", http.StatusInternalServerError)
		uh.logger.Println("Failed to change password:", err)
		uh.custLogger.Error(logrus.Fields{"user_id": userID}, "Failed to change password: "+err.Error())
		return
	}
	uh.custLogger.Info(logrus.Fields{"user_id": userID}, "Password changed successfully")

	// Uspešan odgovor
	rw.WriteHeader(http.StatusOK)
	span.SetStatus(codes.Ok, "Successfully changed password")
	uh.custLogger.Info(logrus.Fields{"user_id": userID}, "Change password response sent successfully")
}

func (uh *UserHandler) HandleRecovery(rw http.ResponseWriter, h *http.Request) {
	_, span := uh.tracer.Start(context.Background(), "UserHandler.HandleRecovery")
	defer span.End()
	var req struct {
		Email string `json:"email"`
	}

	err := json.NewDecoder(h.Body).Decode(&req)
	if err != nil || req.Email == "" {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Invalid request body or missing email", http.StatusBadRequest)
		return
	}
	defer h.Body.Close()

	err = uh.service.RecoveryRequest(req.Email)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	rw.WriteHeader(http.StatusOK)
	span.SetStatus(codes.Ok, "Successfully handled recovery request")
}

func (uh *UserHandler) HandlePasswordReset(rw http.ResponseWriter, h *http.Request) {
	_, span := uh.tracer.Start(context.Background(), "UserHandler.HandlePasswordReset")
	defer span.End()
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	err := json.NewDecoder(h.Body).Decode(&req)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer h.Body.Close()
	err = uh.service.ResettingPassword(req.Email, req.Password)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}
	rw.WriteHeader(http.StatusOK)
	span.SetStatus(codes.Ok, "Successfully handled password reset request")
}

func (uh *UserHandler) HandleMagic(rw http.ResponseWriter, r *http.Request) {
	_, span := uh.tracer.Start(context.Background(), "UserHandler.HandleMagic")
	defer span.End()
	var req struct {
		Email string `json:"email"`
	}
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()
	err = uh.service.MagicLink(req.Email)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}
	rw.WriteHeader(http.StatusOK)
	span.SetStatus(codes.Ok, "Successfully handled magic request")
}

func (uh *UserHandler) HandleMagicVerification(rw http.ResponseWriter, r *http.Request) {
	_, span := uh.tracer.Start(context.Background(), "UserHandler.HandleMagicVerification")
	defer span.End()
	var req struct {
		Email string `json:"email"`
	}
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()
	id, token, err := uh.service.VerifyMagic(req.Email)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	http.SetCookie(rw, &http.Cookie{
		Name:     "auth_token",
		Value:    token,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode, // Prevents CSRF attacks
		Path:     "/",
	})

	rw.WriteHeader(http.StatusOK)
	rw.Header().Set("Content-Type", "application/json")

	jsonResponse, err := json.Marshal(id)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Error encoding response:", err)
		http.Error(rw, `{"message": "Internal Server Error"}`, http.StatusInternalServerError)
		return
	}
	_, err = rw.Write(jsonResponse)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Error writing response:", err)
		http.Error(rw, `{"message": "Internal Server Error"}`, http.StatusInternalServerError)
		return
	}
	span.SetStatus(codes.Ok, "Successfully logged in")

}

func (uh *UserHandler) ValidateToken(rw http.ResponseWriter, h *http.Request) {
	_, span := uh.tracer.Start(context.Background(), "UserHandler.ValidateToken")
	defer span.End()
	uh.logger.Println("The path is hit")
	var req struct {
		Token string `json:"token"`
	}
	err := json.NewDecoder(h.Body).Decode(&req)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Error decoding request body:", err)
		http.Error(rw, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer h.Body.Close()

	userID, role, err := uh.service.ValidateToken(req.Token)
	uh.logger.Println("User ID is:", userID, "Role is:", role)

	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Token validation failed:", err)
		http.Error(rw, `{"message": "Invalid token"}`, http.StatusUnauthorized)
		return
	}

	response := map[string]string{
		"user_id": userID,
		"role":    role,
	}
	rw.Header().Set("Content-Type", "application/json")
	rw.WriteHeader(http.StatusOK)
	err = json.NewEncoder(rw).Encode(response)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Error writing response:", err)
		http.Error(rw, "Internal Server Error", http.StatusInternalServerError)
	}
	span.SetStatus(codes.Ok, "Successfully validated token")
}

func (uh *UserHandler) MiddlewareCheckRoles(allowedRoles []string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, h *http.Request) {
		role, ok := h.Context().Value(KeyRole{}).(string)
		if !ok {
			http.Error(rw, "Forbidden", http.StatusForbidden)
			uh.logger.Println("Role not found in context")
			return
		}

		allowed := false
		for _, r := range allowedRoles {
			if role == r {
				allowed = true
				break
			}
		}

		if !allowed {
			http.Error(rw, "Forbidden", http.StatusForbidden)
			uh.logger.Println("Role validation failed: missing permissions")
			return
		}

		next.ServeHTTP(rw, h)
	})
}

func (uh *UserHandler) MiddlewareCheckAuthenticated(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {

		cookie, err := r.Cookie("auth_token")
		if err == nil && cookie != nil {
			_, _, err := uh.service.ValidateToken(cookie.Value)
			if err == nil {
				http.Error(rw, "You are already logged in", http.StatusForbidden)
				uh.logger.Println("User is already authenticated. Forbidden access.")
				return
			}
		}

		next.ServeHTTP(rw, r)
	})
}

func (uh *UserHandler) GetUsersByIds(rw http.ResponseWriter, h *http.Request) {
	_, span := uh.tracer.Start(context.Background(), "UserHandler.GetUsersByIds")
	defer span.End()
	uh.logger.Printf("Received %s request for %s", h.Method, h.URL.Path)

	var request data.UserIdsRequest
	err := json.NewDecoder(h.Body).Decode(&request)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Invalid request body", http.StatusBadRequest)
		uh.logger.Println("Error decoding user IDs:", err)
		return
	}

	userIds := request.UserIds

	users, err := uh.service.GetUsersByIds(userIds)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Error retrieving users:", err)
		http.Error(rw, `{"message": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	if users == nil || len(users) == 0 {
		span.RecordError(errors.New("User not found"))
		span.SetStatus(codes.Error, "User not found")
		http.Error(rw, "No users found", http.StatusNotFound)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	rw.WriteHeader(http.StatusOK)
	err = json.NewEncoder(rw).Encode(users)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Error writing response:", err)
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		return
	}
	span.SetStatus(codes.Ok, " users found")
}

func (uh *UserHandler) HandleGettingRole(rw http.ResponseWriter, h *http.Request) {
	_, span := uh.tracer.Start(context.Background(), "UserHandler.HandleGettingRole")
	defer span.End()

	type RequestPayload struct {
		Email string `json:"email"`
	}

	var payload RequestPayload
	err := json.NewDecoder(h.Body).Decode(&payload)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Invalid request body")
		http.Error(rw, "Invalid request body", http.StatusBadRequest)
		return
	}

	if payload.Email == "" {
		span.RecordError(errors.New("email is required"))
		span.SetStatus(codes.Error, "Email is required")
		http.Error(rw, "Email is required", http.StatusBadRequest)
		return
	}

	role, err := uh.service.GetRoleByEmail(payload.Email)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "There has been an error", http.StatusInternalServerError)
		return
	}

	rw.WriteHeader(http.StatusOK)
	rw.Header().Set("Content-Type", "application/json")
	rw.WriteHeader(http.StatusOK)
	err = json.NewEncoder(rw).Encode(role)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Error writing response:", err)
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
	}
	span.SetStatus(codes.Ok, " role found")

}
