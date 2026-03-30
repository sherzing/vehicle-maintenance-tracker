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

func serviceHistoryRouter(h *handler.Handler, userID string) chi.Router {
	r := maintenanceRouter(h, userID)

	r.Post("/vehicles/{vehicleId}/services", h.LogService)
	r.Post("/vehicles/{vehicleId}/repairs", h.LogRepair)
	r.Get("/vehicles/{vehicleId}/history", h.ListServiceHistory)
	r.Put("/history/{historyId}", h.UpdateServiceHistory)
	r.Delete("/history/{historyId}", h.DeleteServiceHistory)

	return r
}

// setupVehicleWithMaintenance creates a team, vehicle, and maintenance item, returning their IDs.
func setupVehicleWithMaintenance(t *testing.T, r chi.Router, teamID string) (vehicleID, maintItemID string) {
	t.Helper()
	v := createTestVehicle(t, r, teamID)

	body := jsonBody(model.CreateMaintenanceItemRequest{
		Name:          "Oil Change",
		UsageInterval: ptrFloat64(5000),
	})
	req := httptest.NewRequest("POST", "/vehicles/"+v.ID+"/maintenance", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("create maintenance failed: %d %s", w.Code, w.Body.String())
	}
	var item model.MaintenanceItem
	json.NewDecoder(w.Body).Decode(&item)
	return v.ID, item.ID
}

