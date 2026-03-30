package handler_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/handler"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/repository/mock"
)

func usageRouter(h *handler.Handler, userID string) chi.Router {
	r := vehicleRouter(h, userID)

	r.Get("/vehicles/{vehicleId}/usage", h.ListUsageHistory)
	r.Put("/usage/{usageId}", h.UpdateUsage)
	r.Delete("/usage/{usageId}", h.DeleteUsage)
	r.Post("/vehicles/{vehicleId}/usage/resolve-conflict", h.ResolveUsageConflict)

	return r
}

func TestLogUsage(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := usageRouter(h, "user-1")
	team := createTestTeam(t, r)
	v := createTestVehicle(t, r, team.ID)

	body := jsonBody(model.LogUsageRequest{
		Usage: 1000,
		Date:  "2025-01-15T10:00:00Z",
	})
	req := httptest.NewRequest("POST", "/vehicles/"+v.ID+"/usage", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp model.LogUsageResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.EntryID == "" {
		t.Error("expected non-empty entry ID")
	}
	if resp.Conflict {
		t.Error("expected no conflict for first entry")
	}
}

func TestLogUsage_UpdatesVehicleUsage(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := usageRouter(h, "user-1")
	team := createTestTeam(t, r)
	v := createTestVehicle(t, r, team.ID)

	body := jsonBody(model.LogUsageRequest{Usage: 5000, Date: "2025-01-15T10:00:00Z"})
	req := httptest.NewRequest("POST", "/vehicles/"+v.ID+"/usage", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Vehicle current_usage should be updated
	vehicle, _ := repos.Vehicles.GetByID(context.Background(), v.ID)
	if vehicle.CurrentUsage != 5000 {
		t.Errorf("expected vehicle current_usage 5000, got %f", vehicle.CurrentUsage)
	}
}

func TestLogUsage_NegativeUsageRejected(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := usageRouter(h, "user-1")
	team := createTestTeam(t, r)
	v := createTestVehicle(t, r, team.ID)

	body := jsonBody(model.LogUsageRequest{Usage: -100, Date: "2025-01-15T10:00:00Z"})
	req := httptest.NewRequest("POST", "/vehicles/"+v.ID+"/usage", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for negative usage, got %d", w.Code)
	}
}

func TestLogUsage_ExceedsMaxRejected(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := usageRouter(h, "user-1")
	team := createTestTeam(t, r)
	v := createTestVehicle(t, r, team.ID)

	body := jsonBody(model.LogUsageRequest{Usage: 10_000_000, Date: "2025-01-15T10:00:00Z"})
	req := httptest.NewRequest("POST", "/vehicles/"+v.ID+"/usage", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for excessive usage, got %d", w.Code)
	}
}

func TestListUsageHistory(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := usageRouter(h, "user-1")
	team := createTestTeam(t, r)
	v := createTestVehicle(t, r, team.ID)

	// Log two entries
	for _, usage := range []float64{1000, 2000} {
		body := jsonBody(model.LogUsageRequest{Usage: usage, Date: "2025-01-15T10:00:00Z"})
		req := httptest.NewRequest("POST", "/vehicles/"+v.ID+"/usage", body)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
	}

	req := httptest.NewRequest("GET", "/vehicles/"+v.ID+"/usage", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var history []*model.UsageHistory
	json.NewDecoder(w.Body).Decode(&history)
	if len(history) != 2 {
		t.Errorf("expected 2 entries, got %d", len(history))
	}
}

func TestUpdateUsage_OptimisticLocking(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := usageRouter(h, "user-1")
	team := createTestTeam(t, r)
	v := createTestVehicle(t, r, team.ID)

	// Log entry (version starts at 1)
	body := jsonBody(model.LogUsageRequest{Usage: 1000, Date: "2025-01-15T10:00:00Z"})
	req := httptest.NewRequest("POST", "/vehicles/"+v.ID+"/usage", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var logResp model.LogUsageResponse
	json.NewDecoder(w.Body).Decode(&logResp)

	// Update with correct version
	staleVersion := 1
	body = jsonBody(model.UpdateUsageRequest{
		Usage:           1500,
		Date:            "2025-01-15T10:00:00Z",
		ExpectedVersion: &staleVersion,
	})
	req = httptest.NewRequest("PUT", "/usage/"+logResp.EntryID, body)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 for correct version, got %d: %s", w.Code, w.Body.String())
	}

	// Try to update again with the old version — should conflict
	body = jsonBody(model.UpdateUsageRequest{
		Usage:           2000,
		Date:            "2025-01-15T10:00:00Z",
		ExpectedVersion: &staleVersion,
	})
	req = httptest.NewRequest("PUT", "/usage/"+logResp.EntryID, body)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409 for stale version, got %d: %s", w.Code, w.Body.String())
	}
}

func TestDeleteUsage_RecalculatesVehicleUsage(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := usageRouter(h, "user-1")
	team := createTestTeam(t, r)
	v := createTestVehicle(t, r, team.ID)

	// Log two entries
	body := jsonBody(model.LogUsageRequest{Usage: 3000, Date: "2025-01-10T10:00:00Z"})
	req := httptest.NewRequest("POST", "/vehicles/"+v.ID+"/usage", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	body = jsonBody(model.LogUsageRequest{Usage: 5000, Date: "2025-01-15T10:00:00Z"})
	req = httptest.NewRequest("POST", "/vehicles/"+v.ID+"/usage", body)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var secondResp model.LogUsageResponse
	json.NewDecoder(w.Body).Decode(&secondResp)

	// Vehicle should be at 5000
	vehicle, _ := repos.Vehicles.GetByID(context.Background(), v.ID)
	if vehicle.CurrentUsage != 5000 {
		t.Fatalf("expected 5000, got %f", vehicle.CurrentUsage)
	}

	// Delete the highest entry
	req = httptest.NewRequest("DELETE", "/usage/"+secondResp.EntryID, nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", w.Code)
	}

	// Vehicle should fall back to 3000
	vehicle, _ = repos.Vehicles.GetByID(context.Background(), v.ID)
	if vehicle.CurrentUsage != 3000 {
		t.Errorf("expected recalculated usage 3000, got %f", vehicle.CurrentUsage)
	}
}

func TestResolveUsageConflict(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := usageRouter(h, "user-1")
	team := createTestTeam(t, r)
	v := createTestVehicle(t, r, team.ID)

	// Set some initial usage
	body := jsonBody(model.LogUsageRequest{Usage: 1000, Date: "2025-01-15T10:00:00Z"})
	req := httptest.NewRequest("POST", "/vehicles/"+v.ID+"/usage", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Resolve conflict by choosing a specific usage
	body = jsonBody(model.ResolveConflictRequest{ChosenUsage: 4500})
	req = httptest.NewRequest("POST", "/vehicles/"+v.ID+"/usage/resolve-conflict", body)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d: %s", w.Code, w.Body.String())
	}

	vehicle, _ := repos.Vehicles.GetByID(context.Background(), v.ID)
	if vehicle.CurrentUsage != 4500 {
		t.Errorf("expected resolved usage 4500, got %f", vehicle.CurrentUsage)
	}
}
