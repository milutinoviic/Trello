package repository

import (
	"context"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
	"golang.org/x/crypto/bcrypt"
	"log"
	"main.go/model"
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

func (ur *UserRepository) Register(request *model.AccountRequest) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	uuidPassword := uuid.New().String()

	hashedPassword, err := hashPassword(uuidPassword)
	if err != nil {
		ur.logger.Println("Error hashing password:", err)
		return err
	}

	account := &model.Account{
		Email:     request.Email,
		FirstName: request.FirstName,
		LastName:  request.LastName,
		Password:  hashedPassword,
	}

	accountCollection := ur.getAccountCollection()
	_, err = accountCollection.InsertOne(ctx, &account)
	if err != nil {
		ur.logger.Println("Error inserting account:", err)
		return err
	}

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
	userDatabase := ur.cli.Database("mongoDB")
	userCollection := userDatabase.Collection("accounts")
	return userCollection
}
