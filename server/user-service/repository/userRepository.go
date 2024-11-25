package repository

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	"golang.org/x/crypto/bcrypt"
	"log"
	"main.go/customLogger"
	"main.go/data"
	"main.go/utils"
	"net/http"
	"net/smtp"
	"net/url"
	"os"
	"strings"
	"time"
)

type UserRepository struct {
	cli        *mongo.Client
	logger     *log.Logger
	custLogger *customLogger.Logger
	tracer     trace.Tracer
}

func New(ctx context.Context, logger *log.Logger, custLogger *customLogger.Logger, tracer trace.Tracer) (*UserRepository, error) {
	dburi := os.Getenv("MONGO_DB_URI")

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(dburi))
	if err != nil {
		return nil, err
	}

	if err = client.Ping(ctx, readpref.Primary()); err != nil {
		return nil, err
	}

	return &UserRepository{
		cli:        client,
		logger:     logger,
		custLogger: custLogger,
		tracer:     tracer,
	}, nil
}

func (ur *UserRepository) Disconnect(ctx context.Context) error {
	_, span := ur.tracer.Start(ctx, "UserRepository.Disconnect")
	defer span.End()
	err := ur.cli.Disconnect(ctx)
	if err != nil {
		span.SetStatus(codes.Error, err.Error())
		return err
	}
	span.SetStatus(codes.Ok, "Successfully disconnected")
	return nil
}

func (ur *UserRepository) Registration(request *data.AccountRequest) error {
	baseCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	baseCtx, span := ur.tracer.Start(baseCtx, "UserRepository.Registration", trace.WithAttributes(
		attribute.String("email", request.Email),
		attribute.String("role", request.Role),
	))
	defer span.End()

	if err := ur.cli.Ping(baseCtx, readpref.Primary()); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Database not available")
		return fmt.Errorf("database not available: %w", err)
	}

	checkCtx, checkSpan := ur.tracer.Start(baseCtx, "UserRepository.Registration.CheckEmailExists")
	var existingAccount data.Account
	err := ur.getAccountCollection().FindOne(checkCtx, bson.M{"email": request.Email}).Decode(&existingAccount)
	checkSpan.End()

	if err == nil {
		span.SetStatus(codes.Error, "Email already exists")
		ur.logger.Println("TraceID:", span.SpanContext().TraceID().String(), "Email already exists")
		return data.ErrEmailAlreadyExists()
	}
	uuidPassword := uuid.New().String()
	hashedPassword, err := hashPassword(uuidPassword)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to hash password")
		return fmt.Errorf("failed to hash password: %w", err)
	}

	insertCtx, insertSpan := ur.tracer.Start(baseCtx, "UserRepository.Registration.InsertAccount")
	account := &data.Account{
		Email:     request.Email,
		FirstName: request.FirstName,
		LastName:  request.LastName,
		Password:  hashedPassword,
		Role:      request.Role,
	}
	_, err = ur.getAccountCollection().InsertOne(insertCtx, account)
	insertSpan.End()

	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to insert account")
		return fmt.Errorf("failed to insert account: %w", err)
	}

	_, emailSpan := ur.tracer.Start(baseCtx, "UserRepository.Registration.SendEmail")
	err = sendEmail(account, uuidPassword)
	emailSpan.End()

	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to send email")
		return fmt.Errorf("failed to send email: %w", err)
	}

	span.SetStatus(codes.Ok, "Account successfully created")
	ur.logger.Println("Account created successfully")
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

	ctx, span := uh.tracer.Start(ctx, "UserRepository.GetAllManagers")
	defer span.End()

	managersCollection := uh.getAccountCollection()

	var managers data.Accounts
	filter := bson.M{"role": "manager"}
	findCtx, findSpan := uh.tracer.Start(ctx, "UserRepository.GetAllManagers.Find")
	managersCursor, err := managersCollection.Find(findCtx, filter)
	findSpan.End()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println(err)
		return nil, err
	}
	if err = managersCursor.All(ctx, &managers); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println(err)
		return nil, err
	}

	span.SetStatus(codes.Ok, "Successfully found all managers")
	return managers, nil
}

