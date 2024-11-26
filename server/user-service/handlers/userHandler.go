package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/eapache/go-resiliency/retrier"
	"github.com/sony/gobreaker"
	"io"
	"log"
	"main.go/data"
	"main.go/domain"
	"main.go/repository"
	"main.go/service"
	"net/http"
	"strconv"
	"time"
)

type KeyAccount struct{}

type KeyRole struct{}

type UserHandler struct {
	logger  *log.Logger
	service *service.UserService
}
type Task struct {
	Status  TaskStatus `bson:"status" json:"status"`
	UserIDs []string   `bson:"user_ids" json:"user_ids"`
}
type TaskStatus string

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

func (uh *UserHandler) MiddlewareExtractUserFromCookie(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, h *http.Request) {

		cookie, err := h.Cookie("auth_token")
		if err != nil {
			http.Error(rw, "No token found in cookie", http.StatusUnauthorized)
			uh.logger.Println("No token in cookie:", err)
			return
		}

		uh.logger.Println("Token retrieved from cookie:", cookie.Value) // Log token value

		userID, role, err := uh.service.ValidateToken(cookie.Value)
		uh.logger.Println("User ID is:", userID, "Role is:", role)

		if err != nil {
			uh.logger.Println("Token validation failed:", err)
			http.Error(rw, `{"message": "Invalid token"}`, http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(h.Context(), KeyAccount{}, userID)
		ctx = context.WithValue(ctx, KeyRole{}, role)

		h = h.WithContext(ctx)

		next.ServeHTTP(rw, h)
	})
}

func (uh *UserHandler) GetManager(rw http.ResponseWriter, h *http.Request) {
	userID, ok := h.Context().Value(KeyAccount{}).(string)
	if !ok {
		http.Error(rw, "User ID not found", http.StatusUnauthorized)
		uh.logger.Println("User ID not found in context")
		return
	}
	manager, err := uh.service.GetOne(userID)
	if err != nil {
		uh.logger.Print("Database exception: ", err)
		uh.logger.Print("Id: ", userID)
	}

	if manager == nil {
		http.Error(rw, "Manager not found", http.StatusNotFound)
		return
	}

	err = manager.ToJSON(rw)
	if err != nil {
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		uh.logger.Fatal("Unable to convert to json :", err)
		return
	}
}

