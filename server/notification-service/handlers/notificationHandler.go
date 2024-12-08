package handler

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/eapache/go-resiliency/retrier"
	"github.com/gocql/gocql"
	"github.com/gorilla/mux"
	"github.com/nats-io/nats.go"
	"github.com/sony/gobreaker"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	"log"
	"net/http"
	"notification-service/customLogger"
	"notification-service/domain"
	"notification-service/model"
	"notification-service/repository"
	"os"
	"strconv"
	"strings"
	"time"
)

type KeyProduct struct{} // Context key for storing user data
type KeyRole struct{}

type NotificationHandler struct {
	logger     *log.Logger
	repo       *repository.NotificationRepo
	custLogger *customLogger.Logger
	tracer     trace.Tracer
}

func NewNotificationHandler(l *log.Logger, r *repository.NotificationRepo, custLogger *customLogger.Logger, tracer trace.Tracer) *NotificationHandler {
	return &NotificationHandler{l, r, custLogger, tracer}
}

// Middleware to extract user ID from HTTP-only cookie and validate it
func (n *NotificationHandler) MiddlewareExtractUserFromCookie(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, h *http.Request) {
		n.custLogger.Info(nil, "Starting MiddlewareExtractUserFromCookie")
		cookie, err := h.Cookie("auth_token")
		if err != nil {
			http.Error(rw, "No token found in cookie", http.StatusUnauthorized)
			n.logger.Println("No token in cookie:", err)
			return
		}
		n.custLogger.Info(nil, "Auth token found in cookie")

		userID, role, err := n.verifyTokenWithUserService(h.Context(), cookie.Value)
		if err != nil {
			errorMsg := "Invalid token"
			http.Error(rw, "Invalid token", http.StatusUnauthorized)
			n.custLogger.Error(nil, errorMsg+": "+err.Error())
			n.logger.Println("Invalid token:", err)
			return
		}

		n.custLogger.Info(nil, fmt.Sprintf("Token verified successfully, userID: %s, role: %s", userID, role))

		ctx := context.WithValue(h.Context(), KeyProduct{}, userID)
		ctx = context.WithValue(ctx, KeyRole{}, role)

		h = h.WithContext(ctx)

		n.custLogger.Info(nil, "UserID and role added to context")

		next.ServeHTTP(rw, h)
	})
}

func (n *NotificationHandler) verifyTokenWithUserService(ctx context.Context, token string) (string, string, error) {
	_, span := n.tracer.Start(ctx, "NotificationHandler.verifyTokenWithUserService")
	defer span.End()
	linkToUserService := os.Getenv("LINK_TO_USER_SERVICE")
	userServiceURL := fmt.Sprintf("%s/validate-token", linkToUserService)
	reqBody := fmt.Sprintf(`{"token": "%s"}`, token)
	reqCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, "POST", userServiceURL, strings.NewReader(reqBody))
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.logger.Printf("Failed to create token validation request: %v", err)
		return "", "", err
	}
	req.Header.Set("Content-Type", "application/json")

	client, err := createTLSClient()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.logger.Printf("Error creating TLS client: %v", err)
		return "", "", err
	}

	circuitBreaker := gobreaker.NewCircuitBreaker(
		gobreaker.Settings{
			Name:        "UserServiceCircuitBreaker",
			MaxRequests: 5,
			Timeout:     5 * time.Second,
			Interval:    0,
			ReadyToTrip: func(counts gobreaker.Counts) bool {
				return counts.ConsecutiveFailures > 2
			},
			OnStateChange: func(name string, from gobreaker.State, to gobreaker.State) {
				n.logger.Printf("Circuit Breaker '%s' changed from '%s' to '%s'\n", name, from, to)
			},
			IsSuccessful: func(err error) bool {
				if err == nil {
					return true
				}
				if _, ok := err.(domain.ErrRespTmp); ok {
					return false
				}
				return false
			},
		},
	)

	classifier := retrier.WhitelistClassifier{domain.ErrRespTmp{}}
	r := retrier.New(retrier.ConstantBackoff(3, 1000*time.Millisecond), classifier)

	var timeout time.Duration
	deadline, reqHasDeadline := ctx.Deadline()

	var resp *http.Response
	retryCount := 0

	err = r.RunCtx(ctx, func(ctx context.Context) error {
		retryCount++
		n.logger.Printf("Attempting user-service request, attempt #%d", retryCount)

		if reqHasDeadline {
			timeout = time.Until(deadline)
		}

		_, err := circuitBreaker.Execute(func() (interface{}, error) {
			if timeout > 0 {
				req.Header.Add("Timeout", strconv.Itoa(int(timeout.Milliseconds())))
			}

			resp, err = client.Do(req)
			if err != nil {
				return nil, err
			}

			if resp.StatusCode == http.StatusServiceUnavailable || resp.StatusCode == http.StatusGatewayTimeout {
				return nil, domain.ErrRespTmp{
					URL:        resp.Request.URL.String(),
					Method:     resp.Request.Method,
					StatusCode: resp.StatusCode,
				}
			}

			if resp.StatusCode != http.StatusOK {
				return nil, fmt.Errorf("unexpected status code from user-service: %s", resp.Status)
			}

			return resp, nil
		})

		if err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		n.logger.Printf("Error during user-service request after retries: %v", err)
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return "", "", err
	}

	if resp == nil {
		n.logger.Println("Received nil response from user service")
		return "", "", fmt.Errorf("received nil response from user service")
	}

	defer resp.Body.Close()

	var result struct {
		UserID string `json:"user_id"`
		Role   string `json:"role"`
	}

	err = json.NewDecoder(resp.Body).Decode(&result)
	if err != nil {
		n.logger.Printf("Error decoding response: %v", err)
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return "", "", err
	}

	n.logger.Printf("ROLE IS %s", result.Role)

	span.SetStatus(codes.Ok, "Successfully validated token")
	return result.UserID, result.Role, nil
}