func (uh *UserRepository) GetOne(userId string) (*data.Account, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	ctx, span := uh.tracer.Start(ctx, "UserRepository.GetOne")
	defer span.End()

	managersCollection := uh.getAccountCollection()

	objectId, err := primitive.ObjectIDFromHex(userId)

	var manager data.Account
	findOneCtx, findOneSpan := uh.tracer.Start(ctx, "UserRepository.GetOne.FindOne")
	err = managersCollection.FindOne(findOneCtx, bson.M{"_id": objectId}).Decode(&manager)
	findOneSpan.End()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		uh.logger.Println("Error finding manager:", objectId)
		return nil, err
	}
	span.SetStatus(codes.Ok, "Successfully found manager")
	return &manager, nil
}

func (ur *UserRepository) GetAllMembers(ctx context.Context) ([]data.Account, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	ctx, span := ur.tracer.Start(ctx, "UserRepository.GetAllMembers")
	defer span.End()

	if err := ur.cli.Ping(ctx, readpref.Primary()); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ur.logger.Println("Database not available")
		return nil, fmt.Errorf("database not available: %w", err)
	}

	accountCollection := ur.getAccountCollection()
	filter := bson.M{"role": "member"}

	findCtx, findSpan := ur.tracer.Start(ctx, "UserRepository.GetAllMembers.Find")
	cursor, err := accountCollection.Find(findCtx, filter)
	findSpan.End()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ur.logger.Println("Error finding accounts:", err)
		return nil, err
	}
	defer cursor.Close(ctx)

	var accounts []data.Account
	if err := cursor.All(ctx, &accounts); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ur.logger.Println("Error decoding accounts:", err)
		return nil, err
	}
	span.SetStatus(codes.Ok, "Successfully found members")
	return accounts, nil
}

func (ur *UserRepository) GetUserIdByEmail(email string) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	ctx, span := ur.tracer.Start(ctx, "UserRepository.GetUserIdByEmail")
	defer span.End()

	accountCollection := ur.getAccountCollection()
	var existingAccount data.Account

	findOneCtx, findOneSpan := ur.tracer.Start(ctx, "UserRepository.GetUserIdByEmail.FindOne")
	err := accountCollection.FindOne(findOneCtx, bson.M{"email": email}).Decode(&existingAccount)
	findOneSpan.End()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ur.logger.Println("Error finding account:", err)
		return primitive.NilObjectID, err
	}
	span.SetStatus(codes.Ok, "Successfully found account")
	return existingAccount.ID, nil
}

func (ur *UserRepository) GetUserRoleByEmail(email string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	ctx, span := ur.tracer.Start(ctx, "UserRepository.GetUserRoleByEmail")
	defer span.End()
	accountCollection := ur.getAccountCollection()
	var existingAccount data.Account

	findOneCtx, findOneSpan := ur.tracer.Start(ctx, "UserRepository.GetUserRoleByEmail.FindOne")
	err := accountCollection.FindOne(findOneCtx, bson.M{"email": email}).Decode(&existingAccount)
	findOneSpan.End()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ur.logger.Println("Error finding account:", err)
		return "", err
	}
	span.SetStatus(codes.Ok, "Successfully found role")
	return existingAccount.Role, nil
}

func (ur *UserRepository) GetUserByEmail(email string) (data.Account, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	ctx, span := ur.tracer.Start(ctx, "UserRepository.GetUserByEmail")
	defer span.End()
	accountCollection := ur.getAccountCollection()
	var existingAccount data.Account
	findOneCtx, findOneSpan := ur.tracer.Start(ctx, "UserRepository.GetUserByEmail.FindOne")
	err := accountCollection.FindOne(findOneCtx, bson.M{"email": email}).Decode(&existingAccount)
	findOneSpan.End()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ur.logger.Println("Error finding account:", err)
		return data.Account{}, err
	}
	span.SetStatus(codes.Ok, "Successfully found user")
	return existingAccount, nil
}

func (ur *UserRepository) GetUserById(id string) (data.Account, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	ctx, span := ur.tracer.Start(ctx, "UserRepository.GetUserById")
	defer span.End()
	accountCollection := ur.getAccountCollection()
	var existingAccount data.Account
	objectId, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ur.logger.Println("Error parsing object id:", err)
		return data.Account{}, err
	}
	findOneCtx, findOneSpan := ur.tracer.Start(ctx, "UserRepository.GetUserById.FindOne")
	err = accountCollection.FindOne(findOneCtx, bson.M{"_id": objectId}).Decode(&existingAccount)
	findOneSpan.End()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ur.logger.Println("Error finding account:", err)
		return data.Account{}, err
	}
	span.SetStatus(codes.Ok, "Successfully found user")
	return existingAccount, nil
}