func (uh *UserHandler) DeleteUser(rw http.ResponseWriter, h *http.Request) {
	userID, _ := h.Context().Value(KeyAccount{}).(string)
	manager, err := uh.service.GetOne(userID)
	if err != nil {
		uh.logger.Print("Database exception: ", err)
		uh.logger.Print("Id: ", userID)
		http.Error(rw, "Error fetching manager details", http.StatusInternalServerError)
		return
	}

	ctx, cancel := context.WithTimeout(h.Context(), 10*time.Second)
	defer cancel()

	projectServiceURL := "http://project-server:8080/projects"

	client := &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        10,
			MaxIdleConnsPerHost: 10,
			MaxConnsPerHost:     10,
		},
	}

	projectBreaker := gobreaker.NewCircuitBreaker(
		gobreaker.Settings{
			Name:        "DeleteUserProjectService",
			MaxRequests: 10,
			Timeout:     10 * time.Second,
			Interval:    0,
			ReadyToTrip: func(counts gobreaker.Counts) bool {
				return counts.ConsecutiveFailures > 2
			},
			OnStateChange: func(name string, from gobreaker.State, to gobreaker.State) {
				uh.logger.Printf("Circuit Breaker '%s' changed from '%s' to '%s'\n", name, from, to)
				if to == gobreaker.StateOpen {
					uh.logger.Printf("Circuit Breaker '%s' is OPEN due to consecutive failures\n", name)
				}
			},
			IsSuccessful: func(err error) bool {
				if err == nil {
					return true
				}
				errResp, ok := err.(domain.ErrResp)
				if _, ok := err.(domain.ErrRespTmp); ok {
					return false
				}
				return ok && errResp.StatusCode >= 400 && errResp.StatusCode < 500
			},
		},
	)

	req, err := http.NewRequestWithContext(ctx, "GET", projectServiceURL, nil)
	if err != nil {
		uh.logger.Println("Failed to create request to project-service:", err)
		http.Error(rw, "Error communicating with project service", http.StatusInternalServerError)
		return
	}

	authTokenCookie, err := h.Cookie("auth_token")
	if err == nil {
		req.AddCookie(authTokenCookie)
	} else {
		uh.logger.Println("No auth token cookie found:", err)
		http.Error(rw, "Authorization token required", http.StatusUnauthorized)
		return
	}

	var timeout time.Duration
	deadline, reqHasDeadline := ctx.Deadline()
	retrier := retrier.New(retrier.ConstantBackoff(3, 1000*time.Millisecond), retrier.WhitelistClassifier{domain.ErrRespTmp{}})

	var resp *http.Response

	retryCount := 0
	err = retrier.RunCtx(ctx, func(ctx context.Context) error {
		retryCount++
		uh.logger.Printf("Attempting project service request, attempt #%d", retryCount)

		if reqHasDeadline {
			timeout = time.Until(deadline)
		}

		_, err := projectBreaker.Execute(func() (interface{}, error) {
			if timeout > 0 {
				req.Header.Add("Timeout", strconv.Itoa(int(timeout.Milliseconds())))
			}
			resp, err = client.Do(req)
			if err != nil {
				return nil, err
			}

			if resp.StatusCode == http.StatusGatewayTimeout || resp.StatusCode == http.StatusServiceUnavailable {
				return nil, domain.ErrRespTmp{
					URL:        resp.Request.URL.String(),
					Method:     resp.Request.Method,
					StatusCode: resp.StatusCode,
				}
			}

			if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
				return nil, domain.ErrResp{
					URL:        resp.Request.URL.String(),
					Method:     resp.Request.Method,
					StatusCode: resp.StatusCode,
				}
			}

			return resp, nil
		})

		if err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		uh.logger.Println("Error during project service request:", err)
		http.Error(rw, "Error communicating with project service", http.StatusInternalServerError)
		return
	}

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusNoContent {
		var projects []service.Project
		if resp.StatusCode == http.StatusOK {
			if err := json.NewDecoder(resp.Body).Decode(&projects); err != nil {
				uh.logger.Println("Failed to decode project-service response:", err)
				http.Error(rw, "Error parsing project service response", http.StatusInternalServerError)
				return
			}
		} else {
			projects = []service.Project{}
		}

		if manager.Role == "member" {
			for _, project := range projects {
				for _, user := range project.UserIDs {
					if user == userID {
						http.Error(rw, "Member has active projects, deletion blocked", http.StatusConflict)
						return
					}
				}
			}
		}

		if uh.checkTasks(h.Context(), projects, userID, manager.Role, authTokenCookie) {
			http.Error(rw, "User has active projects, deletion blocked", http.StatusConflict)
			return
		}

		err = uh.service.Delete(userID)
		if err != nil {
			uh.logger.Println("Failed to delete user:", err)
			http.Error(rw, "Error deleting user", http.StatusInternalServerError)
			return
		}

		rw.WriteHeader(http.StatusOK)
		rw.Write([]byte("User deleted successfully"))
	} else {
		if resp.StatusCode == http.StatusGatewayTimeout || resp.StatusCode == http.StatusServiceUnavailable {
			uh.logger.Printf("Temporary error from project service (status code %d), retrying...\n", resp.StatusCode)
			http.Error(rw, "Temporary error, please try again later", http.StatusServiceUnavailable)
			return
		}

		uh.logger.Printf("Unexpected response code %d from project service\n", resp.StatusCode)
		http.Error(rw, "Error checking manager projects", http.StatusInternalServerError)
	}
}

