package handlers

import (
	"analytics-service/customLogger"
	"analytics-service/domain"
	"analytics-service/repository"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"github.com/eapache/go-resiliency/retrier"
	"github.com/gorilla/mux"
	"github.com/nats-io/nats.go"
	"github.com/sony/gobreaker"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

type AnalyticsHandler struct {
	logger     *log.Logger
	repo       *repository.AnalyticsRepo
	custLogger *customLogger.Logger
	tracer     trace.Tracer
}

type KeyUserID struct{}
type KeyRole struct{}

func NewAnalyticsHandler(l *log.Logger, r *repository.AnalyticsRepo, custLogger *customLogger.Logger, tracer trace.Tracer) *AnalyticsHandler {
	return &AnalyticsHandler{l, r, custLogger, tracer}
}

func (n *AnalyticsHandler) NotificationListener() {
	n.logger.Println("Notification listener started")
	ctx, span := n.tracer.Start(context.Background(), "AnalyticsHandler.NotificationListener")
	defer span.End()
	n.logger.Println("method started")
	nc, err := Conn()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Fatal("Error connecting to NATS:", err)
	}
	defer nc.Close()

	wrapHandler := func(handler func(context.Context, *nats.Msg)) nats.MsgHandler {
		return func(msg *nats.Msg) {
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

	subscribe("project.created", n.handleProjectCreated)
	subscribe("member.added", n.handleProjectJoined)
	subscribe("member.task.added", n.handleTaskJoined)
	subscribe("member.removed", n.handleProjectMemberRemoved)
	subscribe("member.task.removed", n.handleTaskMemberRemoved)
	subscribe("task.created", n.handleTaskCreated)
	subscribe("task.status.change", n.handleTaskStatusUpdate)

	select {}
}

func (n *AnalyticsHandler) handleProjectCreated(ctx context.Context, msg *nats.Msg) {
	ctx, span := n.tracer.Start(ctx, "AnalyticsHandler.handleProjectJoined")
	defer span.End()

	var data struct {
		ProjectID string `json:"projectId"`
		EndDate   string `json:"endDate"`
	}
	if err := json.Unmarshal(msg.Data, &data); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.logger.Println("Error unmarshalling project.joined message:", err)
		return
	}
	message := fmt.Sprintf("Sucessfully created project %s", data.ProjectID)

	err := n.repo.CreateProject(ctx, data.ProjectID, data.EndDate)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Error creating project analytics")
		n.logger.Println("Error creating project analytics:", err)
	}
	span.SetStatus(codes.Ok, message)
}

func (n *AnalyticsHandler) handleProjectJoined(ctx context.Context, msg *nats.Msg) {
	ctx, span := n.tracer.Start(ctx, "AnalyticsHandler.handleProjectJoined")
	defer span.End()

	var data struct {
		ProjectID string `json:"projectId"`
		MemberID  string `json:"memberId"`
	}
	if err := json.Unmarshal(msg.Data, &data); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.logger.Println("Error unmarshalling member.added message:", err)
		return
	}

	err := n.repo.AddMemberToProject(ctx, data.ProjectID, data.MemberID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Error adding member to project analytics")
		n.logger.Println("Error adding member to project analytics:", err)
	}
	span.SetStatus(codes.Ok, "")
}

func (n *AnalyticsHandler) handleTaskJoined(ctx context.Context, msg *nats.Msg) {
	ctx, span := n.tracer.Start(ctx, "AnalyticsHandler.handleTaskJoined")
	defer span.End()

	var data struct {
		ProjectID string `json:"projectId"`
		TaskID    string `json:"taskId"`
		MemberID  string `json:"memberId"`
	}
	if err := json.Unmarshal(msg.Data, &data); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.logger.Println("Error unmarshalling member.task.added message:", err)
		return
	}

	err := n.repo.AssignTaskToUser(ctx, data.ProjectID, data.TaskID, data.MemberID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Error assigning task to user in analytics")
		n.logger.Println("Error assigning task to user in analytics:", err)
	}
	span.SetStatus(codes.Ok, "")
}

