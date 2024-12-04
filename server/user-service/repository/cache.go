package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/go-redis/redis"
	"github.com/golang-jwt/jwt"
	"go.mongodb.org/mongo-driver/bson"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	"golang.org/x/crypto/bcrypt"
	"log"
	"main.go/data"
	"main.go/utils"
	"net/smtp"
	"os"
	"time"
)

type UserCache struct {
	cli            *redis.Client
	log            *log.Logger
	userRepository *UserRepository
	tracer         trace.Tracer
}

const (
	cacheRequestConstruct = "requests:%s"
	cacheUserConstruct    = "activeUser:%s"
	cacheMagicConstruct   = "magic:%s"
	cacheMagic            = "magic"
	cacheRequests         = "requests"
	cacheUser             = "activeUser"
)

func constructKeyForRequest(id string) string {
	return fmt.Sprintf(cacheRequestConstruct, id)
}

func constructKeyForUser(id string) string {
	return fmt.Sprintf(cacheUserConstruct, id)
}

func constructKeyForMagic(email string) string {
	return fmt.Sprintf(cacheMagicConstruct, email)
}

func NewCache(logger *log.Logger, repo *UserRepository, trace trace.Tracer) (*UserCache, error) {
	redisHost := os.Getenv("REDIS_HOST")
	redisPort := os.Getenv("REDIS_PORT")
	redisAddress := fmt.Sprintf("%s:%s", redisHost, redisPort)

	client := redis.NewClient(&redis.Options{
		Addr: redisAddress,
	})

	if err := client.Ping().Err(); err != nil {
		return nil, err
	}

	return &UserCache{
		cli:            client,
		log:            logger,
		userRepository: repo,
		tracer:         trace,
	}, nil
}

func (uc *UserCache) Login(user *data.LoginCredentials, token string) error {
	_, span := uc.tracer.Start(context.Background(), "Cache.Login")
	defer span.End()
	keyForId, err := uc.userRepository.GetUserIdByEmail(user.Email)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return errors.New("key is not found")
	}

	userFound, err := uc.userRepository.GetUserByEmail(user.Email)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return err
	}

	err = bcrypt.CompareHashAndPassword([]byte(userFound.Password), []byte(user.Password))
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return errors.New("email and password don't match")
	}

	value, err := json.Marshal(token)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return err
	}

	// For testing purposes TTL is set to 5 minutes.

	// In more realistic situations, it should be set to 30 minutes minimally.
	err = uc.cli.Set(constructKeyForUser(keyForId.Hex()), value, 50*time.Minute).Err()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
	}
	span.SetStatus(codes.Ok, "Login success")

	return err
}

func (uc *UserCache) VerifyToken(userID string) (bool, error) {
	_, span := uc.tracer.Start(context.Background(), "Cache.VerifyToken")
	defer span.End()
	key := constructKeyForUser(userID)
	exists, err := uc.cli.Exists(key).Result()

	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return false, err
	}

	if exists > 0 {
		span.SetStatus(codes.Ok, "Token exists")
		return true, nil
	} else {
		span.SetStatus(codes.Ok, "Token not found")
		return false, nil
	}
}

func (uc *UserCache) Logout(id string) error {
	_, span := uc.tracer.Start(context.Background(), "Cache.Logout")
	defer span.End()
	key := constructKeyForUser(id)
	err := uc.cli.Del(key).Err()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return err
	}
	span.SetStatus(codes.Ok, "Logout success")
	return nil
}

func (uc *UserCache) GetUserIDFromToken(token string) (string, error) {
	_, span := uc.tracer.Start(context.Background(), "Cache.GetUserIDFromToken")
	defer span.End()
	parsedToken, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			span.RecordError(errors.New("Unexpected signing method"))
			span.SetStatus(codes.Error, "Unexpected signing method")
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(os.Getenv("SECRET_KEY")), nil
	})
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uc.log.Println("Error parsing token:", err)
		return "", errors.New("invalid token")
	}

	if claims, ok := parsedToken.Claims.(jwt.MapClaims); ok && parsedToken.Valid {
		userID := claims["user_id"].(string)
		span.SetStatus(codes.Ok, "User found")
		return userID, nil
	}
	span.RecordError(err)
	span.SetStatus(codes.Error, "Invalid token")
	return "", errors.New("invalid token or missing user ID")
}