func (uh *UserHandler) checkTasks(ctx context.Context, projects []service.Project, userID, role string, authTokenCookie *http.Cookie) bool {
	client := &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        10,
			MaxIdleConnsPerHost: 10,
			MaxConnsPerHost:     10,
		},
	}

	taskServiceBreaker := gobreaker.NewCircuitBreaker(
		gobreaker.Settings{
			Name:        "TaskServiceCircuitBreaker",
			MaxRequests: 10,
			Timeout:     10 * time.Second,
			Interval:    0 * time.Second,
			ReadyToTrip: func(counts gobreaker.Counts) bool {
				return counts.ConsecutiveFailures > 2
			},
			OnStateChange: func(name string, from gobreaker.State, to gobreaker.State) {
				log.Printf("Circuit Breaker '%s' changed from '%s' to '%s'\n", name, from, to)
			},
			IsSuccessful: func(err error) bool {
				if err == nil {
					return true
				}
				errResp, ok := err.(domain.ErrResp)
				if _, ok := err.(domain.ErrRespTmp); ok {
					return false
				}
				return ok && errResp.StatusCode >= 400 && errResp.StatusCode < 500
			},
		},
	)

	var timeout time.Duration
	deadline, reqHasDeadline := ctx.Deadline()
	classifier := retrier.WhitelistClassifier{domain.ErrRespTmp{}}
	retrier := retrier.New(retrier.ConstantBackoff(3, 1000*time.Millisecond), classifier)

	for _, project := range projects {
		taskServiceURL := fmt.Sprintf("http://task-server:8080/tasks/%s", project.ID)
		reqCtx, cancel := context.WithTimeout(ctx, 10*time.Second) // Set timeout for each request
		defer cancel()

		taskReq, err := http.NewRequestWithContext(reqCtx, "GET", taskServiceURL, nil)
		if err != nil {
			uh.logger.Println("Failed to create request to task-service:", err)
			continue
		}
		taskReq.Header.Set("Content-Type", "application/json")
		taskReq.AddCookie(authTokenCookie)

		var taskResp *http.Response

		retryCount := 0
		err = retrier.RunCtx(reqCtx, func(ctx context.Context) error {
			retryCount++
			uh.logger.Printf("Attempting task service request, attempt #%d", retryCount)
			if reqHasDeadline {
				timeout = time.Until(deadline)
			}

			_, err := taskServiceBreaker.Execute(func() (interface{}, error) {
				if timeout > 0 {
					taskReq.Header.Add("Timeout", strconv.Itoa(int(timeout.Milliseconds())))
				}
				resp, err := client.Do(taskReq)
				if err != nil {
					return nil, err
				}

				// Handle 503 and 504 responses here
				if resp.StatusCode == http.StatusServiceUnavailable || resp.StatusCode == http.StatusGatewayTimeout {
					return nil, domain.ErrRespTmp{
						URL:        resp.Request.URL.String(),
						Method:     resp.Request.Method,
						StatusCode: resp.StatusCode,
					}
				}

				if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
					return nil, domain.ErrResp{
						URL:        resp.Request.URL.String(),
						Method:     resp.Request.Method,
						StatusCode: resp.StatusCode,
					}
				}

				taskResp = resp
				return resp, nil
			})

			if err != nil {
				return err
			}

			return nil
		})

		if err != nil {
			uh.logger.Println("Error during task service request:", err)
			continue
		}
		defer taskResp.Body.Close()

		if taskResp.StatusCode == http.StatusServiceUnavailable || taskResp.StatusCode == http.StatusGatewayTimeout {
			uh.logger.Printf("Final response is 503 or 504 for project %s, terminating user deletion", project.ID)
			return true
		}

		if taskResp.StatusCode != http.StatusOK && taskResp.StatusCode != http.StatusNoContent {
			uh.logger.Printf("Unexpected response from task-service for project %s: %s", project.ID, taskResp.Status)
			continue
		}

		var tasks []Task
		if err := json.NewDecoder(taskResp.Body).Decode(&tasks); err != nil {
			uh.logger.Println("Failed to decode task-service response:", err)
			continue
		}

		if role == "manager" {
			for _, task := range tasks {
				if task.Status == "Pending" || task.Status == "InProgress" {
					return true
				}
			}
		} else {
			for _, task := range tasks {
				if task.Status == "Pending" || task.Status == "InProgress" {
					for _, id := range task.UserIDs {
						if id == userID {
							return true
						}
					}
				}
			}
		}
	}

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

	boolean, err := uh.service.VerifyRecaptcha(request.RecaptchaToken)
	if !boolean {
		if err != nil {
			http.Error(rw, err.Error(), http.StatusForbidden)
			return
		}
		http.Error(rw, "Error validating reCAPTCHA", http.StatusForbidden)
		return

	}

	id, role, token, err := uh.service.Login(request)
	if err != nil {
		uh.logger.Println("Error logging in:", err)
		http.Error(rw, `{"message": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	http.SetCookie(rw, &http.Cookie{
		Name:     "auth_token",
		Value:    token,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode, // Set SameSite policy to prevent CSRF attacks
		Path:     "/",                     // Cookie valid for the entire site
	})

	rw.Header().Set("Content-Type", "application/json")
	rw.WriteHeader(http.StatusCreated)

	response := map[string]string{
		"id":   id,
		"role": role,
	}
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
	userID, ok := h.Context().Value(KeyAccount{}).(string)
	if !ok {
		http.Error(rw, "User ID not found", http.StatusUnauthorized)
		uh.logger.Println("User ID not found in context")
		return
	}

	err := uh.service.Logout(userID)
	if err != nil {
		uh.logger.Println("Error logging out:", err)
		http.Error(rw, `{"message": "Internal Server Error"}`, http.StatusInternalServerError)
		return
	}

	http.SetCookie(rw, &http.Cookie{
		Name:     "auth_token",
		Value:    "", // Clear the value
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
		Path:     "/", // Cookie valid for the entire site
		MaxAge:   0,   // Set MaxAge to 0 to delete the cookie
	})

	rw.Header().Set("Content-Type", "application/json")
	rw.WriteHeader(http.StatusOK)

	response := map[string]string{"message": "Logged out successfully"}
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

func (uh *UserHandler) CheckPasswords(rw http.ResponseWriter, r *http.Request) {
	var req data.ChangePasswordRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(rw, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	userID, ok := r.Context().Value(KeyAccount{}).(string)
	if !ok {
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

	userID, ok := h.Context().Value(KeyAccount{}).(string)
	if !ok {
		http.Error(rw, "User ID not found", http.StatusUnauthorized)
		uh.logger.Println("User ID not found in context")
		return
	}

	err = uh.service.ChangePassword(userID, req.Password)
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
	if err != nil || req.Email == "" {
		http.Error(rw, "Invalid request body or missing email", http.StatusBadRequest)
		return
	}
	defer h.Body.Close()

	err = uh.service.RecoveryRequest(req.Email)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	rw.WriteHeader(http.StatusOK)
}

func (uh *UserHandler) HandlePasswordReset(rw http.ResponseWriter, h *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	err := json.NewDecoder(h.Body).Decode(&req)
	if err != nil {
		http.Error(rw, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer h.Body.Close()
	err = uh.service.ResettingPassword(req.Email, req.Password)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}
	rw.WriteHeader(http.StatusOK)
}

func (uh *UserHandler) HandleMagic(rw http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(rw, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()
	err = uh.service.MagicLink(req.Email)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}
	rw.WriteHeader(http.StatusOK)
}

func (uh *UserHandler) HandleMagicVerification(rw http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(rw, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()
	id, token, err := uh.service.VerifyMagic(req.Email)
	if err != nil {
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
		uh.logger.Println("Error encoding response:", err)
		http.Error(rw, `{"message": "Internal Server Error"}`, http.StatusInternalServerError)
		return
	}
	_, err = rw.Write(jsonResponse)
	if err != nil {
		uh.logger.Println("Error writing response:", err)
		http.Error(rw, `{"message": "Internal Server Error"}`, http.StatusInternalServerError)
		return
	}

}

func (uh *UserHandler) ValidateToken(rw http.ResponseWriter, h *http.Request) {
	uh.logger.Println("The path is hit")
	var req struct {
		Token string `json:"token"`
	}
	err := json.NewDecoder(h.Body).Decode(&req)
	if err != nil {
		uh.logger.Println("Error decoding request body:", err)
		http.Error(rw, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer h.Body.Close()

	userID, role, err := uh.service.ValidateToken(req.Token)
	uh.logger.Println("User ID is:", userID, "Role is:", role)

	if err != nil {
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
		uh.logger.Println("Error writing response:", err)
		http.Error(rw, "Internal Server Error", http.StatusInternalServerError)
	}
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
	uh.logger.Printf("Received %s request for %s", h.Method, h.URL.Path)

	var request data.UserIdsRequest
	err := json.NewDecoder(h.Body).Decode(&request)
	if err != nil {
		http.Error(rw, "Invalid request body", http.StatusBadRequest)
		uh.logger.Println("Error decoding user IDs:", err)
		return
	}

	userIds := request.UserIds

	users, err := uh.service.GetUsersByIds(userIds)
	if err != nil {
		uh.logger.Println("Error retrieving users:", err)
		http.Error(rw, `{"message": "`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	if users == nil || len(users) == 0 {
		http.Error(rw, "No users found", http.StatusNotFound)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	rw.WriteHeader(http.StatusOK)
	err = json.NewEncoder(rw).Encode(users)
	if err != nil {
		uh.logger.Println("Error writing response:", err)
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		return
	}
}
