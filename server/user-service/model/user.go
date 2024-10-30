package model

import (
	"context"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AccountRequest struct {
	Email     string `bson:"email" json:"email"`
	FirstName string `bson:"first_name" json:"first_name"`
	LastName  string `bson:"last_name" json:"last_name"`
}

type Account struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Email     string             `bson:"email" json:"email"`
	FirstName string             `bson:"first_name" json:"first_name"`
	LastName  string             `bson:"last_name" json:"last_name"`
	Password  string             `bson:"password" json:"password"`
}

type AccountRepository interface {
	Registration(request *AccountRequest, ctx context.Context) error
}
