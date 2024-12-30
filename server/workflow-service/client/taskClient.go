package client

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/propagation"
	"io"
	"io/ioutil"
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

func (client TaskClient) GetByProjectIdWithCookies(projectId string, cookie *http.Cookie) ([]*Task, error) {

	requestURL := client.address + "/tasks/" + projectId
	httpReq, err := http.NewRequest(http.MethodGet, requestURL, nil)
	if err != nil {
		log.Printf("Error creating HTTP request: %v", err)
		return nil, errors.New("error while creating the request")
	}

	httpReq.AddCookie(cookie)
	otel.GetTextMapPropagator().Inject(context.Background(), propagation.HeaderCarrier(httpReq.Header))

	clientTask, err := createTLSClient()
	res, err := clientTask.Do(httpReq)
	if err != nil {
		log.Printf("Error sending request: %v", err)
		return nil, errors.New("error while sending the request")
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		log.Printf("Received non-OK status code: %d", res.StatusCode)
		body, _ := io.ReadAll(res.Body) // Read the error message body for debugging
		log.Printf("Error response body: %s", string(body))
		return nil, fmt.Errorf("error while getting user details: %s", res.Status)
	}

	var tasks []*Task
	err = json.NewDecoder(res.Body).Decode(&tasks)
	if err != nil {
		log.Printf("Error decoding response body: %v", err)
		return nil, errors.New("error decoding response for task")
	}

	return tasks, nil
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
