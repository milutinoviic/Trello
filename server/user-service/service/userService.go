package service

import (
	"context"
	"errors"
	"main.go/data"
	"main.go/repository"
	"main.go/utils"
)

type UserService struct {
	user  *repository.UserRepository
	cache *repository.UserCache
}

func NewUserService(user *repository.UserRepository, cache *repository.UserCache) *UserService {
	return &UserService{user, cache}
}

func (s *UserService) Registration(request *data.AccountRequest) error {
	err := s.user.Registration(request)
	if err != nil {
		return err
	}
	return nil

}

func (s *UserService) GetAll() (*data.Accounts, error) {
	managers, err := s.user.GetAllManagers()
	if err != nil {
		return nil, err
	}
	return &managers, nil

}

func (s *UserService) GetOne(userId string) (*data.Account, error) {
	manager, err := s.user.GetOne(userId)
	if err != nil {
		return nil, err
	}
	return manager, nil

}

func (s *UserService) GetAllMembers(ctx context.Context) ([]data.Account, error) {
	accounts, err := s.user.GetAllMembers(ctx)
	if err != nil {
		return nil, err
	}
	return accounts, nil
}

func (s *UserService) Login(user *data.LoginCredentials) (id string, err error) {
	role, err := s.user.GetUserRoleByEmail(user.Email)
	if err != nil {
		return "", errors.New("role does not exist")
	}
	token, err := utils.CreateToken(user.Email, role)
	if err != nil {
		return "", errors.New("error creating token")
	}
	err = s.cache.Login(user, token)
	if err != nil {
		return "", err
	}
	get, err := s.user.GetUserIdByEmail(user.Email)
	if err != nil {
		return "", errors.New("error getting user")
	}
	return get.Hex(), nil
}

func (s *UserService) Logout(id string) error {
	err := s.cache.Logout(id)
	if err != nil {
		return err
	}
	return nil

}

func (s *UserService) PasswordCheck(id string, password string) bool {
	return s.user.CheckIfPasswordIsSame(id, password)
}

func (s *UserService) ChangePassword(id string, password string) error {
	err := s.user.ChangePassword(id, password)
	if err != nil {
		return err
	}
	return nil
}

func (s *UserService) RecoveryRequest(email string) error {
	err := s.user.HandleRecoveryRequest(email)
	if err != nil {
		return err
	}
	return nil
}

func (s *UserService) ResettingPassword(email string, password string) error {
	err := s.user.ResetPassword(email, password)
	if err != nil {
		return err
	}
	return nil
}

func (s *UserService) MagicLink(email string) error {
	err := s.cache.ImplementMagic(email)
	if err != nil {
		return err
	}
	return nil
}

func (s *UserService) VerifyMagic(email string) (string, error) {
	id, err := s.cache.VerifyMagic(email)
	if err != nil {
		return "", err
	}
	return id, nil
}
