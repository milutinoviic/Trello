package service

import (
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
