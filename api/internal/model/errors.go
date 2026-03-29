package model

import "fmt"

// AppError represents a structured application error.
type AppError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

func (e *AppError) Error() string {
	return e.Message
}

func ErrNotFound(resource string) *AppError {
	return &AppError{Code: 404, Message: fmt.Sprintf("%s not found", resource)}
}

func ErrRequired(field string) *AppError {
	return &AppError{Code: 400, Message: fmt.Sprintf("%s is required", field)}
}

func ErrValidation(msg string) *AppError {
	return &AppError{Code: 400, Message: msg}
}

func ErrForbidden(msg string) *AppError {
	return &AppError{Code: 403, Message: msg}
}

func ErrUnauthorized() *AppError {
	return &AppError{Code: 401, Message: "unauthorized"}
}

func ErrConflict(msg string) *AppError {
	return &AppError{Code: 409, Message: msg}
}

func ErrInternal(msg string) *AppError {
	return &AppError{Code: 500, Message: msg}
}
