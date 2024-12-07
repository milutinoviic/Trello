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
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
	"log"
	"net/http"
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
	logger *log.Logger
	repo   *repository.NotificationRepo
	tracer trace.Tracer
}

func NewNotificationHandler(l *log.Logger, r *repository.NotificationRepo, tracer trace.Tracer) *NotificationHandler {
	return &NotificationHandler{l, r, tracer}
}

// Middleware to extract user ID from HTTP-only cookie and validate it
func (n *NotificationHandler) MiddlewareExtractUserFromCookie(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, h *http.Request) {
		cookie, err := h.Cookie("auth_token")
		if err != nil {
			http.Error(rw, "No token found in cookie", http.StatusUnauthorized)
			n.logger.Println("No token in cookie:", err)
			return
		}

		userID, role, err := n.verifyTokenWithUserService(h.Context(), cookie.Value)
		if err != nil {
			http.Error(rw, "Invalid token", http.StatusUnauthorized)
			n.logger.Println("Invalid token:", err)
			return
		}

		ctx := context.WithValue(h.Context(), KeyProduct{}, userID)
		ctx = context.WithValue(ctx, KeyRole{}, role)

		h = h.WithContext(ctx)

		next.ServeHTTP(rw, h)
	})
}

func ExtractTraceInfoMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := otel.GetTextMapPropagator().Extract(r.Context(), propagation.HeaderCarrier(r.Header))
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (n *NotificationHandler) verifyTokenWithUserService(ctx context.Context, token string) (string, string, error) {
	ctx, span := n.tracer.Start(ctx, "NotificationHandler.verifyTokenWithUserService")
	defer span.End()
	linkToUserService := os.Getenv("LINK_TO_USER_SERVICE")
	userServiceURL := fmt.Sprintf("%s/validate-token", linkToUserService)
	reqBody := fmt.Sprintf(`{"token": "%s"}`, token)

	req, err := http.NewRequestWithContext(ctx, "POST", userServiceURL, strings.NewReader(reqBody))
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.logger.Printf("Failed to create token validation request: %v", err)
		return "", "", err
	}
	req.Header.Set("Content-Type", "application/json")
	otel.GetTextMapPropagator().Inject(ctx, propagation.HeaderCarrier(req.Header))
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
	ctx, span := n.tracer.Start(h.Context(), "NotificationHandler.CreateNotification")
	defer span.End()
	var notification model.Notification

	decoder := json.NewDecoder(h.Body)
	err := decoder.Decode(&notification)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Unable to decode json", http.StatusBadRequest)
		n.logger.Fatal(err)
		return
	}

	if err := notification.Validate(); err != nil {
		span.RecordError(errors.New("Very bad request!"))
		span.SetStatus(codes.Error, "Very bad request!")
		http.Error(rw, err.Error(), http.StatusBadRequest)
		return
	}

	err = n.repo.Create(ctx, &notification)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Failed to create notification", http.StatusInternalServerError)
		n.logger.Print("Error inserting notification:", err)
		return
	}

	rw.WriteHeader(http.StatusCreated)
	rw.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(rw).Encode(notification)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		n.logger.Fatal("Unable to encode response:", err)
	}
	span.SetStatus(codes.Ok, "Successfully created notification")
}

func (n *NotificationHandler) GetNotificationByID(rw http.ResponseWriter, h *http.Request) {
	ctx, span := n.tracer.Start(h.Context(), "NotificationHandler.GetNotificationByID")
	defer span.End()
	vars := mux.Vars(h)
	id := vars["id"]

	notificationID, err := gocql.ParseUUID(id)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Invalid UUID format", http.StatusBadRequest)
		n.logger.Println("Invalid UUID format:", err)
		return
	}

	notification, err := n.repo.GetByID(ctx, notificationID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Notification not found", http.StatusNotFound)
		n.logger.Println("Error fetching notification:", err)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(rw).Encode(notification)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		n.logger.Fatal("Unable to encode response:", err)
	}
	span.SetStatus(codes.Ok, "Successfully fetched notification")
}

