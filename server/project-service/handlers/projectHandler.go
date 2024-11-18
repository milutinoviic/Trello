package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/gorilla/mux"
	"github.com/nats-io/nats.go"
	"log"
	"net/http"
	"project-service/model"
	"project-service/repositories"
	"strconv"
	"strings"
)

type KeyProject struct{}
type KeyRole struct{}

type ProjectsHandler struct {
	logger *log.Logger
	// NoSQL: injecting product repository
	repo *repositories.ProjectRepo
}

func (p *ProjectsHandler) MiddlewareExtractUserFromCookie(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, h *http.Request) {
		cookie, err := h.Cookie("auth_token")
		if err != nil {
			http.Error(rw, "No token found in cookie", http.StatusUnauthorized)
			p.logger.Println("No token in cookie:", err)
			return
		}

		userID, role, err := p.verifyTokenWithUserService(cookie.Value)
		if err != nil {
			http.Error(rw, "Invalid token", http.StatusUnauthorized)
			p.logger.Println("Invalid token:", err)
			return
		}

		ctx := context.WithValue(h.Context(), KeyProject{}, userID)
		ctx = context.WithValue(ctx, KeyRole{}, role)

		h = h.WithContext(ctx)

		next.ServeHTTP(rw, h)
	})
}

func (p *ProjectsHandler) verifyTokenWithUserService(token string) (string, string, error) {
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

	err = json.NewDecoder(resp.Body).Decode(&result)
	if err != nil {
		return "", "", err
	}

	return result.UserID, result.Role, nil
}

func NewProjectsHandler(l *log.Logger, r *repositories.ProjectRepo) *ProjectsHandler {
	return &ProjectsHandler{l, r}
}

func (p *ProjectsHandler) GetAllProjects(rw http.ResponseWriter, h *http.Request) {
	projects, err := p.repo.GetAll()
	if err != nil {
		p.logger.Print("Database exception: ", err)
	}

	if projects == nil {
		return
	}

	err = projects.ToJSON(rw)
	if err != nil {
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		p.logger.Fatal("Unable to convert to json :", err)
		return
	}
}

func (p *ProjectsHandler) GetAllProjectsByUser(rw http.ResponseWriter, h *http.Request) {
	role, e := h.Context().Value(KeyRole{}).(string)
	if !e {
		http.Error(rw, "Role not defined", http.StatusBadRequest)
		return
	}
	userId, ok := h.Context().Value(KeyProject{}).(string)
	if !ok {
		http.Error(rw, "User ID not found", http.StatusUnauthorized)
		p.logger.Println("User ID not found in context")
		return
	}
	var projects model.Projects
	var err error
	p.logger.Println("USER ID JE " + userId)
	if role == "manager" {
		projects, err = p.repo.GetAllByManager(userId)
	} else if role == "member" {
		projects, err = p.repo.GetAllByMember(userId)
	} else {
		http.Error(rw, "Invalid role specified", http.StatusBadRequest)
		return
	}

	if err != nil {
		p.logger.Print("Database exception: ", err)
		http.Error(rw, "Database error", http.StatusInternalServerError)
		return
	}
	if projects == nil {
		http.Error(rw, "No projects found", http.StatusNotFound)
		return
	}

	err = projects.ToJSON(rw)
	if err != nil {
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		p.logger.Fatal("Unable to convert to json :", err)
		return
	}
}

func (p *ProjectsHandler) GetProjectById(rw http.ResponseWriter, h *http.Request) {
	vars := mux.Vars(h)
	id := vars["id"]

	project, err := p.repo.GetById(id)
	if err != nil {
		p.logger.Print("Database exception: ", err)
	}

	if project == nil {
		http.Error(rw, "Patient with given id not found", http.StatusNotFound)
		p.logger.Printf("Patient with id: '%s' not found", id)
		return
	}

	err = project.ToJSON(rw)
	if err != nil {
		http.Error(rw, "Unable to convert to json", http.StatusInternalServerError)
		p.logger.Fatal("Unable to convert to json :", err)
		return
	}
}

func (p *ProjectsHandler) PostProject(rw http.ResponseWriter, h *http.Request) {
	patient := h.Context().Value(KeyProject{}).(*model.Project)
	p.repo.Insert(patient)
	rw.WriteHeader(http.StatusCreated)
}

func (p *ProjectsHandler) MiddlewareContentTypeSet(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, h *http.Request) {
		p.logger.Println("Method [", h.Method, "] - Hit path :", h.URL.Path)

		rw.Header().Add("Content-Type", "application/json")

		next.ServeHTTP(rw, h)
	})
}