func createTLSClient() (*http.Client, error) {
	caCert, err := os.ReadFile("/app/cert.crt")
	if err != nil {
		return nil, fmt.Errorf("failed to read certificate: %w", err)
	}

	caCertPool := x509.NewCertPool()
	if !caCertPool.AppendCertsFromPEM(caCert) {
		return nil, fmt.Errorf("failed to append certs to the pool")
	}

	tlsConfig := &tls.Config{
		RootCAs: caCertPool,
	}

	transport := &http.Transport{
		TLSClientConfig:     tlsConfig,
		MaxIdleConns:        10,
		MaxIdleConnsPerHost: 10,
		MaxConnsPerHost:     10,
	}

	client := &http.Client{
		Timeout:   10 * time.Second,
		Transport: transport,
	}

	return client, nil
}

func (n *NotificationHandler) CreateNotification(rw http.ResponseWriter, h *http.Request) {
	n.custLogger.Info(nil, "Starting CreateNotification request")
	_, span := n.tracer.Start(context.Background(), "NotificationHandler.CreateNotification")
	defer span.End()
	var notification model.Notification

	decoder := json.NewDecoder(h.Body)
	err := decoder.Decode(&notification)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.custLogger.Error(nil, "Unable to decode JSON: "+err.Error())
		http.Error(rw, "Unable to decode json", http.StatusBadRequest)
		n.logger.Fatal(err)
		return
	}
	n.custLogger.Info(nil, "Decoded notification object")

	if err := notification.Validate(); err != nil {
		span.RecordError(errors.New("Very bad request!"))
		n.custLogger.Error(nil, "Notification validation failed: "+err.Error())
		span.SetStatus(codes.Error, "Very bad request!")
		http.Error(rw, err.Error(), http.StatusBadRequest)
		return
	}
	n.custLogger.Info(nil, "Notification validation passed")

	err = n.repo.Create(&notification)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Failed to create notification", http.StatusInternalServerError)
		n.logger.Print("Error inserting notification:", err)
		return
	}
	n.custLogger.Info(nil, "Notification successfully created in repository")

	rw.WriteHeader(http.StatusCreated)
	rw.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(rw).Encode(notification)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.custLogger.Error(nil, "Unable to encode response: "+err.Error())
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		n.logger.Fatal("Unable to encode response:", err)
	}
	span.SetStatus(codes.Ok, "Successfully created notification")
	n.custLogger.Info(nil, "CreateNotification request completed successfully")
}

