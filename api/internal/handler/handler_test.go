package handler_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/handler"
)

func TestHealthEndpoint(t *testing.T) {
	h := handler.New(nil, nil) // Health doesn't need repos or auth

	r := chi.NewRouter()
	h.RegisterRoutes(r)

	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	body := w.Body.String()
	if body == "" {
		t.Error("expected non-empty body")
	}
	t.Logf("Health response: %s", body)
}
