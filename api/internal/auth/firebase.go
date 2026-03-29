package auth

import (
	"context"
	"fmt"
	"strings"

	firebase "firebase.google.com/go/v4"
	firebaseAuth "firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

// Verifier validates Firebase JWT tokens.
type Verifier struct {
	client *firebaseAuth.Client
}

// Claims holds the decoded token claims.
type Claims struct {
	UID   string
	Email string
	Name  string
}

// NewVerifier creates a Firebase token verifier.
func NewVerifier(ctx context.Context, projectID string) (*Verifier, error) {
	app, err := firebase.NewApp(ctx, &firebase.Config{
		ProjectID: projectID,
	}, option.WithoutAuthentication())
	if err != nil {
		return nil, fmt.Errorf("initializing firebase app: %w", err)
	}

	client, err := app.Auth(ctx)
	if err != nil {
		return nil, fmt.Errorf("initializing firebase auth: %w", err)
	}

	return &Verifier{client: client}, nil
}

// VerifyToken validates a Firebase ID token and returns the claims.
func (v *Verifier) VerifyToken(ctx context.Context, idToken string) (*Claims, error) {
	// Strip "Bearer " prefix if present
	token := strings.TrimPrefix(idToken, "Bearer ")

	decoded, err := v.client.VerifyIDToken(ctx, token)
	if err != nil {
		return nil, fmt.Errorf("verifying token: %w", err)
	}

	claims := &Claims{
		UID: decoded.UID,
	}

	if email, ok := decoded.Claims["email"].(string); ok {
		claims.Email = email
	}
	if name, ok := decoded.Claims["name"].(string); ok {
		claims.Name = name
	}

	return claims, nil
}