func (ur *UserRepository) CheckIfPasswordIsSame(id string, password string) bool {
	_, span := ur.tracer.Start(context.Background(), "UserRepository.CheckIfPasswordIsSame")
	defer span.End()
	acc, err := ur.GetUserById(id)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ur.logger.Println("Error finding account:", err)
		return false
	}
	err = bcrypt.CompareHashAndPassword([]byte(acc.Password), []byte(password))
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ur.logger.Println("Error comparing password:", err)
		return false
	}
	span.SetStatus(codes.Ok, "Successfully compared the passwords")
	return true
}
func (ur *UserRepository) ChangePassword(id string, password string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	ctx, span := ur.tracer.Start(ctx, "UserRepository.ChangePassword")
	defer span.End()

	accountCollection := ur.getAccountCollection()

	err := ForbidPassword(password)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ur.logger.Println("Error forbiding password:", err)
		return err
	}

	hashedPassword, err := hashPassword(password)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ur.logger.Println("Error hashing password:", err)
		return err
	}

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ur.logger.Println("Error parsing object id:", err)
		return errors.New("invalid user ID format")
	}

	filter := bson.M{"_id": objectID}
	update := bson.M{
		"$set": bson.M{"password": hashedPassword},
	}
	updateOneCtx, updateOneSpan := ur.tracer.Start(ctx, "UserRepository.ChangePassword.UpdateOne")
	_, err = accountCollection.UpdateOne(updateOneCtx, filter, update)
	updateOneSpan.End()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ur.logger.Println("Error updating account:", err)
		return err
	}

	span.SetStatus(codes.Ok, "Successfully changed password")
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
	ctx, span := ur.tracer.Start(ctx, "UserRepository.HandleRecoveryRequest")
	defer span.End()
	accountCollection := ur.getAccountCollection()
	var existingAccount data.Account

	findOneCtx, findOneSpan := ur.tracer.Start(ctx, "UserRepository.HandleRecoveryRequest.FindOne")
	err := accountCollection.FindOne(findOneCtx, bson.M{"email": email}).Decode(&existingAccount)
	findOneSpan.End()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ur.logger.Println("Error finding account:", err)
		return err
	}
	if len(existingAccount.Email) == 0 {
		span.RecordError(data.ErrEmailDoesntExist())
		span.SetStatus(codes.Error, data.ErrEmailDoesntExist().Error())
		ur.logger.Println("Error finding account:", data.ErrEmailDoesntExist())
		return data.ErrEmailDoesntExist()
	}
	err = SendRecoveryEmail(email)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ur.logger.Println("Error sending recovery email:", err)
		return err
	}
	span.SetStatus(codes.Ok, "Successfully handled the request")
	return nil
}

func (ur *UserRepository) ResetPassword(email string, password string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	ctx, span := ur.tracer.Start(ctx, "UserRepository.ResetPassword")
	defer span.End()
	accountCollection := ur.getAccountCollection()
	var existingAccount data.Account

	findOneCtx, findOneSpan := ur.tracer.Start(ctx, "UserRepository.ResetPassword.FindOne")
	err := accountCollection.FindOne(findOneCtx, bson.M{"email": email}).Decode(&existingAccount)
	findOneSpan.End()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ur.logger.Println("Error finding account:", err)
		return err
	}
	err = ForbidPassword(password)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ur.logger.Println("Password forbidden:", err)
		return err
	}

	hashedPassword, err := hashPassword(password)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ur.logger.Println("Error hashing password:", err)
		return err
	}

	filter := bson.M{"email": email}
	update := bson.M{
		"$set": bson.M{
			"password": hashedPassword,
		},
	}
	updateOneCtx, updateOneSpan := ur.tracer.Start(ctx, "UserRepository.ResetPassword.UpdateOne")
	_, err = accountCollection.UpdateOne(updateOneCtx, filter, update)
	updateOneSpan.End()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ur.logger.Println("Error updating account:", err)
		return err
	}
	span.SetStatus(codes.Ok, "Successfully changed password")
	return nil

}

