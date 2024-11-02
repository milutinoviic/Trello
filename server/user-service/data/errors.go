package data

import "errors"

var (
	errEmailAlreadyExists error = errors.New("email already exists")
)

func ErrEmailAlreadyExists() error {
	return errEmailAlreadyExists
}
