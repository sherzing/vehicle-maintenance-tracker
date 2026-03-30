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

func maintenanceRouter(h *handler.Handler, userID string) chi.Router {
	r := vehicleRouter(h, userID) // includes team + vehicle routes

	r.Get("/vehicles/{vehicleId}/maintenance", h.ListMaintenanceItems)
	r.Get("/maintenance/{itemId}", h.GetMaintenanceItem)
	r.Put("/maintenance/{itemId}", h.UpdateMaintenanceItem)
	r.Delete("/maintenance/{itemId}", h.DeleteMaintenanceItem)

	return r
}

func ptrFloat64(v float64) *float64 { return &v }
func ptrInt(v int) *int             { return &v }
func ptrString(v string) *string    { return &v }

func TestCreateMaintenanceItem(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := maintenanceRouter(h, "user-1")
	team := createTestTeam(t, r)
	v := createTestVehicle(t, r, team.ID)

	body := jsonBody(model.CreateMaintenanceItemRequest{
		Name:          "Oil Change",
		UsageInterval: ptrFloat64(5000),
	})
	req := httptest.NewRequest("POST", "/vehicles/"+v.ID+"/maintenance", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var item model.MaintenanceItem
	json.NewDecoder(w.Body).Decode(&item)
	if item.Name != "Oil Change" {
		t.Errorf("expected 'Oil Change', got %q", item.Name)
	}
	if item.UsageInterval == nil || *item.UsageInterval != 5000 {
		t.Error("expected usage_interval 5000")
	}
}

func TestCreateMaintenanceItem_RequiresInterval(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := maintenanceRouter(h, "user-1")
	team := createTestTeam(t, r)
	v := createTestVehicle(t, r, team.ID)

	body := jsonBody(model.CreateMaintenanceItemRequest{Name: "Bad Item"})
	req := httptest.NewRequest("POST", "/vehicles/"+v.ID+"/maintenance", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCreateMaintenanceItem_TimeOnly(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := maintenanceRouter(h, "user-1")
	team := createTestTeam(t, r)
	v := createTestVehicle(t, r, team.ID)

	body := jsonBody(model.CreateMaintenanceItemRequest{
		Name:             "Inspection",
		TimeIntervalDays: ptrInt(365),
	})
	req := httptest.NewRequest("POST", "/vehicles/"+v.ID+"/maintenance", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
}

func TestListMaintenanceItems_WithStatus(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := maintenanceRouter(h, "user-1")
	team := createTestTeam(t, r)
	v := createTestVehicle(t, r, team.ID)

	// Create item with usage interval, last service at 0, vehicle at 0
	body := jsonBody(model.CreateMaintenanceItemRequest{
		Name:             "Oil Change",
		UsageInterval:    ptrFloat64(5000),
		LastServiceUsage: ptrFloat64(0),
	})
	req := httptest.NewRequest("POST", "/vehicles/"+v.ID+"/maintenance", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// List — vehicle at 0 usage, so should be OK status
	req = httptest.NewRequest("GET", "/vehicles/"+v.ID+"/maintenance", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var items []model.MaintenanceItemWithStatus
	json.NewDecoder(w.Body).Decode(&items)
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
	if items[0].Status != model.StatusOK {
		t.Errorf("expected status 'ok' at 0 usage, got %q", items[0].Status)
	}
}

func TestListMaintenanceItems_DueSoonStatus(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := maintenanceRouter(h, "user-1")
	team := createTestTeam(t, r)

	// Create vehicle with high usage
	body := jsonBody(model.CreateVehicleRequest{
		Name:         "High Usage Car",
		Type:         model.VehicleTypeCar,
		UsageUnit:    model.UsageUnitKM,
		CurrentUsage: 4600, // 92% of 5000 interval
	})
	req := httptest.NewRequest("POST", "/teams/"+team.ID+"/vehicles", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var v model.Vehicle
	json.NewDecoder(w.Body).Decode(&v)

	// Create maintenance item
	body = jsonBody(model.CreateMaintenanceItemRequest{
		Name:             "Oil Change",
		UsageInterval:    ptrFloat64(5000),
		LastServiceUsage: ptrFloat64(0),
	})
	req = httptest.NewRequest("POST", "/vehicles/"+v.ID+"/maintenance", body)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// List — 4600/5000 = 92% > 90% threshold → Due Soon
	req = httptest.NewRequest("GET", "/vehicles/"+v.ID+"/maintenance", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var items []model.MaintenanceItemWithStatus
	json.NewDecoder(w.Body).Decode(&items)
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
	if items[0].Status != model.StatusDueSoon {
		t.Errorf("expected 'due_soon' at 92%%, got %q (pct=%f)", items[0].Status, items[0].Percentage)
	}
}

func TestListMaintenanceItems_OverdueStatus(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := maintenanceRouter(h, "user-1")
	team := createTestTeam(t, r)

	body := jsonBody(model.CreateVehicleRequest{
		Name:         "Overdue Car",
		Type:         model.VehicleTypeCar,
		UsageUnit:    model.UsageUnitKM,
		CurrentUsage: 5600, // 112% of 5000 interval > 110% overdue threshold
	})
	req := httptest.NewRequest("POST", "/teams/"+team.ID+"/vehicles", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var v model.Vehicle
	json.NewDecoder(w.Body).Decode(&v)

	body = jsonBody(model.CreateMaintenanceItemRequest{
		Name:             "Oil Change",
		UsageInterval:    ptrFloat64(5000),
		LastServiceUsage: ptrFloat64(0),
	})
	req = httptest.NewRequest("POST", "/vehicles/"+v.ID+"/maintenance", body)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	req = httptest.NewRequest("GET", "/vehicles/"+v.ID+"/maintenance", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var items []model.MaintenanceItemWithStatus
	json.NewDecoder(w.Body).Decode(&items)
	if items[0].Status != model.StatusOverdue {
		t.Errorf("expected 'overdue' at 112%%, got %q (pct=%f)", items[0].Status, items[0].Percentage)
	}
}

func TestGetMaintenanceItem(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := maintenanceRouter(h, "user-1")
	team := createTestTeam(t, r)
	v := createTestVehicle(t, r, team.ID)

	body := jsonBody(model.CreateMaintenanceItemRequest{
		Name:          "Tire Rotation",
		UsageInterval: ptrFloat64(10000),
	})
	req := httptest.NewRequest("POST", "/vehicles/"+v.ID+"/maintenance", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var created model.MaintenanceItem
	json.NewDecoder(w.Body).Decode(&created)

	req = httptest.NewRequest("GET", "/maintenance/"+created.ID, nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var got model.MaintenanceItem
	json.NewDecoder(w.Body).Decode(&got)
	if got.Name != "Tire Rotation" {
		t.Errorf("expected 'Tire Rotation', got %q", got.Name)
	}
}

func TestUpdateMaintenanceItem(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := maintenanceRouter(h, "user-1")
	team := createTestTeam(t, r)
	v := createTestVehicle(t, r, team.ID)

	body := jsonBody(model.CreateMaintenanceItemRequest{
		Name:          "Oil Change",
		UsageInterval: ptrFloat64(5000),
	})
	req := httptest.NewRequest("POST", "/vehicles/"+v.ID+"/maintenance", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var created model.MaintenanceItem
	json.NewDecoder(w.Body).Decode(&created)

	// Update name and interval
	body = jsonBody(model.UpdateMaintenanceItemRequest{
		Name:          ptrString("Synthetic Oil Change"),
		UsageInterval: ptrFloat64(7500),
	})
	req = httptest.NewRequest("PUT", "/maintenance/"+created.ID, body)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var updated model.MaintenanceItem
	json.NewDecoder(w.Body).Decode(&updated)
	if updated.Name != "Synthetic Oil Change" {
		t.Errorf("expected 'Synthetic Oil Change', got %q", updated.Name)
	}
	if *updated.UsageInterval != 7500 {
		t.Errorf("expected interval 7500, got %f", *updated.UsageInterval)
	}
}

func TestDeleteMaintenanceItem(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := maintenanceRouter(h, "user-1")
	team := createTestTeam(t, r)
	v := createTestVehicle(t, r, team.ID)

	body := jsonBody(model.CreateMaintenanceItemRequest{
		Name:          "Oil Change",
		UsageInterval: ptrFloat64(5000),
	})
	req := httptest.NewRequest("POST", "/vehicles/"+v.ID+"/maintenance", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var created model.MaintenanceItem
	json.NewDecoder(w.Body).Decode(&created)

	req = httptest.NewRequest("DELETE", "/maintenance/"+created.ID, nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", w.Code)
	}

	// Verify gone
	req = httptest.NewRequest("GET", "/maintenance/"+created.ID, nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 after delete, got %d", w.Code)
	}
}
