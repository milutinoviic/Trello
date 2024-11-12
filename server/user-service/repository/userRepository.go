package repository

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
	"golang.org/x/crypto/bcrypt"
	"log"
	"main.go/data"
	"net/smtp"
	"os"
	"strings"
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
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
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

func (uh *UserRepository) GetOne(userId string) (*data.Account, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	managersCollection := uh.getAccountCollection()

	objectId, err := primitive.ObjectIDFromHex(userId)

	var manager data.Account
	err = managersCollection.FindOne(ctx, bson.M{"_id": objectId}).Decode(&manager)
	if err != nil {
		uh.logger.Println("Error finding managerrr:", objectId)
		return nil, err
	}

	return &manager, nil
}

func (ur *UserRepository) GetAllMembers(ctx context.Context) ([]data.Account, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := ur.cli.Ping(ctx, readpref.Primary()); err != nil {
		ur.logger.Println("Database not available")
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

func (ur *UserRepository) GetUserIdByEmail(email string) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	accountCollection := ur.getAccountCollection()
	var existingAccount data.Account

	err := accountCollection.FindOne(ctx, bson.M{"email": email}).Decode(&existingAccount)
	if err != nil {
		ur.logger.Println("Error finding account:", err)
		return primitive.NilObjectID, err
	}

	return existingAccount.ID, nil
}

func (ur *UserRepository) GetUserRoleByEmail(email string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	accountCollection := ur.getAccountCollection()
	var existingAccount data.Account

	err := accountCollection.FindOne(ctx, bson.M{"email": email}).Decode(&existingAccount)
	if err != nil {
		ur.logger.Println("Error finding account:", err)
		return "", err
	}

	return existingAccount.Role, nil
}

func (ur *UserRepository) GetUserByEmail(email string) (data.Account, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	accountCollection := ur.getAccountCollection()
	var existingAccount data.Account
	err := accountCollection.FindOne(ctx, bson.M{"email": email}).Decode(&existingAccount)
	if err != nil {
		ur.logger.Println("Error finding account:", err)
		return data.Account{}, err
	}
	return existingAccount, nil
}

func (ur *UserRepository) GetUserById(id string) (data.Account, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	accountCollection := ur.getAccountCollection()
	var existingAccount data.Account
	objectId, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		ur.logger.Println("Error parsing object id:", err)
		return data.Account{}, err
	}
	err = accountCollection.FindOne(ctx, bson.M{"_id": objectId}).Decode(&existingAccount)
	if err != nil {
		ur.logger.Println("Error finding account:", err)
		return data.Account{}, err
	}
	return existingAccount, nil
}

func (ur *UserRepository) CheckIfPasswordIsSame(id string, password string) bool {
	acc, err := ur.GetUserById(id)
	if err != nil {
		ur.logger.Println("Error finding account:", err)
		return false
	}
	err = bcrypt.CompareHashAndPassword([]byte(acc.Password), []byte(password))
	if err != nil {
		ur.logger.Println("Error comparing password:", err)
		return false
	}
	return true
}
func (ur *UserRepository) ChangePassword(id string, password string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	accountCollection := ur.getAccountCollection()

	err := ForbidPassword(password)
	if err != nil {
		ur.logger.Println("Error forbiding password:", err)
		return err
	}

	hashedPassword, err := hashPassword(password)
	if err != nil {
		ur.logger.Println("Error hashing password:", err)
		return err
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		ur.logger.Println("Error parsing object id:", err)
		return errors.New("invalid user ID format")
	}

	filter := bson.M{"_id": objectID}
	update := bson.M{
		"$set": bson.M{"password": hashedPassword},
	}

	_, err = accountCollection.UpdateOne(ctx, filter, update)
	if err != nil {
		ur.logger.Println("Error updating account:", err)
		return err
	}

	return nil
}

func SendRecoveryEmail(userEmail string) error {
	recoveryURL := fmt.Sprintf("https://localhost:4200/password/recovery/%s", userEmail)

	subject := "Password Recovery"
	body := fmt.Sprintf(`
		<html>
		<body>
			<p>Dear user,</p>
			<p>We received a request to reset your password.</p>
			<p>Please click the button below to reset your password:</p>
			<a href="%s" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block;">Reset Password</a>
			<p>If you did not request this, please ignore this email.</p>
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

func (ur *UserRepository) HandleRecoveryRequest(email string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	accountCollection := ur.getAccountCollection()
	var existingAccount data.Account

	err := accountCollection.FindOne(ctx, bson.M{"email": email}).Decode(&existingAccount)
	if err != nil {
		ur.logger.Println("Error finding account:", err)
		return err
	}
	if len(existingAccount.Email) == 0 {
		ur.logger.Println("Error finding account:", data.ErrEmailDoesntExist())
		return data.ErrEmailDoesntExist()
	}
	err = SendRecoveryEmail(email)
	if err != nil {
		ur.logger.Println("Error sending recovery email:", err)
		return err
	}
	return nil
}

func (ur *UserRepository) ResetPassword(email string, password string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	accountCollection := ur.getAccountCollection()
	var existingAccount data.Account

	err := accountCollection.FindOne(ctx, bson.M{"email": email}).Decode(&existingAccount)
	if err != nil {
		ur.logger.Println("Error finding account:", err)
		return err
	}
	err = ForbidPassword(password)
	if err != nil {
		ur.logger.Println("Password forbidden:", err)
		return err
	}

	hashedPassword, err := hashPassword(password)
	if err != nil {
		ur.logger.Println("Error hashing password:", err)
		return err
	}

	filter := bson.M{"email": email}
	update := bson.M{
		"$set": bson.M{
			"password": hashedPassword,
		},
	}
	_, err = accountCollection.UpdateOne(ctx, filter, update)
	if err != nil {
		ur.logger.Println("Error updating account:", err)
		return err
	}
	return nil

}

func ForbidPassword(password string) error {
	file, err := os.Open("10k-worst-passwords.txt")
	if err != nil {
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.EqualFold(line, password) {
			return data.ErrPasswordIsNotAllowed()
		}
	}

	if err := scanner.Err(); err != nil {
		return err
	}

	return nil
}
