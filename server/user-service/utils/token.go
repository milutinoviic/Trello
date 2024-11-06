package utils

import (
	"fmt"
	"github.com/golang-jwt/jwt"
	"os"
	"time"
)

func CreateToken(email string, role string) (string, error) {
	key := os.Getenv("SECRET_KEY")
	var secretKey = []byte((key))

	token := jwt.NewWithClaims(jwt.SigningMethodHS256,
		jwt.MapClaims{
			"email": email,
			"role":  role,
			"exp":   time.Now().Add(time.Hour * 2).Unix(),
		})

	tokenString, err := token.SignedString(secretKey)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

func ParseTokenClaims(tokenString string) (jwt.MapClaims, error) {
	token, _ := jwt.Parse(tokenString, nil)
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}
	return claims, nil
}