func (n *NotificationHandler) GetNotificationByID(rw http.ResponseWriter, h *http.Request) {
	n.custLogger.Info(nil, "Starting GetNotificationByID request")
	_, span := n.tracer.Start(context.Background(), "NotificationHandler.GetNotificationByID")
	defer span.End()
	vars := mux.Vars(h)
	id := vars["id"]

	notificationID, err := gocql.ParseUUID(id)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.custLogger.Error(nil, "Invalid UUID format: "+err.Error())
		http.Error(rw, "Invalid UUID format", http.StatusBadRequest)
		n.logger.Println("Invalid UUID format:", err)
		return
	}

	notification, err := n.repo.GetByID(notificationID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.custLogger.Error(nil, "Error fetching notification: "+err.Error())
		http.Error(rw, "Notification not found", http.StatusNotFound)
		n.logger.Println("Error fetching notification:", err)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(rw).Encode(notification)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.custLogger.Error(nil, "Unable to encode response: "+err.Error())
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		n.logger.Fatal("Unable to encode response:", err)
	}
	n.custLogger.Info(nil, "GetNotificationByID request completed successfully")
	span.SetStatus(codes.Ok, "Successfully fetched notification")
}

func (n *NotificationHandler) GetNotificationsByUserID(rw http.ResponseWriter, h *http.Request) {
	n.custLogger.Info(nil, "Starting GetNotificationsByUserID request")
	_, span := n.tracer.Start(context.Background(), "NotificationHandler.GetNotificationsByUserID")
	defer span.End()
	userID, ok := h.Context().Value(KeyProduct{}).(string)
	if !ok {
		errMsg := "User ID not found in context"
		span.RecordError(errors.New("Missing user id"))
		span.SetStatus(codes.Error, "Missing user id")
		n.custLogger.Error(nil, errMsg)
		http.Error(rw, "User ID not found", http.StatusUnauthorized)
		n.logger.Println("User ID not found in context")
		return
	}
	n.custLogger.Info(nil, "User ID extracted from context: "+userID)

	n.logger.Println("User ID:", userID)

	notifications, err := n.repo.GetByUserID(userID)
	if err != nil {
		errMsg := "Error fetching notifications"
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.custLogger.Error(nil, errMsg+": "+err.Error())
		http.Error(rw, "Error fetching notifications", http.StatusInternalServerError)
		n.logger.Println("Error fetching notifications:", err)
		return
	}
	n.custLogger.Info(nil, fmt.Sprintf("Fetched %d notifications for user ID: %s", len(notifications), userID))

	rw.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(rw).Encode(notifications)
	if err != nil {
		errMsg := "Unable to encode response"
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.custLogger.Error(nil, errMsg+": "+err.Error())
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		n.logger.Fatal("Unable to encode response:", err)
	}
	span.SetStatus(codes.Ok, "Successfully got notifications")
	n.custLogger.Info(nil, "GetNotificationsByUserID request completed successfully")
}

func (n *NotificationHandler) UpdateNotificationStatus(rw http.ResponseWriter, h *http.Request) {
	n.custLogger.Info(nil, "Starting UpdateNotificationStatus request")
	_, span := n.tracer.Start(context.Background(), "NotificationHandler.UpdateNotificationStatus")
	defer span.End()
	vars := mux.Vars(h)
	id := vars["id"]

	notificationID, err := gocql.ParseUUID(id)
	if err != nil {
		errMsg := "Invalid UUID format"
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.custLogger.Error(nil, errMsg+": "+err.Error())
		http.Error(rw, "Invalid UUID format", http.StatusBadRequest)
		n.logger.Println("Invalid UUID format:", err)
		return
	}

	type statusRequest struct {
		Status    model.NotificationStatus `json:"status"`
		CreatedAt time.Time                `json:"created_at"`
	}

	var req statusRequest
	decoder := json.NewDecoder(h.Body)
	err = decoder.Decode(&req)
	if err != nil {
		errMsg := "Unable to decode JSON"
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.custLogger.Error(nil, errMsg+": "+err.Error())
		http.Error(rw, "Unable to decode JSON", http.StatusBadRequest)
		n.logger.Println("Error decoding JSON:", err)
		return
	}
	n.custLogger.Info(nil, "Decoded status request")

	if req.Status != model.Unread && req.Status != model.Read {
		errMsg := "Invalid status value"
		span.RecordError(errors.New("Bad status"))
		span.SetStatus(codes.Error, "Bad")
		n.custLogger.Error(nil, errMsg)
		http.Error(rw, "Invalid status value", http.StatusBadRequest)
		return
	}
	n.custLogger.Info(nil, "Status value is valid: "+string(req.Status))

	userID, ok := h.Context().Value(KeyProduct{}).(string)
	if !ok {
		errMsg := "User ID not found in context"
		span.RecordError(errors.New("Could not find user id"))
		span.SetStatus(codes.Error, "Could not find user id")
		n.logger.Println("User id not found in context")
		n.custLogger.Error(nil, errMsg)
		http.Error(rw, "User id not found in context", http.StatusUnauthorized)
		return
	}
	n.custLogger.Info(nil, "User ID extracted from context: "+userID)

	err = n.repo.UpdateStatus(req.CreatedAt, userID, notificationID, req.Status)
	if err != nil {
		errMsg := "Error updating notification status"
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.custLogger.Error(nil, errMsg+": "+err.Error())
		http.Error(rw, "Error updating notification status", http.StatusInternalServerError)
		n.logger.Println("Error updating notification status:", err)
		return
	}

	n.custLogger.Info(nil, "Notification status successfully updated")

	rw.WriteHeader(http.StatusNoContent)
	span.SetStatus(codes.Ok, "Successfully updated notification status")
	n.custLogger.Info(nil, "UpdateNotificationStatus request completed successfully")
}

