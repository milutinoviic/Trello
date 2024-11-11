package data

import "errors"

var (
	errEmailAlreadyExists  error = errors.New("email already exists")
	errEmailDoesntExist    error = errors.New("email doesn't exist")
	errUserAlreadyLoggedIn error = errors.New("user already logged in")
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
