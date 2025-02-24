package handlers

import (
	"analytics-service/customLogger"
	"analytics-service/model"
	"analytics-service/repository"
	"context"
	"encoding/json"
	"errors"
	"github.com/gorilla/mux"
	"github.com/nats-io/nats.go"
	"github.com/sirupsen/logrus"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
	"log"
	"net/http"
	"os"
)

// EventHandler processes events for both HTTP and internal event processing.
type EventHandler struct {
	repo       *repository.ESDBClient
	tracer     trace.Tracer
	logger     *log.Logger
	custLogger *customLogger.Logger
}

// NewEventHandler creates a new EventHandler with a given repository.
func NewEventHandler(repo *repository.ESDBClient, tracer trace.Tracer, logger *log.Logger) *EventHandler {
	return &EventHandler{repo: repo, tracer: tracer, logger: logger}
}

func ExtractTraceInfoMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := otel.GetTextMapPropagator().Extract(r.Context(), propagation.HeaderCarrier(r.Header))
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (h *EventHandler) ProcessEventHandler(w http.ResponseWriter, r *http.Request) {
	ctx, span := h.tracer.Start(r.Context(), "EventHandler.ProcessEventHandler")
	defer span.End()
	var event model.Event
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&event); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(w, "Failed to decode event data", http.StatusBadRequest)
		return
	}

	message, err := h.processEvent(ctx, event)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(w, "Failed to process event", http.StatusInternalServerError)
		return
	}

	if message != "" {
		span.SetStatus(codes.Ok, message)
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(message))
	} else {
		span.RecordError(errors.New("Failed to process event"))
		span.SetStatus(codes.Error, "Failed to process event")
		http.Error(w, "Event type not handled", http.StatusBadRequest)
	}
}

func (h *EventHandler) GetEventsHandler(w http.ResponseWriter, r *http.Request) {
	ctx, span := h.tracer.Start(r.Context(), "EventHandler.GetEventsHandler")
	defer span.End()
	// Extract the projectID variable from the URL
	vars := mux.Vars(r)
	projectID := vars["projectID"]
	if projectID == "" {
		span.RecordError(errors.New("projectID is required"))
		span.SetStatus(codes.Error, "projectID is required")
		http.Error(w, "Missing projectID parameter", http.StatusBadRequest)
		return
	}

	// Fetch events for the given project
	events, err := h.repo.GetEventsByProjectID(ctx, projectID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(w, "Failed to retrieve events", http.StatusInternalServerError)
		return
	}

	// Respond with a JSON array of events
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(events); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		http.Error(w, "Failed to encode events", http.StatusInternalServerError)
	}
	span.SetStatus(codes.Ok, "")
}

