package handler

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/gocql/gocql"
	"github.com/gorilla/mux"
	"github.com/nats-io/nats.go"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	"io/ioutil"
	"log"
	"net/http"
	"notification-service/model"
	"notification-service/repository"
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

		userID, role, err := n.verifyTokenWithUserService(cookie.Value)
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

func (n *NotificationHandler) verifyTokenWithUserService(token string) (string, string, error) {
	_, span := n.tracer.Start(context.Background(), "NotificationHandler.verifyTokenWithUserService")
	defer span.End()
	userServiceURL := "https://user-server:8080/validate-token"
	reqBody := fmt.Sprintf(`{"token": "%s"}`, token)
	req, err := http.NewRequest("POST", userServiceURL, strings.NewReader(reqBody))
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return "", "", err
	}
	req.Header.Set("Content-Type", "application/json")

	client, err := createTLSClient()
	if err != nil {
		log.Printf("Error creating TLS client: %v\n", err)
		return "", "", err
	}
	resp, err := client.Do(req)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return "", "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		span.RecordError(errors.New(resp.Status))
		span.SetStatus(codes.Error, "Response status is not OK")
		return "", "", fmt.Errorf("failed to validate token, status: %s", resp.Status)
	}

	var result struct {
		UserID string `json:"user_id"`
		Role   string `json:"role"`
	}

	n.logger.Println("ROLE IS " + result.Role)
	err = json.NewDecoder(resp.Body).Decode(&result)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return "", "", err
	}
	span.SetStatus(codes.Ok, "Successfully validated token")
	return result.UserID, result.Role, nil
}

func createTLSClient() (*http.Client, error) {
	caCert, err := ioutil.ReadFile("/app/cert.crt")
	if err != nil {
		return nil, err
	}

	caCertPool := x509.NewCertPool()
	caCertPool.AppendCertsFromPEM(caCert)

	tlsConfig := &tls.Config{
		RootCAs: caCertPool,
	}

	transport := &http.Transport{
		TLSClientConfig: tlsConfig,
	}

	client := &http.Client{
		Transport: transport,
	}

	return client, nil
}