func (n *NotificationHandler) GetNotificationsByUserID(rw http.ResponseWriter, h *http.Request) {
	ctx, span := n.tracer.Start(h.Context(), "NotificationHandler.GetNotificationsByUserID")
	defer span.End()
	userID, ok := h.Context().Value(KeyProduct{}).(string)
	if !ok {
		span.RecordError(errors.New("Missing user id"))
		span.SetStatus(codes.Error, "Missing user id")
		http.Error(rw, "User ID not found", http.StatusUnauthorized)
		n.logger.Println("User ID not found in context")
		return
	}

	n.logger.Println("User ID:", userID)

	notifications, err := n.repo.GetByUserID(ctx, userID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Error fetching notifications", http.StatusInternalServerError)
		n.logger.Println("Error fetching notifications:", err)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(rw).Encode(notifications)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		n.logger.Fatal("Unable to encode response:", err)
	}
	span.SetStatus(codes.Ok, "Successfully got notifications")
}

func (n *NotificationHandler) UpdateNotificationStatus(rw http.ResponseWriter, h *http.Request) {
	ctx, span := n.tracer.Start(h.Context(), "NotificationHandler.UpdateNotificationStatus")
	defer span.End()
	vars := mux.Vars(h)
	id := vars["id"]

	notificationID, err := gocql.ParseUUID(id)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
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
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Unable to decode JSON", http.StatusBadRequest)
		n.logger.Println("Error decoding JSON:", err)
		return
	}

	if req.Status != model.Unread && req.Status != model.Read {
		span.RecordError(errors.New("Bad status"))
		span.SetStatus(codes.Error, "Bad")
		http.Error(rw, "Invalid status value", http.StatusBadRequest)
		return
	}

	userID, ok := h.Context().Value(KeyProduct{}).(string)
	if !ok {
		span.RecordError(errors.New("Could not find user id"))
		span.SetStatus(codes.Error, "Could not find user id")
		n.logger.Println("User id not found in context")
		http.Error(rw, "User id not found in context", http.StatusUnauthorized)
		return
	}

	err = n.repo.UpdateStatus(ctx, req.CreatedAt, userID, notificationID, req.Status)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Error updating notification status", http.StatusInternalServerError)
		n.logger.Println("Error updating notification status:", err)
		return
	}

	rw.WriteHeader(http.StatusNoContent)
	span.SetStatus(codes.Ok, "Successfully updated notification status")
}

func (n *NotificationHandler) DeleteNotification(rw http.ResponseWriter, h *http.Request) {
	ctx, span := n.tracer.Start(h.Context(), "NotificationHandler.DeleteNotification")
	defer span.End()
	vars := mux.Vars(h)
	id := vars["id"]

	notificationID, err := gocql.ParseUUID(id)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Invalid UUID format", http.StatusBadRequest)
		n.logger.Println("Invalid UUID format:", err)
		return
	}

	err = n.repo.Delete(ctx, notificationID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Error deleting notification", http.StatusInternalServerError)
		n.logger.Println("Error deleting notification:", err)
		return
	}

	rw.WriteHeader(http.StatusNoContent)
	span.SetStatus(codes.Ok, "Successfully deleted notification")
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
	ctx, span := n.tracer.Start(context.Background(), "NotificationHandler.NotificationListener")
	defer span.End()
	n.logger.Println("method started")
	nc, err := Conn()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Fatal("Error connecting to NATS:", err)
	}
	defer nc.Close()

	// Wrapper to provide context to handlers
	wrapHandler := func(handler func(context.Context, *nats.Msg)) nats.MsgHandler {
		return func(msg *nats.Msg) {
			// Start a fresh span for each message handling
			msgCtx, msgSpan := n.tracer.Start(ctx, "NATS.MessageHandler")
			defer msgSpan.End()
			handler(msgCtx, msg)
		}
	}

	subscribe := func(subject string, handler func(context.Context, *nats.Msg)) {
		_, err := nc.Subscribe(subject, wrapHandler(handler))
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

func (n *NotificationHandler) handleProjectJoined(ctx context.Context, msg *nats.Msg) {
	ctx, span := n.tracer.Start(ctx, "NotificationHandler.handleProjectJoined")
	defer span.End()

	var data struct {
		UserID      string `json:"userId"`
		ProjectName string `json:"projectName"`
	}
	if err := json.Unmarshal(msg.Data, &data); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
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
	if err := n.repo.Create(ctx, &notification); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.logger.Println("Error inserting notification:", err)
	}
	span.SetStatus(codes.Ok, message)
}

