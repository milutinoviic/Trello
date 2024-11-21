package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/gocql/gocql"
	"github.com/gorilla/mux"
	"github.com/nats-io/nats.go"
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
}

func NewNotificationHandler(l *log.Logger, r *repository.NotificationRepo) *NotificationHandler {
	return &NotificationHandler{l, r}
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
	userServiceURL := "http://user-server:8080/validate-token"
	reqBody := fmt.Sprintf(`{"token": "%s"}`, token)
	req, err := http.NewRequest("POST", userServiceURL, strings.NewReader(reqBody))
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("failed to validate token, status: %s", resp.Status)
	}

	var result struct {
		UserID string `json:"user_id"`
		Role   string `json:"role"`
	}

	n.logger.Println("ROLE IS " + result.Role)
	err = json.NewDecoder(resp.Body).Decode(&result)
	if err != nil {
		return "", "", err
	}

	return result.UserID, result.Role, nil
}

func (n *NotificationHandler) CreateNotification(rw http.ResponseWriter, h *http.Request) {
	var notification model.Notification

	decoder := json.NewDecoder(h.Body)
	err := decoder.Decode(&notification)
	if err != nil {
		http.Error(rw, "Unable to decode json", http.StatusBadRequest)
		n.logger.Fatal(err)
		return
	}

	if err := notification.Validate(); err != nil {
		http.Error(rw, err.Error(), http.StatusBadRequest)
		return
	}

	err = n.repo.Create(&notification)
	if err != nil {
		http.Error(rw, "Failed to create notification", http.StatusInternalServerError)
		n.logger.Print("Error inserting notification:", err)
		return
	}

	rw.WriteHeader(http.StatusCreated)
	rw.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(rw).Encode(notification)
	if err != nil {
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		n.logger.Fatal("Unable to encode response:", err)
	}
}

func (n *NotificationHandler) GetNotificationByID(rw http.ResponseWriter, h *http.Request) {
	vars := mux.Vars(h)
	id := vars["id"]

	notificationID, err := gocql.ParseUUID(id)
	if err != nil {
		http.Error(rw, "Invalid UUID format", http.StatusBadRequest)
		n.logger.Println("Invalid UUID format:", err)
		return
	}

	notification, err := n.repo.GetByID(notificationID)
	if err != nil {
		http.Error(rw, "Notification not found", http.StatusNotFound)
		n.logger.Println("Error fetching notification:", err)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(rw).Encode(notification)
	if err != nil {
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		n.logger.Fatal("Unable to encode response:", err)
	}
}

func (n *NotificationHandler) GetNotificationsByUserID(rw http.ResponseWriter, h *http.Request) {
	userID, ok := h.Context().Value(KeyProduct{}).(string)
	if !ok {
		http.Error(rw, "User ID not found", http.StatusUnauthorized)
		n.logger.Println("User ID not found in context")
		return
	}

	n.logger.Println("User ID:", userID)

	notifications, err := n.repo.GetByUserID(userID)
	if err != nil {
		http.Error(rw, "Error fetching notifications", http.StatusInternalServerError)
		n.logger.Println("Error fetching notifications:", err)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(rw).Encode(notifications)
	if err != nil {
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		n.logger.Fatal("Unable to encode response:", err)
	}
}

func (n *NotificationHandler) UpdateNotificationStatus(rw http.ResponseWriter, h *http.Request) {
	vars := mux.Vars(h)
	id := vars["id"]

	notificationID, err := gocql.ParseUUID(id)
	if err != nil {
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
		http.Error(rw, "Unable to decode JSON", http.StatusBadRequest)
		n.logger.Println("Error decoding JSON:", err)
		return
	}

	if req.Status != model.Unread && req.Status != model.Read {
		http.Error(rw, "Invalid status value", http.StatusBadRequest)
		return
	}

	userID, ok := h.Context().Value(KeyProduct{}).(string)
	if !ok {
		n.logger.Println("User id not found in context")
		http.Error(rw, "User id not found in context", http.StatusUnauthorized)
		return
	}

	err = n.repo.UpdateStatus(req.CreatedAt, userID, notificationID, req.Status)
	if err != nil {
		http.Error(rw, "Error updating notification status", http.StatusInternalServerError)
		n.logger.Println("Error updating notification status:", err)
		return
	}

	rw.WriteHeader(http.StatusNoContent)
}

func (n *NotificationHandler) DeleteNotification(rw http.ResponseWriter, h *http.Request) {
	vars := mux.Vars(h)
	id := vars["id"]

	notificationID, err := gocql.ParseUUID(id)
	if err != nil {
		http.Error(rw, "Invalid UUID format", http.StatusBadRequest)
		n.logger.Println("Invalid UUID format:", err)
		return
	}

	err = n.repo.Delete(notificationID)
	if err != nil {
		http.Error(rw, "Error deleting notification", http.StatusInternalServerError)
		n.logger.Println("Error deleting notification:", err)
		return
	}

	rw.WriteHeader(http.StatusNoContent)
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
	n.logger.Println("method started")
	nc, err := Conn()
	if err != nil {
		log.Fatal("Error connecting to NATS:", err)
	}
	defer nc.Close()

	subjectJoined := "project.joined"
	_, err = nc.Subscribe(subjectJoined, func(msg *nats.Msg) {
		fmt.Printf("User received notification: %s\n", string(msg.Data))

		var data struct {
			UserID      string `json:"userId"`
			ProjectName string `json:"projectName"`
		}

		err := json.Unmarshal(msg.Data, &data)
		if err != nil {
			log.Println("Error unmarshalling message:", err)
			return
		}

		fmt.Printf("User ID: %s, Project Name: %s\n", data.UserID, data.ProjectName)

		message := fmt.Sprintf("You have been added to the %s project", data.ProjectName)

		notification := model.Notification{
			UserID:    data.UserID,
			Message:   message,
			CreatedAt: time.Now(),
			Status:    model.Unread,
		}

		err = n.repo.Create(&notification)
		if err != nil {
			n.logger.Print("Error inserting notification:", err)
			return
		}
	})

	if err != nil {
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
			n.logger.Print("Error inserting notification:", err)
			return
		}
	})

	if err != nil {
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
			n.logger.Print("Error inserting notification:", err)
			return
		}
	})

	if err != nil {
		log.Println("Error subscribing to NATS subject:", err)
	}

	projectDeleted := "project.deleted"
	_, err = nc.Subscribe(projectDeleted, func(msg *nats.Msg) {
		fmt.Printf("User received notification: %s\n", string(msg.Data))

		var data struct {
			UserIDs     []string `json:"userIds"`
			ProjectName string   `json:"projectName"`
		}

		err := json.Unmarshal(msg.Data, &data)
		if err != nil {
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
				n.logger.Print("Error inserting notification:", err)
				return
			}

		}

	})

	select {}
}

func Conn() (*nats.Conn, error) {
	conn, err := nats.Connect("nats://nats:4222")
	if err != nil {
		log.Fatal(err)
		return nil, err
	}
	return conn, nil
}
