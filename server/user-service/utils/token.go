package utils

import (
	"fmt"
	"github.com/golang-jwt/jwt"
	"os"
	"time"
)

func CreateToken(email string, role string, userID string) (string, error) {
	key := os.Getenv("SECRET_KEY")
	var secretKey = []byte(key)

	token := jwt.NewWithClaims(jwt.SigningMethodHS256,
		jwt.MapClaims{
			"email":   email,
			"role":    role,
			"user_id": userID,
			"exp":     time.Now().Add(time.Hour * 2).Unix(),
		})

	// Sign the token with the secret key
	tokenString, err := token.SignedString(secretKey)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

func ParseTokenClaims(tokenString string) (jwt.MapClaims, error) {
	key := os.Getenv("SECRET_KEY")

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(key), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}
