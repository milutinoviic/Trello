package utils

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
)

type RecaptchaResponse struct {
	Success     bool     `json:"success"`
	ChallengeTS string   `json:"challenge_ts"`
	Hostname    string   `json:"hostname"`
	ErrorCodes  []string `json:"error-codes"`
}

func VerifyRecaptcha(token string) (bool, error) {
	if token == "" {
		fmt.Println("token is empty")
		log.Println("Empty reCAPTCHA token")
		return false, errors.New("empty reCAPTCHA token")
	}

	secret := os.Getenv("RECAPTCHA_SECRET_KEY")
	resp, err := http.PostForm("https://www.google.com/recaptcha/api/siteverify",
		url.Values{"secret": {secret}, "response": {token}})

	if err != nil {
		fmt.Println(err)
		log.Println("Error calling reCAPTCHA API:", err)
		return false, err
	}
	defer resp.Body.Close()

	// Decode the response
	var recaptchaResp RecaptchaResponse
	if err := json.NewDecoder(resp.Body).Decode(&recaptchaResp); err != nil {
		fmt.Println(err)
		log.Println("Error decoding reCAPTCHA response:", err)
		return false, err
	}

	if !recaptchaResp.Success {
		fmt.Println("recaptcha failed:", recaptchaResp.ErrorCodes)
		log.Println("reCAPTCHA verification failed:", recaptchaResp.ErrorCodes)
		return false, errors.New("reCAPTCHA verification failed")
	}

	return true, nil
}
