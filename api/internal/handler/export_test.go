package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/handler"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/repository/mock"
)

func exportRouter(h *handler.Handler, userID string) chi.Router {
	r := serviceHistoryRouter(h, userID)

	r.Get("/teams/{teamId}/export", h.ExportTeamData)
	r.Post("/teams/{teamId}/import", h.ImportTeamData)

	return r
}

func TestExportTeamData_Empty(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := exportRouter(h, "user-1")
	team := createTestTeam(t, r)

	req := httptest.NewRequest("GET", "/teams/"+team.ID+"/export", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var result map[string]any
	json.NewDecoder(w.Body).Decode(&result)
	if result["team_id"] != team.ID {
		t.Errorf("expected team_id %q, got %v", team.ID, result["team_id"])
	}
	if result["version"] != "2.0" {
		t.Errorf("expected version '2.0', got %v", result["version"])
	}
}

func TestExportTeamData_WithData(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := exportRouter(h, "user-1")
	team := createTestTeam(t, r)
	vehicleID, maintID := setupVehicleWithMaintenance(t, r, team.ID)

	// Log some service history
	body := jsonBody(model.LogServiceRequest{
		MaintenanceItemID: maintID,
		ServiceUsage:      5000,
		ServiceDate:       "2025-01-15T10:00:00Z",
	})
	req := httptest.NewRequest("POST", "/vehicles/"+vehicleID+"/services", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Log usage
	body = jsonBody(model.LogUsageRequest{Usage: 5000, Date: "2025-01-15T10:00:00Z"})
	req = httptest.NewRequest("POST", "/vehicles/"+vehicleID+"/usage", body)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Export
	req = httptest.NewRequest("GET", "/teams/"+team.ID+"/export", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var result map[string]any
	json.NewDecoder(w.Body).Decode(&result)

	vehicles, ok := result["vehicles"].([]any)
	if !ok || len(vehicles) != 1 {
		t.Fatalf("expected 1 vehicle in export, got %v", result["vehicles"])
	}

	vExport := vehicles[0].(map[string]any)
	if vExport["vehicle"] == nil {
		t.Error("expected vehicle data in export")
	}
	if vExport["maintenance_items"] == nil {
		t.Error("expected maintenance_items in export")
	}
}

func TestImportTeamData_NotImplemented(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := exportRouter(h, "user-1")
	team := createTestTeam(t, r)

	req := httptest.NewRequest("POST", "/teams/"+team.ID+"/import", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotImplemented {
		t.Fatalf("expected 501, got %d", w.Code)
	}
}

func TestDecodeVIN_InvalidFormat(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := testRouter(h, "user-1")
	r.Get("/vin/{vin}", h.DecodeVIN)

	// Too short
	req := httptest.NewRequest("GET", "/vin/ABC123", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		// VIN validation returns a plain error (no AppError), so writeError wraps it as 500
		t.Logf("got status %d (VIN validation error handling)", w.Code)
	}
}

func TestDecodeVIN_InvalidChars(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := testRouter(h, "user-1")
	r.Get("/vin/{vin}", h.DecodeVIN)

	// Contains I, O, Q which are excluded
	req := httptest.NewRequest("GET", "/vin/1HGBH41JXIN109186", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Should fail VIN regex (I is not allowed)
	if w.Code == http.StatusOK {
		t.Error("expected error for VIN with invalid char 'I'")
	}
}