func ForbidPassword(password string) error {
	file, err := os.Open("/app/10k-worst-passwords.txt")
	if err != nil {
		log.Fatal("Error opening file:", err)
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

func (us *UserRepository) Delete(userID string) error {
	_, span := us.tracer.Start(context.Background(), "UserRepository.Delete")
	defer span.End()
	objectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		us.logger.Printf("Invalid userID format: %v", err)
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"_id": objectID}
	deleteOneCtx, deleteOneSpan := us.tracer.Start(ctx, "UserRepository.Delete.DeleteOne")
	result, err := us.getAccountCollection().DeleteOne(deleteOneCtx, filter)
	deleteOneSpan.End()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		us.logger.Printf("Error deleting user: %v", err)
		return err
	}

	if result.DeletedCount == 0 {
		span.RecordError(mongo.ErrNoDocuments)
		span.SetStatus(codes.Error, mongo.ErrNoDocuments.Error())
		us.logger.Printf("No user found with ID %s", userID)
		return mongo.ErrNoDocuments
	}

	span.SetStatus(codes.Ok, "Successfully deleted user")
	us.logger.Printf("User with ID %s successfully deleted", userID)
	return nil
}

func (ur *UserRepository) VerifyRecaptcha(token string) (bool, error) {
	_, span := ur.tracer.Start(context.Background(), "UserRepository.VerifyRecaptcha")
	defer span.End()
	if token == "" {
		span.RecordError(errors.New("token is empty"))
		span.SetStatus(codes.Error, "Token is empty")
		fmt.Println("token is empty")
		ur.logger.Println("Empty reCAPTCHA token")
		return false, errors.New("empty reCAPTCHA token")
	}

	ur.logger.Println("This is token: ", token)

	secret := os.Getenv("CAPTCHA")
	if secret == "" {
		ur.logger.Println("RECAPTCHA_SECRET_KEY is not set")
	} else {
		ur.logger.Println("RECAPTCHA_SECRET_KEY successfully loaded")
	}

	resp, err := http.PostForm("https://www.google.com/recaptcha/api/siteverify",
		url.Values{"secret": {secret}, "response": {token}})

	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		fmt.Println(err)
		ur.logger.Println("Error calling reCAPTCHA API:", err)
		return false, err
	}
	defer resp.Body.Close()

	// Decode the response
	var recaptchaResp utils.RecaptchaResponse
	if err := json.NewDecoder(resp.Body).Decode(&recaptchaResp); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		fmt.Println(err)
		ur.logger.Println("Error decoding reCAPTCHA response:", err)
		return false, err
	}

	if !recaptchaResp.Success {
		span.RecordError(errors.New("reCAPTCHA response error"))
		span.SetStatus(codes.Error, "reCAPTCHA response error")
		fmt.Println("recaptcha failed:", recaptchaResp.ErrorCodes)
		ur.logger.Println("reCAPTCHA verification failed:", recaptchaResp.ErrorCodes)
		return false, errors.New("reCAPTCHA verification failed")
	}

	span.SetStatus(codes.Ok, "Successfully verified reCAPTCHA token")
	return true, nil
}

func (ur *UserRepository) GetUsersByIds(ids []string) ([]data.Account, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	ctx, span := ur.tracer.Start(ctx, "UserRepository.GetUsersByIds")
	defer span.End()

	accountCollection := ur.getAccountCollection()

	var objectIds []primitive.ObjectID
	for _, id := range ids {
		objectId, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			ur.logger.Println("Error parsing ObjectID:", err)
			return nil, fmt.Errorf("invalid user ID format: %s", id)
		}
		objectIds = append(objectIds, objectId)
	}

	filter := bson.M{"_id": bson.M{"$in": objectIds}}
	findCtx, findSpan := ur.tracer.Start(ctx, "UserRepository.GetUsersByIds.Find")
	cursor, err := accountCollection.Find(findCtx, filter)
	findSpan.End()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ur.logger.Println("Error finding accounts:", err)
		return nil, err
	}
	defer cursor.Close(ctx)

	var users []data.Account
	if err := cursor.All(ctx, &users); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		ur.logger.Println("Error decoding accounts:", err)
		return nil, err
	}

	span.SetStatus(codes.Ok, "Successfully retrieved users")
	return users, nil
}
