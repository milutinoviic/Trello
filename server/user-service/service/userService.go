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

func (s UserService) GetAll() (data.Accounts, error) {
	managers, err := s.user.GetAllManagers()
	if err != nil {
		return nil, err
	}
	return managers, nil

}

func (s UserService) GetAllMembers(ctx context.Context) ([]data.Account, error) {
	accounts, err := s.user.GetAllMembers(ctx)
	if err != nil {
		return nil, err
	}
	return accounts, nil
}