func (p *ProjectsHandler) MiddlewarePatientDeserialization(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, h *http.Request) {
		patient := &model.Project{}
		err := patient.FromJSON(h.Body)
		if err != nil {
			http.Error(rw, "Unable to decode json", http.StatusBadRequest)
			p.logger.Fatal(err)
			return
		}

		ctx := context.WithValue(h.Context(), KeyProject{}, patient)
		h = h.WithContext(ctx)

		next.ServeHTTP(rw, h)
	})
}

func (p *ProjectsHandler) AddUsersToProject(rw http.ResponseWriter, h *http.Request) {
	vars := mux.Vars(h)
	projectId := vars["id"]

	var userIds []string
	err := json.NewDecoder(h.Body).Decode(&userIds)
	if err != nil {
		http.Error(rw, "Unable to decode json", http.StatusBadRequest)
		return
	}

	project, err := p.repo.GetById(projectId)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	userId, ok := h.Context().Value(KeyProject{}).(string)
	if !ok {
		http.Error(rw, "User ID not found", http.StatusUnauthorized)
		p.logger.Println("User ID not found in context")
		return
	}

	if project.Manager != userId {
		http.Error(rw, "Only the project manager can add users", http.StatusForbidden)
		return
	}

	if !hasActiveTasksPlaceholder() {
		http.Error(rw, "Cannot add users to a project without active tasks", http.StatusForbidden)
		return
	}

	maxMembers, err := strconv.Atoi(project.MaxMembers)
	if err != nil {
		http.Error(rw, "Invalid maximum members value", http.StatusInternalServerError)
		return
	}

	minMembers, err := strconv.Atoi(project.MinMembers)
	if err != nil {
		http.Error(rw, "Invalid minimum members value", http.StatusInternalServerError)
		return
	}

	currentMembersCount := len(userIds)

	if currentMembersCount > maxMembers {
		http.Error(rw, "Cannot add more users than the maximum limit", http.StatusForbidden)
		return
	}

	if currentMembersCount < minMembers {
		http.Error(rw, "Cannot add users to a project without meeting the minimum member requirement", http.StatusForbidden)
		return
	}

	err = p.repo.AddUsersToProject(projectId, userIds)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	nc, err := Conn()
	if err != nil {
		log.Println("Error connecting to NATS:", err)
		http.Error(rw, "Failed to connect to message broker", http.StatusInternalServerError)
		return
	}
	defer nc.Close()

	for _, uid := range userIds {
		subject := "project.joined"

		message := struct {
			UserID      string `json:"userId"`
			ProjectName string `json:"projectName"`
		}{
			UserID:      uid,
			ProjectName: project.Name,
		}

		jsonMessage, err := json.Marshal(message)
		if err != nil {
			log.Println("Error marshalling message:", err)
			continue
		}

		err = nc.Publish(subject, jsonMessage)
		if err != nil {
			log.Println("Error publishing message to NATS:", err)
		}
	}
	p.logger.Println("a message has been sent")

	rw.WriteHeader(http.StatusNoContent)
}

func Conn() (*nats.Conn, error) {
	conn, err := nats.Connect("nats://nats:4222")
	if err != nil {
		log.Fatal(err)
		return nil, err
	}
	return conn, nil
}

func (p *ProjectsHandler) RemoveUserFromProject(rw http.ResponseWriter, h *http.Request) {
	vars := mux.Vars(h)
	projectId := vars["id"]
	userId := vars["userId"]

	err := p.repo.RemoveUserFromProject(projectId, userId)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	rw.WriteHeader(http.StatusOK)
}

func hasActiveTasksPlaceholder() bool {
	return true
}

func (uh *ProjectsHandler) MiddlewareCheckRoles(allowedRoles []string, next http.Handler) http.Handler {
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

func (p *ProjectsHandler) IsUserInProject(rw http.ResponseWriter, h *http.Request) {
	vars := mux.Vars(h)
	projectID := vars["id"]
	userID := vars["userId"]

	isMember := p.isUserInProject(projectID, userID)

	if isMember {
		rw.WriteHeader(http.StatusOK)
		json.NewEncoder(rw).Encode(map[string]bool{"is_member": true})
	} else {
		rw.WriteHeader(http.StatusNotFound)
		json.NewEncoder(rw).Encode(map[string]bool{"is_member": false})
	}
}

func (p *ProjectsHandler) isUserInProject(projectID, userID string) bool {
	project, err := p.repo.GetById(projectID)
	if err != nil {
		p.logger.Println("Error fetching project:", err)
		return false
	}

	return contains(project.UserIDs, userID)
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