func (h *EventHandler) processEvent(ctx context.Context, event model.Event) (string, error) {
	ctx, span := h.tracer.Start(ctx, "EventHandler.processEvent")
	defer span.End()
	var message string
	switch event.Type {
	case model.ProjectCreatedType:
		if err := h.repo.StoreEvent(ctx, event.ProjectID, event); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to store event: %v", err)
			return "", err
		}
		message = "Successfully created a project"

		eventJSON, err := json.Marshal(event.Event)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to marshal event: %v", err)
			return "", err
		}

		var projectCreatedEvent model.ProjectCreatedEvent
		if err := json.Unmarshal(eventJSON, &projectCreatedEvent); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to unmarshal event to ProjectCreatedEvent: %v", err)
			return "", err
		}

		subject := "project.created"
		message4nats := struct {
			ProjectID string `json:"projectId"`
			EndDate   string `json:"endDate"`
		}{
			ProjectID: event.ProjectID,
			EndDate:   projectCreatedEvent.EndDate,
		}

		if err := h.sendNotification(ctx, subject, message4nats); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to send notification: %v", err)
			return "", err
		}

	case model.MemberAddedType:
		if err := h.repo.StoreEvent(ctx, event.ProjectID, event); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to store event: %v", err)
			return "", err
		}
		message = "Successfully added member to project"

		eventJSON, err := json.Marshal(event.Event)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to marshal event: %v", err)
			return "", err
		}

		var memberAddedProjectEvent model.MemberAddedToProjectEvent
		if err := json.Unmarshal(eventJSON, &memberAddedProjectEvent); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to unmarshal event to MemberAddedProjectEvent: %v", err)
			return "", err
		}

		subject := "member.added"
		message4nats := struct {
			ProjectID string `json:"projectId"`
			MemberID  string `json:"memberId"`
		}{
			ProjectID: event.ProjectID,
			MemberID:  memberAddedProjectEvent.MemberID,
		}
		if err := h.sendNotification(ctx, subject, message4nats); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to send notification: %v", err)
			return "", err
		}
	case model.MemberRemovedType:
		if err := h.repo.StoreEvent(ctx, event.ProjectID, event); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to store event: %v", err)
			return "", err
		}
		message = "Successfully removed member from project"

		eventJSON, err := json.Marshal(event.Event)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to marshal event: %v", err)
			return "", err
		}

		var memberRemovedProjectEvent model.MemberRemovedFromProjectEvent
		if err := json.Unmarshal(eventJSON, &memberRemovedProjectEvent); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to unmarshal event to MemberRemovedProjectEvent: %v", err)
			return "", err
		}

		subject := "member.removed"
		message4nats := struct {
			ProjectID string `json:"projectId"`
			MemberID  string `json:"memberId"`
		}{
			ProjectID: event.ProjectID,
			MemberID:  memberRemovedProjectEvent.MemberID,
		}
		if err := h.sendNotification(ctx, subject, message4nats); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to send notification: %v", err)
			return "", err
		}
	case model.MemberAddedTaskType:
		if err := h.repo.StoreEvent(ctx, event.ProjectID, event); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to store event: %v", err)
			return "", err
		}
		message = "Successfully added member to task"

		eventJSON, err := json.Marshal(event.Event)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to marshal event: %v", err)
			return "", err
		}

		var memberAddedTaskEvent model.MemberAddedToTaskEvent
		if err := json.Unmarshal(eventJSON, &memberAddedTaskEvent); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to unmarshal event to MemberAddedTaskEvent: %v", err)
			return "", err
		}

		subject := "member.task.added"
		message4nats := struct {
			ProjectID string `json:"projectId"`
			TaskID    string `json:"taskId"`
			MemberID  string `json:"memberId"`
		}{
			ProjectID: event.ProjectID,
			TaskID:    memberAddedTaskEvent.TaskID,
			MemberID:  memberAddedTaskEvent.MemberID,
		}
		if err := h.sendNotification(ctx, subject, message4nats); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to send notification: %v", err)
			return "", err
		}
	case model.MemberRemovedTaskType:
		if err := h.repo.StoreEvent(ctx, event.ProjectID, event); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to store event: %v", err)
			return "", err
		}
		message = "Successfully removed member from task"

		eventJSON, err := json.Marshal(event.Event)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to marshal event: %v", err)
			return "", err
		}

		var memberRemovedTaskEvent model.MemberRemovedFromTaskEvent
		if err := json.Unmarshal(eventJSON, &memberRemovedTaskEvent); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to unmarshal event to MemberRemovedTaskEvent: %v", err)
			return "", err
		}

		subject := "member.task.removed"
		message4nats := struct {
			ProjectID string `json:"projectId"`
			TaskID    string `json:"taskId"`
			MemberID  string `json:"memberId"`
		}{
			ProjectID: event.ProjectID,
			TaskID:    memberRemovedTaskEvent.TaskID,
			MemberID:  memberRemovedTaskEvent.MemberID,
		}
		if err := h.sendNotification(ctx, subject, message4nats); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to send notification: %v", err)
			return "", err
		}
	case model.TaskCreatedType:
		if err := h.repo.StoreEvent(ctx, event.ProjectID, event); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to store event: %v", err)
			return "", err
		}
		message = "Successfully created task"

		eventJSON, err := json.Marshal(event.Event)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to marshal event: %v", err)
			return "", err
		}

		var taskCreated model.TaskCreatedEvent
		if err := json.Unmarshal(eventJSON, &taskCreated); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to unmarshal event to TaskCreated: %v", err)
			return "", err
		}

		subject := "task.created"
		message4nats := struct {
			ProjectID string `json:"projectId"`
			TaskID    string `json:"taskId"`
		}{
			ProjectID: event.ProjectID,
			TaskID:    taskCreated.TaskID,
		}
		if err := h.sendNotification(ctx, subject, message4nats); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to send notification: %v", err)
			return "", err
		}
	case model.TaskStatusChangedType:
		if err := h.repo.StoreEvent(ctx, event.ProjectID, event); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to store event: %v", err)
			return "", err
		}
		message = "Successfully changed task status"

		eventJSON, err := json.Marshal(event.Event)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to marshal event: %v", err)
			return "", err
		}

		var taskStatusChanged model.TaskStatusChangedEvent
		if err := json.Unmarshal(eventJSON, &taskStatusChanged); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to unmarshal event to TaskStatusChanged: %v", err)
			return "", err
		}

		subject := "task.status.change"
		message4nats := struct {
			ProjectID string `json:"projectId"`
			TaskID    string `json:"taskId"`
			Status    string `json:"status"`
		}{
			ProjectID: event.ProjectID,
			TaskID:    taskStatusChanged.TaskID,
			Status:    taskStatusChanged.Status,
		}
		if err := h.sendNotification(ctx, subject, message4nats); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to send notification: %v", err)
			return "", err
		}
	case model.DocumentAddedType:
		if err := h.repo.StoreEvent(ctx, event.ProjectID, event); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to store event: %v", err)
			return "", err
		}
		message = "Successfully added document"
	default:
		span.RecordError(errors.New("unhandled event type"))
		span.SetStatus(codes.Error, "Unhandled event type")
		log.Printf("Unhandled event type: %s\n", event.Type)
		return "", nil
	}
	span.SetStatus(codes.Ok, "")
	return message, nil
}

func (p *EventHandler) sendNotification(ctx context.Context, subject string, message interface{}) error {
	_, span := p.tracer.Start(ctx, "ProjectsHandler.SendNotification")
	defer span.End()
	nc, err := Conn()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Println("Error connecting to NATS:", err)
		p.logger.Println("Error connecting to NATS:", err)
		p.custLogger.Error(logrus.Fields{
			"error": err.Error(),
		}, "Failed to connect to NATS")
	}
	defer nc.Close()

	jsonMessage, err := json.Marshal(message)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Println("Error marshalling message:", err)
		p.logger.Println("Error marshalling message:", err)

	}

	err = nc.Publish(subject, jsonMessage)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Println("Error publishing message to NATS:", err)
		p.logger.Println("Error publishing message to NATS:", err)
	}

	p.logger.Println("Notification sent:", subject)
	return nil
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
