package handler_test

import (
	"encoding/json"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/handler"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/repository/mock"
)

// vehicleRouter creates a chi router with vehicle (and team) routes for testing.
func vehicleRouter(h *handler.Handler, userID string) chi.Router {
	r := testRouter(h, userID) // reuses fake-auth from team_test.go

	r.Post("/teams/{teamId}/vehicles", h.CreateVehicle)
	r.Get("/teams/{teamId}/vehicles", h.ListVehicles)
	r.Get("/vehicles/{vehicleId}", h.GetVehicle)
	r.Put("/vehicles/{vehicleId}", h.UpdateVehicle)
	r.Delete("/vehicles/{vehicleId}", h.DeleteVehicle)
	r.Post("/vehicles/{vehicleId}/reset", h.ResetVehicleHistory)

	// Maintenance routes needed for cascade/reset tests
	r.Post("/vehicles/{vehicleId}/maintenance", h.CreateMaintenanceItem)
	r.Post("/vehicles/{vehicleId}/services", h.LogService)
	r.Post("/vehicles/{vehicleId}/usage", h.LogUsage)

	return r
}

func createTestVehicle(t *testing.T, r chi.Router, teamID string) model.Vehicle {
	t.Helper()
	body := jsonBody(model.CreateVehicleRequest{
		Name:      "Test Car",
		Type:      model.VehicleTypeCar,
		UsageUnit: model.UsageUnitKM,
	})
	req := httptest.NewRequest("POST", "/teams/"+teamID+"/vehicles", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("createTestVehicle failed: %d %s", w.Code, w.Body.String())
	}
	var v model.Vehicle
	json.NewDecoder(w.Body).Decode(&v)
	return v
}

func createTestTeam(t *testing.T, r chi.Router) model.Team {
	t.Helper()
	body := jsonBody(model.CreateTeamRequest{Name: "Test Team"})
	req := httptest.NewRequest("POST", "/teams", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("createTestTeam failed: %d %s", w.Code, w.Body.String())
	}
	var team model.Team
	json.NewDecoder(w.Body).Decode(&team)
	return team
}

