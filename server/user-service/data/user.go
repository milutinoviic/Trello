package data

import (
	"context"
	"encoding/json"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"io"
)

type AccountRequest struct {
	Email     string `bson:"email" json:"email"`
	FirstName string `bson:"first_name" json:"first_name"`
	LastName  string `bson:"last_name" json:"last_name"`
	Role      string `bson:"role" json:"role"`
}

type Account struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Email     string             `bson:"email" json:"email"`
	FirstName string             `bson:"first_name" json:"first_name"`
	LastName  string             `bson:"last_name" json:"last_name"`
	Password  string             `bson:"password" json:"password"`
	Role      string             `bson:"role" json:"role"`
}

type LoginCredentials struct {
	Email          string `bson:"email" json:"email"`
	Password       string `bson:"password" json:"password"`
	RecaptchaToken string `bson:"recaptchaToken" json:"recaptchaToken"`
}

type ChangePasswordRequest struct {
	Password string `bson:"password" json:"password"`
}

type UserIdsRequest struct {
	UserIds []string `json:"userIds"`
}

type Accounts []*Account

type AccountRepository interface {
	Registration(request *AccountRequest, ctx context.Context) error
}

func (a *Accounts) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(a)
}

func (a *Account) ToJSON(w io.Writer) error {
	e := json.NewEncoder(w)
	return e.Encode(a)
}