func (n *NotificationHandler) handleTaskJoined(ctx context.Context, msg *nats.Msg) {
	ctx, span := n.tracer.Start(ctx, "NotificationHandler.handleTaskJoined")
	defer span.End()
	var data struct {
		UserID   string `json:"userId"`
		TaskName string `json:"taskName"`
	}
	if err := json.Unmarshal(msg.Data, &data); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
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
	if err := n.repo.Create(ctx, &notification); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.logger.Println("Error inserting notification:", err)
	}
	span.SetStatus(codes.Ok, message)
}

func (n *NotificationHandler) handleProjectRemoved(ctx context.Context, msg *nats.Msg) {
	ctx, span := n.tracer.Start(ctx, "NotificationHandler.handleProjectRemoved")
	defer span.End()

	var data struct {
		UserID      string `json:"userId"`
		ProjectName string `json:"projectName"`
	}
	if err := json.Unmarshal(msg.Data, &data); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
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
	if err := n.repo.Create(ctx, &notification); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.logger.Println("Error inserting notification:", err)
	}
	span.SetStatus(codes.Ok, message)
}

func (n *NotificationHandler) handleTaskRemoved(ctx context.Context, msg *nats.Msg) {
	ctx, span := n.tracer.Start(ctx, "NotificationHandler.handleTaskRemoved")
	defer span.End()
	var data struct {
		UserID   string `json:"userId"`
		TaskName string `json:"taskName"`
	}
	if err := json.Unmarshal(msg.Data, &data); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
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
	if err := n.repo.Create(ctx, &notification); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.logger.Println("Error inserting notification:", err)
	}
	span.SetStatus(codes.Ok, "")
}

func (n *NotificationHandler) handleTaskStatusUpdate(ctx context.Context, msg *nats.Msg) {
	ctx, span := n.tracer.Start(ctx, "NotificationHandler.handleTaskStatusUpdate")
	defer span.End()
	fmt.Printf("User received status update notification: %s\n", string(msg.Data))

	var update struct {
		TaskName   string   `json:"taskName"`
		TaskStatus string   `json:"taskStatus"`
		MemberIds  []string `json:"memberIds"`
	}

	if err := json.Unmarshal(msg.Data, &update); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
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

		if err := n.repo.Create(ctx, &notification); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			n.logger.Printf("Error inserting notification for user %s: %v", memberID, err)
			continue
		}

		n.logger.Printf("Notification sent to user %s\n", memberID)
	}
	span.SetStatus(codes.Ok, message)
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
	ctx, span := n.tracer.Start(h.Context(), "GetUnreadNotificationCount")
	defer span.End()
	n.logger.Println("method hit")
	userID, ok := h.Context().Value(KeyProduct{}).(string)
	if !ok {
		span.RecordError(errors.New("user id not found"))
		span.SetStatus(codes.Error, "user id not found")
		http.Error(rw, "User ID not found", http.StatusUnauthorized)
		n.logger.Println("User ID not found in context")
		return
	}

	notifications, err := n.repo.GetByUserID(ctx, userID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Error fetching notifications", http.StatusInternalServerError)
		n.logger.Println("Error fetching notifications:", err)
		return
	}

	unreadCount := 0
	for _, notification := range notifications {
		if notification.Status == model.Unread {
			unreadCount++
		}
	}

	rw.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(rw).Encode(struct {
		UnreadCount int `json:"unreadCount"`
	}{UnreadCount: unreadCount})
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		n.logger.Fatal("Unable to encode response:", err)
	}
	span.SetStatus(codes.Ok, "")
}