func SendMagicLink(userEmail string) error {
	recoveryURL := fmt.Sprintf("https://localhost:4200/magic/%s", userEmail)

	subject := "Magic Link"
	body := fmt.Sprintf(`
		<html>
		<body>
			<p>Dear user,</p>
			<p>We received a request for a magic link.</p>
			<p>Please click the button below to log in without the password:</p>
			<a href="%s" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block;">Abracadabra</a>
			<p>The link expires in 5 minutes.</p>
			<p>Thank you!</p>
		</body>
		</html>`, recoveryURL)

	message := fmt.Sprintf("Subject: %s\r\n", subject)
	message += "MIME-Version: 1.0\r\n"
	message += "Content-Type: text/html; charset=\"UTF-8\"\r\n"
	message += "\r\n" + body

	from := os.Getenv("SMTP_EMAIL")
	password := os.Getenv("SMTP_PASSWORD")
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")

	auth := smtp.PlainAuth("", from, password, smtpHost)

	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, from, []string{userEmail}, []byte(message))
	if err != nil {
		return fmt.Errorf("failed to send email: %v", err)
	}

	return nil
}

func (c *UserCache) ImplementMagic(email string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	ctx, span := c.tracer.Start(ctx, "Cache.ImplementMagic")
	defer span.End()
	accountCollection := c.userRepository.getAccountCollection()
	var existingAccount data.Account

	findOneCtx, findOneSpan := c.tracer.Start(ctx, "Cache.ImplementMagic.FindOne")
	err := accountCollection.FindOne(findOneCtx, bson.M{"email": email}).Decode(&existingAccount)
	findOneSpan.End()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		c.log.Println("Error finding account:", err)
		return err
	}

	id := constructKeyForMagic(email)
	err = c.cli.Set(id, existingAccount.ID.String(), 5*time.Minute).Err()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		c.log.Println("Error setting token:", err)
		return err
	}
	err = SendMagicLink(email)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		c.log.Println("Error sending magic link:", err)
		return err
	}
	span.SetStatus(codes.Ok, "Successfully sent a magic link.")
	return nil
}

func (c *UserCache) VerifyMagic(email string) (string, string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	ctx, span := c.tracer.Start(ctx, "Cache.VerifyMagic")
	defer span.End()
	accountCollection := c.userRepository.getAccountCollection()
	var existingAccount data.Account
	findOneCtx, findOneSpan := c.tracer.Start(ctx, "Cache.VerifyMagic.FindOne")
	err := accountCollection.FindOne(findOneCtx, bson.M{"email": email}).Decode(&existingAccount)
	findOneSpan.End()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		c.log.Println("Error finding account:", err)
		return "", "", err
	}
	id := constructKeyForMagic(email)
	err = c.cli.Get(id).Err()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		c.log.Println("Error getting token:", err)
		return "", "", err
	}
	c.log.Println("email is " + email + "role is " + existingAccount.Role + "user id is " + existingAccount.ID.Hex())
	token, err := utils.CreateToken(email, existingAccount.Role, existingAccount.ID.Hex())
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		c.log.Println("Error creating token:", err)
		return "", "", err
	}
	c.log.Println("token is created " + token)
	err = c.cli.Set(constructKeyForUser(existingAccount.ID.Hex()), token, 5*time.Minute).Err()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		c.log.Println("Error setting token:", err)
		return "", "", err
	}

	span.SetStatus(codes.Ok, "Successfully verified magic link.")
	return existingAccount.ID.Hex(), token, nil
}

func (uc *UserCache) VerifyTokenWithUserId(token string) (string, error) {
	_, span := uc.tracer.Start(context.Background(), "Cache.VerifyTokenWithUserId")
	defer span.End()
	userID, err := uc.GetUserIDFromToken(token)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return "", err
	}

	key := constructKeyForUser(userID)
	exists, err := uc.cli.Exists(key).Result()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return "", err
	}

	if exists == 0 {
		span.RecordError(errors.New("user not found"))
		span.SetStatus(codes.Error, "user not found")
		return "", errors.New("invalid token or user not found")
	}

	span.SetStatus(codes.Ok, "Successfully verified token.")
	return userID, nil
}

func (uc *UserCache) GetUserRole(token string) (string, error) {
	_, span := uc.tracer.Start(context.Background(), "Cache.GetUserRole")
	defer span.End()
	userRole, err := uc.GetRoleFromToken(token)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return "", err
	}
	span.SetStatus(codes.Ok, "Successfully retrieved user role.")

	return userRole, nil
}

func (uc *UserCache) GetRoleFromToken(token string) (string, error) {
	_, span := uc.tracer.Start(context.Background(), "Cache.GetRoleFromToken")
	defer span.End()
	parsedToken, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			span.RecordError(errors.New("Unexpected signing method"))
			span.SetStatus(codes.Error, "Unexpected signing method")
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(os.Getenv("SECRET_KEY")), nil
	})
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uc.log.Println("Error parsing token:", err)
		return "", errors.New("invalid token")
	}

	if claims, ok := parsedToken.Claims.(jwt.MapClaims); ok && parsedToken.Valid {
		userRole := claims["role"].(string)
		span.SetStatus(codes.Ok, "Role has been successfully retrieved.")
		return userRole, nil
	}
	span.RecordError(errors.New("invalid token"))
	span.SetStatus(codes.Error, "Invalid token")

	return "", errors.New("role not found in token")
}
