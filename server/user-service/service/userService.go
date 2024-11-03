package service

import (
	"context"
	"main.go/data"
	"main.go/repository"
)

type UserService struct {
	user *repository.UserRepository
}

func NewUserService(user *repository.UserRepository) *UserService {
	return &UserService{user}
}

func (s UserService) Registration(request *data.AccountRequest) error {
	err := s.user.Registration(request)
	if err != nil {
		return err
	}
	return nil

}

func (s UserService) GetAllUsers(ctx context.Context) ([]data.Account, error) {
	accounts, err := s.user.GetAllUsers(ctx)
	if err != nil {
		return nil, err
	}
	return accounts, nil
}
