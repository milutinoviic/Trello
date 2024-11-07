package repository

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
	"golang.org/x/crypto/bcrypt"
	"log"
	"main.go/data"
	"net/smtp"
	"os"
	"time"
)

type UserRepository struct {
	cli    *mongo.Client
	logger *log.Logger
}

func New(ctx context.Context, logger *log.Logger) (*UserRepository, error) {
	dburi := os.Getenv("MONGO_DB_URI")

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(dburi))
	if err != nil {
		return nil, err
	}

	if err = client.Ping(ctx, readpref.Primary()); err != nil {
		return nil, err
	}

	return &UserRepository{
		cli:    client,
		logger: logger,
	}, nil
}

func (ur *UserRepository) Disconnect(ctx context.Context) error {
	err := ur.cli.Disconnect(ctx)
	if err != nil {
		return err
	}
	return nil
}

func (ur *UserRepository) Registration(request *data.AccountRequest) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := ur.cli.Ping(ctx, readpref.Primary()); err != nil {
		return fmt.Errorf("database not available: %w", err)
	}

	accountCollection := ur.getAccountCollection()
	var existingAccount data.Account
	err := accountCollection.FindOne(ctx, bson.M{"email": request.Email}).Decode(&existingAccount)
	if err == nil {
		ur.logger.Println("Email already exists")
		return data.ErrEmailAlreadyExists()
	}

	uuidPassword := uuid.New().String()

	hashedPassword, err := hashPassword(uuidPassword)
	if err != nil {
		ur.logger.Println("Error hashing password:", err)
		return err
	}

	account := &data.Account{
		Email:     request.Email,
		FirstName: request.FirstName,
		LastName:  request.LastName,
		Password:  hashedPassword,
		Role:      request.Role,
	}

	_, err = accountCollection.InsertOne(ctx, account)
	if err != nil {
		ur.logger.Println("Error inserting account:", err)
		return err
	}
	err = sendEmail(account, uuidPassword)
	if err != nil {
		ur.logger.Println("Error sending email:", err)
		return err
	}
	ur.logger.Println("Account created")
	return nil
}

func hashPassword(password string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashed), nil
}

func (ur *UserRepository) getAccountCollection() *mongo.Collection {
	userDatabase := ur.cli.Database("mongoDb")
	userCollection := userDatabase.Collection("accounts")
	return userCollection
}

func sendEmail(request *data.Account, uuidPassword string) error {
	// err := godotenv.Load()
	// if err != nil {
	//     return fmt.Errorf("error loading .env file")
	// }

	from := os.Getenv("SMTP_EMAIL")
	password := os.Getenv("SMTP_PASSWORD")
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")

	plainTextBody := "Welcome to our service!\n\n" +
		"Hello " + request.FirstName + ",\n" +
		"Thank you for joining us. Your temporary password is: " + uuidPassword + "\n" +
		"Please log in and change it as soon as possible.\n\n" +
		"Best regards,\nThe Team"

	htmlBody := `<!DOCTYPE html>
	<html>
	<head>
		<style>
			body { font-family: Arial, sans-serif; color: #333; }
			.container { padding: 20px; border: 1px solid #ddd; }
			.header { font-size: 24px; font-weight: bold; color: #4CAF50; }
			.content { margin-top: 10px; }
			.footer { margin-top: 20px; font-size: 12px; color: #888; }
		</style>
	</head>
	<body>
		<div class="container">
			<div class="header">Welcome to Our Service!</div>
			<div class="content">
				<p>Hello ` + request.FirstName + `,</p>
				<p>Thank you for joining our platform. We’re excited to have you on board!</p>
				<p>Your temporary password is: <strong>` + uuidPassword + `</strong></p>
				<p>Please log in and change it as soon as possible.</p>
			</div>
			<div class="footer">
				<p>Best regards,<br>The Team</p>
			</div>
		</div>
	</body>
	</html>`

	message := []byte("MIME-Version: 1.0\r\n" +
		"Content-Type: multipart/alternative; boundary=\"fancy-boundary\"\r\n" +
		"Subject: Welcome to our service!\r\n" +
		"From: " + from + "\r\n" +
		"To: " + request.Email + "\r\n" +
		"\r\n" +
		"--fancy-boundary\r\n" +
		"Content-Type: text/plain; charset=\"utf-8\"\r\n" +
		"\r\n" +
		plainTextBody + "\r\n" +
		"--fancy-boundary\r\n" +
		"Content-Type: text/html; charset=\"utf-8\"\r\n" +
		"\r\n" +
		htmlBody + "\r\n" +
		"--fancy-boundary--")

	auth := smtp.PlainAuth("", from, password, smtpHost)
	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, from, []string{request.Email}, message)
	if err != nil {
		return err
	}

	return nil
}

func (uh *UserRepository) GetAllManagers() (data.Accounts, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	managersCollection := uh.getAccountCollection()

	var managers data.Accounts
	filter := bson.M{"role": "manager"}
	managersCursor, err := managersCollection.Find(ctx, filter)
	if err != nil {
		uh.logger.Println(err)
		return nil, err
	}
	if err = managersCursor.All(ctx, &managers); err != nil {
		uh.logger.Println(err)
		return nil, err
	}

	return managers, nil
}

func (ur *UserRepository) GetAllMembers(ctx context.Context) ([]data.Account, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := ur.cli.Ping(ctx, readpref.Primary()); err != nil {
		return nil, fmt.Errorf("database not available: %w", err)
	}

	accountCollection := ur.getAccountCollection()
	filter := bson.M{"role": "member"}

	cursor, err := accountCollection.Find(ctx, filter)
	if err != nil {
		ur.logger.Println("Error finding accounts:", err)
		return nil, err
	}
	defer cursor.Close(ctx)

	var accounts []data.Account
	if err := cursor.All(ctx, &accounts); err != nil {
		ur.logger.Println("Error decoding accounts:", err)
		return nil, err
	}

	return accounts, nil
}
