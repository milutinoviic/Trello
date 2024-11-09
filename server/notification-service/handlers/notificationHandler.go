package handler

import (
	"context"
	"encoding/json"
	"github.com/gocql/gocql"
	"github.com/gorilla/mux"
	"log"
	"net/http"
	"notification-service/model"
	"notification-service/repository"
)

type KeyProduct struct{}

type NotificationHandler struct {
	logger *log.Logger
	repo   *repository.NotificationRepo
}

func NewNotificationHandler(l *log.Logger, r *repository.NotificationRepo) *NotificationHandler {
	return &NotificationHandler{l, r}
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
	vars := mux.Vars(h)
	userID := vars["user_id"]

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

	var status model.NotificationStatus
	decoder := json.NewDecoder(h.Body)
	err = decoder.Decode(&status)
	if err != nil {
		http.Error(rw, "Unable to decode JSON", http.StatusBadRequest)
		n.logger.Println("Error decoding JSON:", err)
		return
	}

	if status != model.Unread && status != model.Read {
		http.Error(rw, "Invalid status value", http.StatusBadRequest)
		return
	}

	err = n.repo.UpdateStatus(notificationID, status)
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

func (n *NotificationHandler) MiddlewareNotificationDeserialization(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, h *http.Request) {
		notification := &model.Notification{}
		err := notification.FromJSON(h.Body)
		if err != nil {
			http.Error(rw, "Unable to decode json", http.StatusBadRequest)
			n.logger.Fatal(err)
			return
		}
		ctx := context.WithValue(h.Context(), KeyProduct{}, notification)
		h = h.WithContext(ctx)
		next.ServeHTTP(rw, h)
	})
}

func (n *NotificationHandler) MiddlewareContentTypeSet(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, h *http.Request) {
		n.logger.Println("Method [", h.Method, "] - Hit path :", h.URL.Path)
		rw.Header().Add("Content-Type", "application/json")
		next.ServeHTTP(rw, h)
	})
}