func (n *NotificationHandler) DeleteNotification(rw http.ResponseWriter, h *http.Request) {
	n.custLogger.Info(nil, "Starting DeleteNotification request")
	_, span := n.tracer.Start(context.Background(), "NotificationHandler.DeleteNotification")
	defer span.End()
	vars := mux.Vars(h)
	id := vars["id"]

	notificationID, err := gocql.ParseUUID(id)
	if err != nil {
		errMsg := "Invalid UUID format"
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.custLogger.Error(nil, errMsg+": "+err.Error())
		http.Error(rw, "Invalid UUID format", http.StatusBadRequest)
		n.logger.Println("Invalid UUID format:", err)
		return
	}

	err = n.repo.Delete(notificationID)
	if err != nil {
		errMsg := "Error deleting notification"
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.custLogger.Error(nil, errMsg+": "+err.Error())
		http.Error(rw, "Error deleting notification", http.StatusInternalServerError)
		n.logger.Println("Error deleting notification:", err)
		return
	}

	n.custLogger.Info(nil, "Notification successfully deleted")

	rw.WriteHeader(http.StatusNoContent)
	span.SetStatus(codes.Ok, "Successfully deleted notification")
	n.custLogger.Info(nil, "DeleteNotification request completed successfully")
}

func (uh *NotificationHandler) MiddlewareCheckRoles(allowedRoles []string, next http.Handler) http.Handler {
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

func (n *NotificationHandler) NotificationListener() {
	n.logger.Println("Notification listener started")
	_, span := n.tracer.Start(context.Background(), "NotificationHandler.NotificationListener")
	defer span.End()
	n.logger.Println("method started")
	nc, err := Conn()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Fatal("Error connecting to NATS:", err)
	}
	defer nc.Close()

	subscribe := func(subject string, handler nats.MsgHandler) {
		_, err := nc.Subscribe(subject, handler)
		if err != nil {
			n.logger.Printf("Error subscribing to NATS subject %s: %v", subject, err)
		}
	}

	subscribe("project.joined", n.handleProjectJoined)
	subscribe("task.joined", n.handleTaskJoined)
	subscribe("project.removed", n.handleProjectRemoved)
	subscribe("task.removed", n.handleTaskRemoved)
	subscribe("task.status.update", n.handleTaskStatusUpdate)

	select {}
}

func (n *NotificationHandler) handleProjectJoined(msg *nats.Msg) {
	var data struct {
		UserID      string `json:"userId"`
		ProjectName string `json:"projectName"`
	}
	if err := json.Unmarshal(msg.Data, &data); err != nil {
		n.logger.Println("Error unmarshalling project.joined message:", err)
		return
	}

	message := fmt.Sprintf("You have been added to the %s project", data.ProjectName)
	notification := model.Notification{
		UserID:    data.UserID,
		Message:   message,
		CreatedAt: time.Now(),
		Status:    model.Unread,
	}
	if err := n.repo.Create(&notification); err != nil {
		n.logger.Println("Error inserting notification:", err)
	}
}

func (n *NotificationHandler) handleTaskJoined(msg *nats.Msg) {
	var data struct {
		UserID   string `json:"userId"`
		TaskName string `json:"taskName"`
	}
	if err := json.Unmarshal(msg.Data, &data); err != nil {
		n.logger.Println("Error unmarshalling task.joined message:", err)
		return
	}

	message := fmt.Sprintf("You have been added to the %s task", data.TaskName)
	notification := model.Notification{
		UserID:    data.UserID,
		Message:   message,
		CreatedAt: time.Now(),
		Status:    model.Unread,
	}
	if err := n.repo.Create(&notification); err != nil {
		n.logger.Println("Error inserting notification:", err)
	}
}