func (n *NotificationHandler) CreateNotification(rw http.ResponseWriter, h *http.Request) {
	_, span := n.tracer.Start(context.Background(), "NotificationHandler.CreateNotification")
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

	err = n.repo.Create(&notification)
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
	_, span := n.tracer.Start(context.Background(), "NotificationHandler.GetNotificationByID")
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

	notification, err := n.repo.GetByID(notificationID)
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
	_, span := n.tracer.Start(context.Background(), "NotificationHandler.GetNotificationsByUserID")
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

	notifications, err := n.repo.GetByUserID(userID)
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
	_, span := n.tracer.Start(context.Background(), "NotificationHandler.UpdateNotificationStatus")
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

	err = n.repo.UpdateStatus(req.CreatedAt, userID, notificationID, req.Status)
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
	_, span := n.tracer.Start(context.Background(), "NotificationHandler.DeleteNotification")
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

	err = n.repo.Delete(notificationID)
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

	projectDeleted := "project.deleted"
	_, err = nc.Subscribe(projectDeleted, func(msg *nats.Msg) {
		fmt.Printf("User received notification: %s\n", string(msg.Data))

		var data struct {
			UserIDs     []string `json:"userIds"`
			ProjectName string   `json:"projectName"`
		}

		err := json.Unmarshal(msg.Data, &data)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Println("Error unmarshalling message:", err)
			return
		}

		fmt.Printf("User ID: %s, Project Name: %s\n", data.UserIDs, data.ProjectName)

		message := fmt.Sprintf("The project: %s , you where working on, was deleted", data.ProjectName)

		for _, userID := range data.UserIDs {
			notification := model.Notification{
				UserID:    userID,
				Message:   message,
				CreatedAt: time.Now(),
				Status:    model.Unread,
			}
			err = n.repo.Create(&notification)
			if err != nil {
				span.RecordError(err)
				span.SetStatus(codes.Error, err.Error())
				n.logger.Print("Error inserting notification:", err)
				return
			}

		}

	})

	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Println("Error subscribing to NATS subject:", err)
	}

	taskJoined := "task.joined"
	_, err = nc.Subscribe(taskJoined, func(msg *nats.Msg) {
		fmt.Printf("User received notification: %s\n", string(msg.Data))

		var data struct {
			UserID   string `json:"userId"`
			TaskName string `json:"taskName"`
		}

		err := json.Unmarshal(msg.Data, &data)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Println("Error unmarshalling message:", err)
			return
		}

		fmt.Printf("User ID: %s, Task Name: %s\n", data.UserID, data.TaskName)

		message := fmt.Sprintf("You have been added to the %s task", data.TaskName)

		notification := model.Notification{
			UserID:    data.UserID,
			Message:   message,
			CreatedAt: time.Now(),
			Status:    model.Unread,
		}

		err = n.repo.Create(&notification)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			n.logger.Print("Error inserting notification:", err)
			return
		}
	})

	if err != nil {
		log.Println("Error subscribing to NATS subject:", err)
	}

	subjectRemoved := "project.removed"
	_, err = nc.Subscribe(subjectRemoved, func(msg *nats.Msg) {
		fmt.Printf("User received removal notification: %s\n", string(msg.Data))

		var data struct {
			UserID      string `json:"userId"`
			ProjectName string `json:"projectName"`
		}

		err := json.Unmarshal(msg.Data, &data)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Println("Error unmarshalling message:", err)
			return
		}

		fmt.Printf("User ID: %s, Project Name: %s\n", data.UserID, data.ProjectName)

		message := fmt.Sprintf("You have been removed from the %s project", data.ProjectName)

		notification := model.Notification{
			UserID:    data.UserID,
			Message:   message,
			CreatedAt: time.Now(),
			Status:    model.Unread,
		}

		err = n.repo.Create(&notification)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			n.logger.Print("Error inserting notification:", err)
			return
		}
	})

	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Println("Error subscribing to NATS subject:", err)
	}

	taskRemoved := "task.removed"
	_, err = nc.Subscribe(taskRemoved, func(msg *nats.Msg) {
		fmt.Printf("User received removal notification: %s\n", string(msg.Data))

		var data struct {
			UserID   string `json:"userId"`
			TaskName string `json:"taskName"`
		}

		err := json.Unmarshal(msg.Data, &data)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Println("Error unmarshalling message:", err)
			return
		}

		fmt.Printf("User ID: %s, Task Name: %s\n", data.UserID, data.TaskName)

		message := fmt.Sprintf("You have been removed from the %s task", data.TaskName)

		notification := model.Notification{
			UserID:    data.UserID,
			Message:   message,
			CreatedAt: time.Now(),
			Status:    model.Unread,
		}

		err = n.repo.Create(&notification)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			n.logger.Print("Error inserting notification:", err)
			return
		}
	})

	if err != nil {
		log.Println("Error subscribing to NATS subject:", err)
	}

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

		if err := n.repo.Create(&notification); err != nil {
			n.logger.Printf("Error inserting notification for user %s: %v", memberID, err)
			continue
		}

		n.logger.Printf("Notification sent to user %s\n", memberID)
	}
}

func Conn() (*nats.Conn, error) {
	conn, err := nats.Connect("nats://nats:4222")
	if err != nil {
		log.Fatal(err)
		return nil, err
	}
	return conn, nil
}

func (n *NotificationHandler) GetUnreadNotificationCount(rw http.ResponseWriter, h *http.Request) {
	n.logger.Println("method hit")
	userID, ok := h.Context().Value(KeyProduct{}).(string)
	if !ok {
		http.Error(rw, "User ID not found", http.StatusUnauthorized)
		n.logger.Println("User ID not found in context")
		return
	}

	notifications, err := n.repo.GetByUserID(userID)
	if err != nil {
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
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		n.logger.Fatal("Unable to encode response:", err)
	}
}