func (n *AnalyticsHandler) handleProjectMemberRemoved(ctx context.Context, msg *nats.Msg) {
	ctx, span := n.tracer.Start(ctx, "AnalyticsHandler.handleProjectMemberRemoved")
	defer span.End()

	var data struct {
		ProjectID string `json:"projectId"`
		MemberID  string `json:"memberId"`
	}
	if err := json.Unmarshal(msg.Data, &data); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.logger.Println("Error unmarshalling member.removed message:", err)
		return
	}

	err := n.repo.RemoveProjectMember(ctx, data.ProjectID, data.MemberID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Error removing project member from project")
		n.logger.Println("Error removing project member from project:", err)
	}
	span.SetStatus(codes.Ok, "")
}

func (n *AnalyticsHandler) handleTaskMemberRemoved(ctx context.Context, msg *nats.Msg) {
	ctx, span := n.tracer.Start(ctx, "AnalyticsHandler.handleTaskRemoved")
	defer span.End()

	var data struct {
		ProjectID string `json:"projectId"`
		TaskID    string `json:"taskId"`
		MemberID  string `json:"memberId"`
	}
	if err := json.Unmarshal(msg.Data, &data); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.logger.Println("Error unmarshalling member.task.removed message:", err)
		return
	}

	err := n.repo.RemoveTaskMember(ctx, data.ProjectID, data.TaskID, data.MemberID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Error removing task from analytics")
		n.logger.Println("Error removing task from analytics:", err)
	}
	span.SetStatus(codes.Ok, "")
}

func (n *AnalyticsHandler) handleTaskCreated(ctx context.Context, msg *nats.Msg) {
	ctx, span := n.tracer.Start(ctx, "AnalyticsHandler.handleTaskCreated")
	defer span.End()

	var data struct {
		ProjectID string `json:"projectId"`
		TaskID    string `json:"taskId"`
	}
	if err := json.Unmarshal(msg.Data, &data); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.logger.Println("Error unmarshalling task.created message:", err)
		return
	}

	err := n.repo.CreateTask(ctx, data.ProjectID, data.TaskID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Error adding task to analytics")
		n.logger.Println("Error adding task to analytics:", err)
	}
	span.SetStatus(codes.Ok, "")
}

func (n *AnalyticsHandler) handleTaskStatusUpdate(ctx context.Context, msg *nats.Msg) {
	ctx, span := n.tracer.Start(ctx, "AnalyticsHandler.handleTaskStatusUpdate")
	defer span.End()

	var data struct {
		ProjectID string `json:"projectId"`
		TaskID    string `json:"taskId"`
		Status    string `json:"status"`
	}
	if err := json.Unmarshal(msg.Data, &data); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		n.logger.Println("Error unmarshalling task.status.change message:", err)
		return
	}

	err := n.repo.UpdateTaskStatus(ctx, data.ProjectID, data.TaskID, data.Status)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Error updating task status in analytics")
		n.logger.Println("Error updating task status in analytics:", err)
	}
	span.SetStatus(codes.Ok, "")
}

func (ah *AnalyticsHandler) GetProjectAnalyticsHandler(w http.ResponseWriter, r *http.Request) {
	_, span := ah.tracer.Start(r.Context(), "AnalyticsRepo.GetProjectAnalyticsHandler")
	defer span.End()

	projectID := mux.Vars(r)["projectID"]

	ah.logger.Printf("[INFO] Handling request to get analytics for projectID=%s", projectID)

	projectData, err := ah.repo.GetProjectAnalytics(r.Context(), projectID)
	if err != nil {
		ah.logger.Printf("[ERROR] Error fetching project analytics for projectID=%s: %v", projectID, err)
		http.Error(w, fmt.Sprintf("Error fetching project analytics: %v", err), http.StatusInternalServerError)
		return
	}

	ah.logger.Printf("[INFO] Successfully fetched analytics for projectID=%s", projectID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(projectData); err != nil {
		ah.logger.Printf("[ERROR] Error encoding project analytics to JSON: %v", err)
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (n *AnalyticsHandler) MiddlewareExtractUserFromCookie(next http.Handler) http.Handler {
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

		ctx := context.WithValue(h.Context(), KeyUserID{}, userID)
		ctx = context.WithValue(ctx, KeyRole{}, role)

		h = h.WithContext(ctx)

		n.custLogger.Info(nil, "UserID and role added to context")

		next.ServeHTTP(rw, h)
	})
}

func (n *AnalyticsHandler) verifyTokenWithUserService(ctx context.Context, token string) (string, string, error) {
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

func (uh *AnalyticsHandler) MiddlewareCheckRoles(allowedRoles []string, next http.Handler) http.Handler {
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