func (n *NotificationHandler) handleProjectRemoved(msg *nats.Msg) {
	var data struct {
		UserID      string `json:"userId"`
		ProjectName string `json:"projectName"`
	}
	if err := json.Unmarshal(msg.Data, &data); err != nil {
		n.logger.Println("Error unmarshalling project.removed message:", err)
		return
	}

	message := fmt.Sprintf("You have been removed from the %s project", data.ProjectName)
	notification := model.Notification{
		UserID:    data.UserID,
		Message:   message,
		CreatedAt: time.Now(),
		Status:    model.Unread,
	}
	if err := n.repo.Create(&notification); err != nil {
		n.logger.Println("Error inserting notification:", err)
	}
}

func (n *NotificationHandler) handleTaskRemoved(msg *nats.Msg) {
	var data struct {
		UserID   string `json:"userId"`
		TaskName string `json:"taskName"`
	}
	if err := json.Unmarshal(msg.Data, &data); err != nil {
		n.logger.Println("Error unmarshalling task.removed message:", err)
		return
	}

	message := fmt.Sprintf("You have been removed from the %s task", data.TaskName)
	notification := model.Notification{
		UserID:    data.UserID,
		Message:   message,
		CreatedAt: time.Now(),
		Status:    model.Unread,
	}
	if err := n.repo.Create(&notification); err != nil {
		n.logger.Println("Error inserting notification:", err)
	}
}

func (n *NotificationHandler) handleTaskStatusUpdate(msg *nats.Msg) {
	fmt.Printf("User received status update notification: %s\n", string(msg.Data))

	var update struct {
		TaskName   string   `json:"taskName"`
		TaskStatus string   `json:"taskStatus"`
		MemberIds  []string `json:"memberIds"`
	}

	if err := json.Unmarshal(msg.Data, &update); err != nil {
		n.logger.Printf("Error unmarshalling task status update message: %v", err)
		return
	}
	fmt.Printf("Received status update for Task %s: %s\n", update.TaskName, update.TaskStatus)

	message := fmt.Sprintf("The status of the %s task has been changed to %s", update.TaskName, update.TaskStatus)

	for _, memberID := range update.MemberIds {
		notification := model.Notification{
			UserID:    memberID,
			Message:   message,
			CreatedAt: time.Now(),
			Status:    model.Unread,
		}
		n.logger.Println("MEMBERI SU " + memberID)

		if err := n.repo.Create(&notification); err != nil {
			n.logger.Printf("Error inserting notification for user %s: %v", memberID, err)
			continue
		}

		n.logger.Printf("Notification sent to user %s\n", memberID)
	}
}

func Conn() (*nats.Conn, error) {
	connection := os.Getenv("NATS_URL")
	conn, err := nats.Connect(connection)
	if err != nil {
		log.Fatal(err)
		return nil, err
	}
	return conn, nil
}

func (n *NotificationHandler) GetUnreadNotificationCount(rw http.ResponseWriter, h *http.Request) {
	n.custLogger.Info(nil, "Starting GetUnreadNotificationCount request")
	n.logger.Println("method hit")
	userID, ok := h.Context().Value(KeyProduct{}).(string)
	if !ok {
		http.Error(rw, "User ID not found", http.StatusUnauthorized)
		n.logger.Println("User ID not found in context")
		return
	}
	n.custLogger.Info(nil, "User ID extracted from context: "+userID)

	notifications, err := n.repo.GetByUserID(userID)
	if err != nil {
		errMsg := "Error fetching notifications"
		n.custLogger.Error(nil, errMsg+": "+err.Error())
		http.Error(rw, "Error fetching notifications", http.StatusInternalServerError)
		n.logger.Println("Error fetching notifications:", err)
		return
	}
	n.custLogger.Info(nil, fmt.Sprintf("Fetched %d notifications for user ID: %s", len(notifications), userID))

	unreadCount := 0
	for _, notification := range notifications {
		if notification.Status == model.Unread {
			unreadCount++
		}
	}
	n.custLogger.Info(nil, fmt.Sprintf("Unread notifications count: %d", unreadCount))

	rw.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(rw).Encode(struct {
		UnreadCount int `json:"unreadCount"`
	}{UnreadCount: unreadCount})
	if err != nil {
		errMsg := "Unable to encode response"
		n.custLogger.Error(nil, errMsg+": "+err.Error())
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		n.logger.Fatal("Unable to encode response:", err)
	}
	n.custLogger.Info(nil, "GetUnreadNotificationCount request completed successfully")
}
