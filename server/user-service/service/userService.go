package service

import (
	"context"
	"errors"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
	"log"
	"main.go/data"
	"main.go/repository"
	"main.go/utils"
)

type UserService struct {
	user   *repository.UserRepository
	cache  *repository.UserCache
	logger *log.Logger
	tracer trace.Tracer
}

type Project struct {
	ID      string   `json:"id"`
	UserIDs []string `bson:"user_ids" json:"user_ids"`
}

func NewUserService(user *repository.UserRepository, cache *repository.UserCache, logger *log.Logger, trace trace.Tracer) *UserService {
	return &UserService{user, cache, logger, trace}
}

func (s *UserService) Registration(request *data.AccountRequest) error {
	_, span := s.tracer.Start(context.Background(), "UserService.Registration")
	defer span.End()
	err := s.user.Registration(request)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return err
	}
	span.SetStatus(codes.Ok, "Successful registration")
	return nil

}

func (s *UserService) GetAll() (*data.Accounts, error) {
	_, span := s.tracer.Start(context.Background(), "UserService.GetAll")
	defer span.End()
	managers, err := s.user.GetAllManagers()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return nil, err
	}
	span.SetStatus(codes.Ok, "Successful get all managers")
	return &managers, nil

}

func (s *UserService) GetOne(userId string) (*data.Account, error) {
	_, span := s.tracer.Start(context.Background(), "UserService.GetOne")
	defer span.End()
	manager, err := s.user.GetOne(userId)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return nil, err
	}
	span.SetStatus(codes.Ok, "Successful get one manager")
	return manager, nil

}

func (s *UserService) GetAllMembers(ctx context.Context) ([]data.Account, error) {
	_, span := s.tracer.Start(ctx, "UserService.GetAllMembers")
	defer span.End()
	accounts, err := s.user.GetAllMembers(ctx)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return nil, err
	}
	span.SetStatus(codes.Ok, "Successful get all members")
	return accounts, nil
}

func (s UserService) Login(user *data.LoginCredentials) (id string, role string, token string, err error) {
	_, span := s.tracer.Start(context.Background(), "UserService.Login")
	defer span.End()
	role, err = s.user.GetUserRoleByEmail(user.Email)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return "", "", "", errors.New("role does not exist")
	}
	get, err := s.user.GetUserIdByEmail(user.Email)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return "", "", "", errors.New("error getting user")
	}
	token, err = utils.CreateToken(user.Email, role, get.Hex())
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return "", "", "", errors.New("error creating token")
	}
	err = s.cache.Login(user, token)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return "", "", "", err
	}

	span.SetStatus(codes.Ok, "Successful login")
	return get.Hex(), role, token, nil
}

func (s *UserService) Logout(id string) error {
	_, span := s.tracer.Start(context.Background(), "UserService.Logout")
	defer span.End()
	err := s.cache.Logout(id)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return err
	}
	span.SetStatus(codes.Ok, "Successful logout")
	return nil

}

func (s *UserService) PasswordCheck(id string, password string) bool {
	return s.user.CheckIfPasswordIsSame(id, password)
}

func (s *UserService) ChangePassword(id string, password string) error {
	_, span := s.tracer.Start(context.Background(), "UserService.ChangePassword")
	defer span.End()
	err := s.user.ChangePassword(id, password)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return err
	}
	span.SetStatus(codes.Ok, "Successful change password")
	return nil
}

func (s *UserService) RecoveryRequest(email string) error {
	_, span := s.tracer.Start(context.Background(), "UserService.RecoveryRequest")
	defer span.End()
	err := s.user.HandleRecoveryRequest(email)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return err
	}
	span.SetStatus(codes.Ok, "Successful recovery request")
	return nil
}

func (s *UserService) ResettingPassword(email string, password string) error {
	_, span := s.tracer.Start(context.Background(), "UserService.ResettingPassword")
	defer span.End()
	err := s.user.ResetPassword(email, password)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return err
	}
	span.SetStatus(codes.Ok, "Successful resetting password")
	return nil
}

func (s *UserService) MagicLink(email string) error {
	_, span := s.tracer.Start(context.Background(), "UserService.MagicLink")
	defer span.End()
	err := s.cache.ImplementMagic(email)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return err
	}
	span.SetStatus(codes.Ok, "Successful magic link")
	return nil
}

func (s *UserService) VerifyMagic(email string) (string, string, error) {
	_, span := s.tracer.Start(context.Background(), "UserService.VerifyMagic")
	defer span.End()
	id, token, err := s.cache.VerifyMagic(email)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return "", "", err
	}
	span.SetStatus(codes.Ok, "Successful verify magic")
	return id, token, nil
}

func (us *UserService) ValidateToken(token string) (string, string, error) {
	_, span := us.tracer.Start(context.Background(), "UserService.ValidateToken")
	defer span.End()
	userID, err := us.cache.VerifyTokenWithUserId(token)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		us.logger.Println("Error verifying token:", err)
		return "", "", err
	}
	if userID == "" {
		span.RecordError(errors.New("invalid token"))
		span.SetStatus(codes.Error, "Invalid token")
		return "", "", errors.New("invalid token")
	}
	role, err := us.cache.GetUserRole(token)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		us.logger.Println("Error retrieving user role:", err)
		return "", "", err
	}
	span.SetStatus(codes.Ok, "Successful validate token")
	return userID, role, nil
}

func (us *UserService) Delete(userId string) error {
	_, span := us.tracer.Start(context.Background(), "UserService.Delete")
	defer span.End()
	err := us.user.Delete(userId)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return err
	}
	span.SetStatus(codes.Ok, "Successful delete user")
	return nil
}
func (us *UserService) VerifyRecaptcha(token string) (bool, error) {
	_, span := us.tracer.Start(context.Background(), "UserService.VerifyRecaptcha")

	defer span.End()
	success, err := us.user.VerifyRecaptcha(token)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		us.logger.Println("Error verifying recaptcha:", err)
		return false, err
	}
	span.SetStatus(codes.Ok, "Successful verify recaptcha")
	return success, nil
}

func (us *UserService) GetUsersByIds(userIds []string) ([]data.Account, error) {
	_, span := us.tracer.Start(context.Background(), "UserService.GetUsersByIds")
	defer span.End()
	users, err := us.user.GetUsersByIds(userIds)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return nil, err
	}
	span.SetStatus(codes.Ok, "Successful get users")
	return users, nil
}
