package client

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/propagation"
	"io"
	"log"
	"net/http"
)

type TaskClient struct {
	address string
}

func NewTaskClient(host, port string) TaskClient {

	return TaskClient{
		address: fmt.Sprintf("https://%s:%s", host, port),
	}
}

func (client TaskClient) GetTasksByProjectId(projectId string, cookie *http.Cookie) ([]*TaskDetails, error) {
	// Prepare the URL for the request
	requestURL := client.address + "/tasksDetails/" + projectId
	httpReq, err := http.NewRequest(http.MethodGet, requestURL, nil)
	if err != nil {
		log.Printf("Error creating HTTP request: %v", err)
		return nil, errors.New("error while creating request")
	}
	httpReq.Header.Set("Content-Type", "application/json")

	// Attach the cookie to the request for authentication
	httpReq.AddCookie(cookie)
	httpReq.Header.Set("Content-Type", "application/json")

	// Send the request to the TaskService
	clientTask, err := createTLSClient()
	res, err := clientTask.Do(httpReq)
	if err != nil {
		log.Printf("Error sending request: %v", err)
		return nil, errors.New("error while sending the request")
	}
	otel.GetTextMapPropagator().Inject(context.Background(), propagation.HeaderCarrier(httpReq.Header))
	defer res.Body.Close()

	// Check if the status code is OK (200)
	if res.StatusCode != http.StatusOK {
		log.Printf("Received non-OK status code: %d", res.StatusCode)
		body, _ := io.ReadAll(res.Body) // Read the error message body for debugging
		log.Printf("Error response body: %s", string(body))
		return nil, fmt.Errorf("error while getting tasks: %s", res.Status)
	}

	// Decode the response body into a list of tasks
	var tasks []*TaskDetails
	err = json.NewDecoder(res.Body).Decode(&tasks)
	if err != nil {
		log.Printf("Error decoding response body: %v", err)
		return nil, errors.New("error decoding task details")
	}

	return tasks, nil
}
