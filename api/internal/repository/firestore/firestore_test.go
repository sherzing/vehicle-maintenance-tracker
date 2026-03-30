package firestore

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

// mockHTTPClient simulates the Firestore REST API in-memory for testing.
type mockHTTPClient struct {
	mu          sync.Mutex
	collections map[string]map[string]Document // collection -> docID -> Document
	idCounter   atomic.Uint64
}

func newMockHTTPClient() *mockHTTPClient {
	return &mockHTTPClient{
		collections: make(map[string]map[string]Document),
	}
}

func (m *mockHTTPClient) Do(req *http.Request) (*http.Response, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	path := req.URL.Path
	// Strip the base prefix: /v1/projects/{proj}/databases/(default)/documents/
	parts := strings.Split(path, "/documents/")
	if len(parts) < 2 {
		return jsonResponse(http.StatusBadRequest, map[string]string{"error": "bad path"})
	}
	remainder := parts[1] // e.g. "teams" or "teams/abc123"
	segments := strings.SplitN(remainder, "/", 2)
	collection := segments[0]

	switch req.Method {
	case "POST":
		return m.handleCreate(req, collection)
	case "GET":
		if len(segments) == 2 {
			return m.handleGet(collection, segments[1])
		}
		return m.handleList(collection)
	case "PATCH":
		if len(segments) == 2 {
			return m.handleUpdate(req, collection, segments[1])
		}
		return jsonResponse(http.StatusBadRequest, map[string]string{"error": "missing doc ID"})
	case "DELETE":
		if len(segments) == 2 {
			return m.handleDelete(collection, segments[1])
		}
		return jsonResponse(http.StatusBadRequest, map[string]string{"error": "missing doc ID"})
	}
	return jsonResponse(http.StatusMethodNotAllowed, nil)
}

func (m *mockHTTPClient) handleCreate(req *http.Request, collection string) (*http.Response, error) {
	var doc Document
	json.NewDecoder(req.Body).Decode(&doc)

	if m.collections[collection] == nil {
		m.collections[collection] = make(map[string]Document)
	}

	id := fmt.Sprintf("doc-%d", m.idCounter.Add(1))
	doc.Name = fmt.Sprintf("projects/test/databases/(default)/documents/%s/%s", collection, id)
	m.collections[collection][id] = doc
	return jsonResponse(http.StatusOK, doc)
}

func (m *mockHTTPClient) handleGet(collection, id string) (*http.Response, error) {
	if m.collections[collection] == nil {
		return jsonResponse(http.StatusNotFound, map[string]string{"error": "not found"})
	}
	doc, ok := m.collections[collection][id]
	if !ok {
		return jsonResponse(http.StatusNotFound, map[string]string{"error": "not found"})
	}
	return jsonResponse(http.StatusOK, doc)
}

func (m *mockHTTPClient) handleList(collection string) (*http.Response, error) {
	var docs []Document
	if m.collections[collection] != nil {
		for _, doc := range m.collections[collection] {
			docs = append(docs, doc)
		}
	}
	return jsonResponse(http.StatusOK, map[string]any{"documents": docs})
}

func (m *mockHTTPClient) handleUpdate(req *http.Request, collection, id string) (*http.Response, error) {
	if m.collections[collection] == nil || m.collections[collection][id].Name == "" {
		return jsonResponse(http.StatusNotFound, map[string]string{"error": "not found"})
	}
	var doc Document
	json.NewDecoder(req.Body).Decode(&doc)
	doc.Name = fmt.Sprintf("projects/test/databases/(default)/documents/%s/%s", collection, id)
	m.collections[collection][id] = doc
	return jsonResponse(http.StatusOK, doc)
}

