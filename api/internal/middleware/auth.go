package middleware

import (
	"context"
	"net/http"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/auth"
)

type contextKey string

const UserClaimsKey contextKey = "user_claims"

// Auth returns middleware that validates Firebase JWT tokens.
func Auth(verifier *auth.Verifier) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := r.Header.Get("Authorization")
			if token == "" {
				http.Error(w, `{"code":401,"message":"missing authorization header"}`, http.StatusUnauthorized)
				return
			}

			claims, err := verifier.VerifyToken(r.Context(), token)
			if err != nil {
				http.Error(w, `{"code":401,"message":"invalid or expired token"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetClaims extracts user claims from the request context.
func GetClaims(ctx context.Context) *auth.Claims {
	claims, _ := ctx.Value(UserClaimsKey).(*auth.Claims)
	return claims
}
