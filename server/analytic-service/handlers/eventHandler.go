package handlers

import (
	"analytics-service/model"
	"analytics-service/repository"
	"context"
	"encoding/json"
	"errors"
	"github.com/gorilla/mux"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
	"log"
	"net/http"
)

// EventHandler processes events for both HTTP and internal event processing.
type EventHandler struct {
	repo   *repository.ESDBClient
	tracer trace.Tracer
}

// NewEventHandler creates a new EventHandler with a given repository.
func NewEventHandler(repo *repository.ESDBClient, tracer trace.Tracer) *EventHandler {
	return &EventHandler{repo: repo, tracer: tracer}
}

func ExtractTraceInfoMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := otel.GetTextMapPropagator().Extract(r.Context(), propagation.HeaderCarrier(r.Header))
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// ProcessEventHandler will handle HTTP requests to process events (POST)
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

// GetEventsHandler will handle HTTP requests to get events for a specific project (GET)
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
	case model.MemberAddedType:
		if err := h.repo.StoreEvent(ctx, event.ProjectID, event); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to store event: %v", err)
			return "", err
		}
		message = "Successfully added member to project"
	case model.MemberRemovedType:
		if err := h.repo.StoreEvent(ctx, event.ProjectID, event); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to store event: %v", err)
			return "", err
		}
		message = "Successfully removed member from project"
	case model.MemberAddedTaskType:
		if err := h.repo.StoreEvent(ctx, event.ProjectID, event); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to store event: %v", err)
			return "", err
		}
		message = "Successfully added member to task"
	case model.MemberRemovedTaskType:
		if err := h.repo.StoreEvent(ctx, event.ProjectID, event); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to store event: %v", err)
			return "", err
		}
		message = "Successfully removed member from task"
	case model.TaskCreatedType:
		if err := h.repo.StoreEvent(ctx, event.ProjectID, event); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to store event: %v", err)
			return "", err
		}
		message = "Successfully created task"
	case model.TaskStatusChangedType:
		if err := h.repo.StoreEvent(ctx, event.ProjectID, event); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			log.Printf("Failed to store event: %v", err)
			return "", err
		}
		message = "Successfully changed task status"
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
