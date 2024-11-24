package client

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
)

type UserClient struct {
	address string
}

func NewUserClient(host, port string) UserClient {
	return UserClient{
		address: fmt.Sprintf("http://%s:%s", host, port),
	}
}

// GetById retrieves the details of a single user by their ID
func (client UserClient) GetById(id string) (*UserDetails, error) {
	requestURL := client.address + "/" + id
	httpReq, err := http.NewRequest(http.MethodGet, requestURL, nil)
	if err != nil {
		log.Println(err)
		return nil, errors.New("error while getting user details")
	}

	res, err := http.DefaultClient.Do(httpReq)
	if err != nil || res.StatusCode != http.StatusOK {
		log.Println(err)
		log.Println(res.StatusCode)
		return nil, errors.New("error while getting user details")
	}

	user := &UserDetails{}
	err = json.NewDecoder(res.Body).Decode(user)
	if err != nil {
		log.Println(err)
		return nil, errors.New("error decoding response")
	}

	return user, nil

}

func (client UserClient) GetByIdsWithCookies(ids []string, cookie *http.Cookie) ([]*UserDetails, error) {
	if len(ids) == 0 {
		// Return an empty list if no IDs are provided
		return []*UserDetails{}, nil
	}
	// Use the existing struct for the request body
	req := UserIdsRequest{UserIds: ids}

	// Marshal request into JSON
	reqBytes, err := json.Marshal(req)
	if err != nil {
		log.Printf("Error marshalling request body: %v", err)
		return nil, err
	}

	// Prepare the request body
	bodyReader := bytes.NewReader(reqBytes)
	requestURL := client.address + "/users/details"
	httpReq, err := http.NewRequest(http.MethodPost, requestURL, bodyReader)
	if err != nil {
		log.Printf("Error creating HTTP request: %v", err)
		return nil, errors.New("error while creating the request")
	}

	// Step 1: Attach the received cookie to the outgoing request
	httpReq.AddCookie(cookie)

	// Step 2: Send the request
	res, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		log.Printf("Error sending request: %v", err)
		return nil, errors.New("error while sending the request")
	}
	defer res.Body.Close() // Ensure body is closed after reading

	// Step 3: Check for non-OK status
	if res.StatusCode != http.StatusOK {
		log.Printf("Received non-OK status code: %d", res.StatusCode)
		body, _ := io.ReadAll(res.Body) // Read the error message body for debugging
		log.Printf("Error response body: %s", string(body))
		return nil, fmt.Errorf("error while getting user details: %s", res.Status)
	}

	// Step 4: Decode the response body into users
	var users []*UserDetails
	err = json.NewDecoder(res.Body).Decode(&users)
	if err != nil {
		log.Printf("Error decoding response body: %v", err)
		return nil, errors.New("error decoding response for multiple users")
	}

	return users, nil
}
