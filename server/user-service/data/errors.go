package data

import "errors"

var (
	errEmailAlreadyExists   error = errors.New("email already exists")
	errEmailDoesntExist     error = errors.New("email doesn't exist")
	errUserAlreadyLoggedIn  error = errors.New("user already logged in")
	errPasswordIsNotAllowed error = errors.New("password is not allowed")
)

func ErrEmailAlreadyExists() error {
	return errEmailAlreadyExists
}

func ErrEmailDoesntExist() error {
	return errEmailDoesntExist
}

func ErrUserAlreadyLoggedIn() error {
	return errUserAlreadyLoggedIn
}
func ErrPasswordIsNotAllowed() error {
	return errPasswordIsNotAllowed
}