func (m *mockHTTPClient) handleDelete(collection, id string) (*http.Response, error) {
	if m.collections[collection] == nil {
		return jsonResponse(http.StatusNotFound, map[string]string{"error": "not found"})
	}
	if _, ok := m.collections[collection][id]; !ok {
		return jsonResponse(http.StatusNotFound, map[string]string{"error": "not found"})
	}
	delete(m.collections[collection], id)
	return jsonResponse(http.StatusOK, map[string]string{})
}

func jsonResponse(status int, body any) (*http.Response, error) {
	data, _ := json.Marshal(body)
	return &http.Response{
		StatusCode: status,
		Body:       io.NopCloser(bytes.NewReader(data)),
		Header:     http.Header{"Content-Type": []string{"application/json"}},
	}, nil
}

func testRepos() *mockHTTPClient {
	return newMockHTTPClient()
}

func TestTeamRepo_CRUD(t *testing.T) {
	mock := testRepos()
	client := NewClient(mock, "test", "")
	repos := NewRepositories(client)
	ctx := context.Background()

	// Create
	team := &model.Team{
		Name:      "Test Team",
		OwnerID:   "user-1",
		MemberIDs: []string{"user-1"},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	id, err := repos.Teams.Create(ctx, team)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if id == "" {
		t.Fatal("expected non-empty ID")
	}

	// GetByID
	got, err := repos.Teams.GetByID(ctx, id)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Name != "Test Team" {
		t.Errorf("expected 'Test Team', got %q", got.Name)
	}
	if got.OwnerID != "user-1" {
		t.Errorf("expected owner 'user-1', got %q", got.OwnerID)
	}

	// ListByUser
	teams, err := repos.Teams.ListByUser(ctx, "user-1")
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(teams) != 1 {
		t.Errorf("expected 1 team, got %d", len(teams))
	}

	// Update
	got.Name = "Updated Team"
	if err := repos.Teams.Update(ctx, id, got); err != nil {
		t.Fatalf("update: %v", err)
	}
	got2, _ := repos.Teams.GetByID(ctx, id)
	if got2.Name != "Updated Team" {
		t.Errorf("expected 'Updated Team', got %q", got2.Name)
	}

	// AddMember
	if err := repos.Teams.AddMember(ctx, id, "user-2"); err != nil {
		t.Fatalf("add member: %v", err)
	}
	got3, _ := repos.Teams.GetByID(ctx, id)
	if len(got3.MemberIDs) != 2 {
		t.Errorf("expected 2 members, got %d", len(got3.MemberIDs))
	}

	// RemoveMember
	if err := repos.Teams.RemoveMember(ctx, id, "user-2"); err != nil {
		t.Fatalf("remove member: %v", err)
	}
	got4, _ := repos.Teams.GetByID(ctx, id)
	if len(got4.MemberIDs) != 1 {
		t.Errorf("expected 1 member, got %d", len(got4.MemberIDs))
	}

	// Delete
	if err := repos.Teams.Delete(ctx, id); err != nil {
		t.Fatalf("delete: %v", err)
	}
	_, err = repos.Teams.GetByID(ctx, id)
	if err == nil {
		t.Error("expected error after delete")
	}
}

func TestVehicleRepo_CRUD(t *testing.T) {
	mock := testRepos()
	client := NewClient(mock, "test", "")
	repos := NewRepositories(client)
	ctx := context.Background()

	v := &model.Vehicle{
		TeamID:       "team-1",
		Name:         "Test Car",
		Type:         model.VehicleTypeCar,
		UsageUnit:    model.UsageUnitKM,
		CurrentUsage: 10000,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	id, err := repos.Vehicles.Create(ctx, v)
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	got, _ := repos.Vehicles.GetByID(ctx, id)
	if got.Name != "Test Car" {
		t.Errorf("expected 'Test Car', got %q", got.Name)
	}
	if got.Type != model.VehicleTypeCar {
		t.Errorf("expected type 'car', got %q", got.Type)
	}

	// ListByTeam
	list, _ := repos.Vehicles.ListByTeam(ctx, "team-1")
	if len(list) != 1 {
		t.Errorf("expected 1 vehicle, got %d", len(list))
	}

	// UpdateUsage
	if err := repos.Vehicles.UpdateUsage(ctx, id, 15000); err != nil {
		t.Fatalf("update usage: %v", err)
	}
	got2, _ := repos.Vehicles.GetByID(ctx, id)
	if got2.CurrentUsage != 15000 {
		t.Errorf("expected 15000, got %f", got2.CurrentUsage)
	}

	// Delete
	repos.Vehicles.Delete(ctx, id)
	_, err = repos.Vehicles.GetByID(ctx, id)
	if err == nil {
		t.Error("expected error after delete")
	}
}

func TestMaintenanceRepo_ResetByVehicle(t *testing.T) {
	mock := testRepos()
	client := NewClient(mock, "test", "")
	repos := NewRepositories(client)
	ctx := context.Background()

	usage := 5000.0
	now := time.Now()
	item := &model.MaintenanceItem{
		VehicleID:        "v-1",
		Name:             "Oil Change",
		UsageInterval:    &usage,
		LastServiceUsage: &usage,
		LastServiceDate:  &now,
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	id, _ := repos.Maintenance.Create(ctx, item)

	count, err := repos.Maintenance.ResetByVehicle(ctx, "v-1")
	if err != nil {
		t.Fatalf("reset: %v", err)
	}
	if count != 1 {
		t.Errorf("expected 1 reset, got %d", count)
	}

	got, _ := repos.Maintenance.GetByID(ctx, id)
	if got.LastServiceUsage != nil {
		t.Error("expected nil LastServiceUsage after reset")
	}
	if got.LastServiceDate != nil {
		t.Error("expected nil LastServiceDate after reset")
	}
}

func TestUsageRepo_OptimisticLocking(t *testing.T) {
	mock := testRepos()
	client := NewClient(mock, "test", "")
	repos := NewRepositories(client)
	ctx := context.Background()

	entry := &model.UsageHistory{
		VehicleID: "v-1",
		Usage:     1000,
		Date:      time.Now(),
		CreatedBy: "user-1",
		CreatedAt: time.Now(),
		Version:   1,
	}
	id, _ := repos.UsageHistory.Create(ctx, entry)

	// Update with correct version
	got, _ := repos.UsageHistory.GetByID(ctx, id)
	got.Usage = 2000
	if err := repos.UsageHistory.Update(ctx, id, got, 1); err != nil {
		t.Fatalf("update v1: %v", err)
	}

	// Update with stale version
	got2, _ := repos.UsageHistory.GetByID(ctx, id)
	got2.Usage = 3000
	err := repos.UsageHistory.Update(ctx, id, got2, 1) // stale
	if err == nil {
		t.Error("expected conflict error for stale version")
	}
}

func TestServiceHistoryRepo_DeleteByVehicle(t *testing.T) {
	mock := testRepos()
	client := NewClient(mock, "test", "")
	repos := NewRepositories(client)
	ctx := context.Background()

	for i := 0; i < 3; i++ {
		entry := &model.ServiceHistory{
			VehicleID:   "v-1",
			Type:        model.HistoryTypeService,
			ItemName:    "Oil Change",
			ServiceDate: time.Now(),
			LoggedBy:    "user-1",
			CreatedAt:   time.Now(),
		}
		repos.ServiceHistory.Create(ctx, entry)
	}

	count, err := repos.ServiceHistory.DeleteByVehicle(ctx, "v-1")
	if err != nil {
		t.Fatalf("delete by vehicle: %v", err)
	}
	if count != 3 {
		t.Errorf("expected 3 deleted, got %d", count)
	}

	remaining, _ := repos.ServiceHistory.ListByVehicle(ctx, "v-1")
	if len(remaining) != 0 {
		t.Errorf("expected 0 remaining, got %d", len(remaining))
	}
}