func TestLogService(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := serviceHistoryRouter(h, "user-1")
	team := createTestTeam(t, r)
	vehicleID, maintID := setupVehicleWithMaintenance(t, r, team.ID)

	body := jsonBody(model.LogServiceRequest{
		MaintenanceItemID: maintID,
		ServiceUsage:      5000,
		ServiceDate:       "2025-01-15T10:00:00Z",
		Cost:              ptrFloat64(75.50),
		Provider:          ptrString("Quick Lube"),
	})
	req := httptest.NewRequest("POST", "/vehicles/"+vehicleID+"/services", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var entry model.ServiceHistory
	json.NewDecoder(w.Body).Decode(&entry)
	if entry.Type != model.HistoryTypeService {
		t.Errorf("expected type 'service', got %q", entry.Type)
	}
	if entry.ItemName != "Oil Change" {
		t.Errorf("expected item name 'Oil Change', got %q", entry.ItemName)
	}
}

func TestLogService_UpdatesMaintenanceItem(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := serviceHistoryRouter(h, "user-1")
	team := createTestTeam(t, r)
	vehicleID, maintID := setupVehicleWithMaintenance(t, r, team.ID)

	// Log service at 5000km
	body := jsonBody(model.LogServiceRequest{
		MaintenanceItemID: maintID,
		ServiceUsage:      5000,
		ServiceDate:       "2025-06-01T10:00:00Z",
	})
	req := httptest.NewRequest("POST", "/vehicles/"+vehicleID+"/services", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Verify maintenance item was updated
	item, _ := repos.Maintenance.GetByID(context.Background(), maintID)
	if item.LastServiceUsage == nil || *item.LastServiceUsage != 5000 {
		t.Errorf("expected last_service_usage 5000, got %v", item.LastServiceUsage)
	}
	if item.LastServiceDate == nil {
		t.Error("expected last_service_date to be set")
	}
}

func TestLogService_ConditionalUpdate_OlderServiceDoesNotOverwrite(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := serviceHistoryRouter(h, "user-1")
	team := createTestTeam(t, r)
	vehicleID, maintID := setupVehicleWithMaintenance(t, r, team.ID)

	// First service at a later date
	body := jsonBody(model.LogServiceRequest{
		MaintenanceItemID: maintID,
		ServiceUsage:      10000,
		ServiceDate:       "2025-06-01T10:00:00Z",
	})
	req := httptest.NewRequest("POST", "/vehicles/"+vehicleID+"/services", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Now log an older service — should NOT overwrite
	body = jsonBody(model.LogServiceRequest{
		MaintenanceItemID: maintID,
		ServiceUsage:      5000,
		ServiceDate:       "2025-01-01T10:00:00Z",
	})
	req = httptest.NewRequest("POST", "/vehicles/"+vehicleID+"/services", body)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Maintenance item should still show the newer service
	item, _ := repos.Maintenance.GetByID(context.Background(), maintID)
	if *item.LastServiceUsage != 10000 {
		t.Errorf("expected last_service_usage 10000 (not overwritten), got %f", *item.LastServiceUsage)
	}
}

func TestLogRepair(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := serviceHistoryRouter(h, "user-1")
	team := createTestTeam(t, r)
	v := createTestVehicle(t, r, team.ID)

	body := jsonBody(model.LogRepairRequest{
		Description: "Brake pad replacement",
		ServiceDate: "2025-03-10T10:00:00Z",
		Cost:        ptrFloat64(250.00),
	})
	req := httptest.NewRequest("POST", "/vehicles/"+v.ID+"/repairs", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var entry model.ServiceHistory
	json.NewDecoder(w.Body).Decode(&entry)
	if entry.Type != model.HistoryTypeRepair {
		t.Errorf("expected type 'repair', got %q", entry.Type)
	}
	if entry.ItemName != "Brake pad replacement" {
		t.Errorf("expected description, got %q", entry.ItemName)
	}
}

func TestListServiceHistory(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := serviceHistoryRouter(h, "user-1")
	team := createTestTeam(t, r)
	vehicleID, maintID := setupVehicleWithMaintenance(t, r, team.ID)

	// Log a service and a repair
	body := jsonBody(model.LogServiceRequest{
		MaintenanceItemID: maintID,
		ServiceUsage:      5000,
		ServiceDate:       "2025-01-15T10:00:00Z",
	})
	req := httptest.NewRequest("POST", "/vehicles/"+vehicleID+"/services", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	body = jsonBody(model.LogRepairRequest{
		Description: "Fix dent",
		ServiceDate: "2025-02-01T10:00:00Z",
	})
	req = httptest.NewRequest("POST", "/vehicles/"+vehicleID+"/repairs", body)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// List
	req = httptest.NewRequest("GET", "/vehicles/"+vehicleID+"/history", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var history []*model.ServiceHistory
	json.NewDecoder(w.Body).Decode(&history)
	if len(history) != 2 {
		t.Errorf("expected 2 entries, got %d", len(history))
	}
}

func TestDeleteServiceHistory_RecalculatesMaintenanceItem(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := serviceHistoryRouter(h, "user-1")
	team := createTestTeam(t, r)
	vehicleID, maintID := setupVehicleWithMaintenance(t, r, team.ID)

	// Log two services
	body := jsonBody(model.LogServiceRequest{
		MaintenanceItemID: maintID,
		ServiceUsage:      5000,
		ServiceDate:       "2025-01-15T10:00:00Z",
	})
	req := httptest.NewRequest("POST", "/vehicles/"+vehicleID+"/services", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var first model.ServiceHistory
	json.NewDecoder(w.Body).Decode(&first)

	body = jsonBody(model.LogServiceRequest{
		MaintenanceItemID: maintID,
		ServiceUsage:      10000,
		ServiceDate:       "2025-06-15T10:00:00Z",
	})
	req = httptest.NewRequest("POST", "/vehicles/"+vehicleID+"/services", body)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var second model.ServiceHistory
	json.NewDecoder(w.Body).Decode(&second)

	// Delete the most recent service
	req = httptest.NewRequest("DELETE", "/history/"+second.ID, nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", w.Code)
	}

	// Maintenance item should fall back to the first service's data
	item, _ := repos.Maintenance.GetByID(context.Background(), maintID)
	if item.LastServiceUsage == nil || *item.LastServiceUsage != 5000 {
		t.Errorf("expected recalculated last_service_usage 5000, got %v", item.LastServiceUsage)
	}
}
