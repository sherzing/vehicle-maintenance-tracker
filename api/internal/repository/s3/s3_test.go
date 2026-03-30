package s3

import (
	"bytes"
	"context"
	"io"
	"sync"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

// mockS3 is an in-memory fake S3 that stores objects as byte slices.
type mockS3 struct {
	mu      sync.Mutex
	objects map[string][]byte
}

func newMockS3() *mockS3 {
	return &mockS3{objects: make(map[string][]byte)}
}

func (m *mockS3) GetObject(_ context.Context, input *s3.GetObjectInput, _ ...func(*s3.Options)) (*s3.GetObjectOutput, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := *input.Key
	data, ok := m.objects[key]
	if !ok {
		return nil, &types.NoSuchKey{}
	}
	return &s3.GetObjectOutput{
		Body: io.NopCloser(bytes.NewReader(data)),
	}, nil
}

func (m *mockS3) PutObject(_ context.Context, input *s3.PutObjectInput, _ ...func(*s3.Options)) (*s3.PutObjectOutput, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	data, _ := io.ReadAll(input.Body)
	m.objects[*input.Key] = data
	return &s3.PutObjectOutput{}, nil
}

func TestTeamRepo_CRUD(t *testing.T) {
	client := newMockS3()
	repos := NewRepositories(client, "test-bucket", "test/")
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
		t.Errorf("expected 1 member after remove, got %d", len(got4.MemberIDs))
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
	client := newMockS3()
	repos := NewRepositories(client, "test-bucket", "test/")
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
	if err := repos.Vehicles.Delete(ctx, id); err != nil {
		t.Fatalf("delete: %v", err)
	}
	_, err = repos.Vehicles.GetByID(ctx, id)
	if err == nil {
		t.Error("expected error after delete")
	}
}

func TestUsageRepo_OptimisticLocking(t *testing.T) {
	client := newMockS3()
	repos := NewRepositories(client, "test-bucket", "test/")
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

	// Update with stale version → conflict
	got2, _ := repos.UsageHistory.GetByID(ctx, id)
	got2.Usage = 3000
	err := repos.UsageHistory.Update(ctx, id, got2, 1) // stale: should be 2 now
	if err == nil {
		t.Error("expected conflict error for stale version")
	}
}

func TestMaintenanceRepo_ResetByVehicle(t *testing.T) {
	client := newMockS3()
	repos := NewRepositories(client, "test-bucket", "test/")
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

func TestServiceHistoryRepo_DeleteByVehicle(t *testing.T) {
	client := newMockS3()
	repos := NewRepositories(client, "test-bucket", "test/")
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
