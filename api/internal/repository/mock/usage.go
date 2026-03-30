package mock

import (
	"context"
	"fmt"
	"sort"
	"sync"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

type UsageHistoryRepo struct {
	mu      sync.RWMutex
	entries map[string]*model.UsageHistory
	seq     int
}

func NewUsageHistoryRepo() *UsageHistoryRepo {
	return &UsageHistoryRepo{entries: make(map[string]*model.UsageHistory)}
}

func (r *UsageHistoryRepo) nextID() string {
	r.seq++
	return fmt.Sprintf("usage-%d", r.seq)
}

func (r *UsageHistoryRepo) Create(ctx context.Context, entry *model.UsageHistory) (string, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	id := r.nextID()
	entry.ID = id
	copy := *entry
	r.entries[id] = &copy
	return id, nil
}

func (r *UsageHistoryRepo) GetByID(ctx context.Context, id string) (*model.UsageHistory, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	entry, ok := r.entries[id]
	if !ok {
		return nil, model.ErrNotFound("usage history entry")
	}
	copy := *entry
	return &copy, nil
}

func (r *UsageHistoryRepo) ListByVehicle(ctx context.Context, vehicleID string) ([]*model.UsageHistory, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []*model.UsageHistory
	for _, entry := range r.entries {
		if entry.VehicleID == vehicleID {
			copy := *entry
			result = append(result, &copy)
		}
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].Date.After(result[j].Date)
	})
	return result, nil
}

func (r *UsageHistoryRepo) Update(ctx context.Context, id string, entry *model.UsageHistory, expectedVersion int) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	existing, ok := r.entries[id]
	if !ok {
		return model.ErrNotFound("usage history entry")
	}
	if existing.Version != expectedVersion {
		return model.ErrConflict("version conflict: this entry was modified by another user")
	}
	entry.Version = expectedVersion + 1
	copy := *entry
	r.entries[id] = &copy
	return nil
}

func (r *UsageHistoryRepo) Delete(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.entries[id]; !ok {
		return model.ErrNotFound("usage history entry")
	}
	delete(r.entries, id)
	return nil
}

func (r *UsageHistoryRepo) DeleteByVehicle(ctx context.Context, vehicleID string) (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	count := 0
	for id, entry := range r.entries {
		if entry.VehicleID == vehicleID {
			delete(r.entries, id)
			count++
		}
	}
	return count, nil
}