func TestCreateVehicle(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := vehicleRouter(h, "user-1")
	team := createTestTeam(t, r)

	body := jsonBody(model.CreateVehicleRequest{
		Name:         "Honda Civic",
		Type:         model.VehicleTypeCar,
		UsageUnit:    model.UsageUnitKM,
		CurrentUsage: 50000,
		Make:         "Honda",
		Model:        "Civic",
		Year:         2020,
	})
	req := httptest.NewRequest("POST", "/teams/"+team.ID+"/vehicles", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var v model.Vehicle
	json.NewDecoder(w.Body).Decode(&v)
	if v.Name != "Honda Civic" {
		t.Errorf("expected name 'Honda Civic', got %q", v.Name)
	}
	if v.TeamID != team.ID {
		t.Errorf("expected teamID %q, got %q", team.ID, v.TeamID)
	}
	if v.CurrentUsage != 50000 {
		t.Errorf("expected usage 50000, got %f", v.CurrentUsage)
	}
	if v.ID == "" {
		t.Error("expected non-empty ID")
	}
}

func TestCreateVehicle_EmptyName(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := vehicleRouter(h, "user-1")
	team := createTestTeam(t, r)

	body := jsonBody(model.CreateVehicleRequest{Name: ""})
	req := httptest.NewRequest("POST", "/teams/"+team.ID+"/vehicles", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCreateVehicle_CarMustUseKM(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := vehicleRouter(h, "user-1")
	team := createTestTeam(t, r)

	body := jsonBody(model.CreateVehicleRequest{
		Name:      "Bad Car",
		Type:      model.VehicleTypeCar,
		UsageUnit: model.UsageUnitHours,
	})
	req := httptest.NewRequest("POST", "/teams/"+team.ID+"/vehicles", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for car with hours, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCreateVehicle_MotorcycleCanUseHours(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := vehicleRouter(h, "user-1")
	team := createTestTeam(t, r)

	body := jsonBody(model.CreateVehicleRequest{
		Name:      "Dirt Bike",
		Type:      model.VehicleTypeMotorcycle,
		UsageUnit: model.UsageUnitHours,
	})
	req := httptest.NewRequest("POST", "/teams/"+team.ID+"/vehicles", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
}

func TestListVehicles(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := vehicleRouter(h, "user-1")
	team := createTestTeam(t, r)

	createTestVehicle(t, r, team.ID)
	createTestVehicle(t, r, team.ID)

	req := httptest.NewRequest("GET", "/teams/"+team.ID+"/vehicles", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var vehicles []*model.Vehicle
	json.NewDecoder(w.Body).Decode(&vehicles)
	if len(vehicles) != 2 {
		t.Errorf("expected 2 vehicles, got %d", len(vehicles))
	}
}

func TestGetVehicle(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := vehicleRouter(h, "user-1")
	team := createTestTeam(t, r)
	v := createTestVehicle(t, r, team.ID)

	req := httptest.NewRequest("GET", "/vehicles/"+v.ID, nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var got model.Vehicle
	json.NewDecoder(w.Body).Decode(&got)
	if got.ID != v.ID {
		t.Errorf("expected ID %q, got %q", v.ID, got.ID)
	}
}

func TestGetVehicle_NotFound(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := vehicleRouter(h, "user-1")

	req := httptest.NewRequest("GET", "/vehicles/nonexistent", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestUpdateVehicle_PartialUpdate(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := vehicleRouter(h, "user-1")
	team := createTestTeam(t, r)
	v := createTestVehicle(t, r, team.ID)

	newName := "Updated Car"
	body := jsonBody(model.UpdateVehicleRequest{Name: &newName})
	req := httptest.NewRequest("PUT", "/vehicles/"+v.ID, body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var updated model.Vehicle
	json.NewDecoder(w.Body).Decode(&updated)
	if updated.Name != "Updated Car" {
		t.Errorf("expected name 'Updated Car', got %q", updated.Name)
	}
	// Type should remain unchanged
	if updated.Type != model.VehicleTypeCar {
		t.Errorf("expected type to remain 'car', got %q", updated.Type)
	}
}

func TestUpdateVehicle_CarCannotSwitchToHours(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := vehicleRouter(h, "user-1")
	team := createTestTeam(t, r)
	v := createTestVehicle(t, r, team.ID)

	hours := model.UsageUnitHours
	body := jsonBody(model.UpdateVehicleRequest{UsageUnit: &hours})
	req := httptest.NewRequest("PUT", "/vehicles/"+v.ID, body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestDeleteVehicle(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := vehicleRouter(h, "user-1")
	team := createTestTeam(t, r)
	v := createTestVehicle(t, r, team.ID)

	req := httptest.NewRequest("DELETE", "/vehicles/"+v.ID, nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d: %s", w.Code, w.Body.String())
	}

	// Verify gone
	req = httptest.NewRequest("GET", "/vehicles/"+v.ID, nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 after delete, got %d", w.Code)
	}
}

func TestDeleteVehicle_CascadeDeletesRelatedData(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := vehicleRouter(h, "user-1")
	team := createTestTeam(t, r)
	v := createTestVehicle(t, r, team.ID)

	// Add some usage history
	body := jsonBody(model.LogUsageRequest{Usage: 1000, Date: "2025-01-15T10:00:00Z"})
	req := httptest.NewRequest("POST", "/vehicles/"+v.ID+"/usage", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Delete vehicle
	req = httptest.NewRequest("DELETE", "/vehicles/"+v.ID, nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", w.Code)
	}

	// Verify usage history is also gone (check via repo directly)
	entries, _ := repos.UsageHistory.ListByVehicle(context.Background(), v.ID)
	if len(entries) != 0 {
		t.Errorf("expected 0 usage entries after cascade delete, got %d", len(entries))
	}
}

func TestResetVehicleHistory(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := vehicleRouter(h, "user-1")
	team := createTestTeam(t, r)
	v := createTestVehicle(t, r, team.ID)

	// Add usage
	body := jsonBody(model.LogUsageRequest{Usage: 5000, Date: "2025-01-15T10:00:00Z"})
	req := httptest.NewRequest("POST", "/vehicles/"+v.ID+"/usage", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Reset
	req = httptest.NewRequest("POST", "/vehicles/"+v.ID+"/reset", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	// Verify vehicle usage is reset to 0
	req = httptest.NewRequest("GET", "/vehicles/"+v.ID, nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var got model.Vehicle
	json.NewDecoder(w.Body).Decode(&got)
	if got.CurrentUsage != 0 {
		t.Errorf("expected current_usage 0 after reset, got %f", got.CurrentUsage)
	}
}
