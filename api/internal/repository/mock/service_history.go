package mock

import (
	"context"
	"fmt"
	"sort"
	"sync"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

type ServiceHistoryRepo struct {
	mu      sync.RWMutex
	entries map[string]*model.ServiceHistory
	seq     int
}

func NewServiceHistoryRepo() *ServiceHistoryRepo {
	return &ServiceHistoryRepo{entries: make(map[string]*model.ServiceHistory)}
}

func (r *ServiceHistoryRepo) nextID() string {
	r.seq++
	return fmt.Sprintf("svc-%d", r.seq)
}

func (r *ServiceHistoryRepo) Create(ctx context.Context, entry *model.ServiceHistory) (string, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	id := r.nextID()
	entry.ID = id
	copy := *entry
	r.entries[id] = &copy
	return id, nil
}

func (r *ServiceHistoryRepo) GetByID(ctx context.Context, id string) (*model.ServiceHistory, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	entry, ok := r.entries[id]
	if !ok {
		return nil, model.ErrNotFound("service history entry")
	}
	copy := *entry
	return &copy, nil
}

func (r *ServiceHistoryRepo) ListByVehicle(ctx context.Context, vehicleID string) ([]*model.ServiceHistory, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []*model.ServiceHistory
	for _, entry := range r.entries {
		if entry.VehicleID == vehicleID {
			copy := *entry
			result = append(result, &copy)
		}
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].ServiceDate.After(result[j].ServiceDate)
	})
	return result, nil
}

func (r *ServiceHistoryRepo) ListByMaintenanceItem(ctx context.Context, itemID string) ([]*model.ServiceHistory, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []*model.ServiceHistory
	for _, entry := range r.entries {
		if entry.MaintenanceItemID != nil && *entry.MaintenanceItemID == itemID {
			copy := *entry
			result = append(result, &copy)
		}
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].ServiceDate.After(result[j].ServiceDate)
	})
	return result, nil
}

func (r *ServiceHistoryRepo) Update(ctx context.Context, id string, entry *model.ServiceHistory) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.entries[id]; !ok {
		return model.ErrNotFound("service history entry")
	}
	copy := *entry
	r.entries[id] = &copy
	return nil
}

func (r *ServiceHistoryRepo) Delete(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.entries[id]; !ok {
		return model.ErrNotFound("service history entry")
	}
	delete(r.entries, id)
	return nil
}

func (r *ServiceHistoryRepo) DeleteByVehicle(ctx context.Context, vehicleID string) (int, error) {
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
