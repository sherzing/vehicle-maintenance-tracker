package mock

import (
	"context"
	"fmt"
	"sort"
	"sync"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

type MaintenanceRepo struct {
	mu    sync.RWMutex
	items map[string]*model.MaintenanceItem
	seq   int
}

func NewMaintenanceRepo() *MaintenanceRepo {
	return &MaintenanceRepo{items: make(map[string]*model.MaintenanceItem)}
}

func (r *MaintenanceRepo) nextID() string {
	r.seq++
	return fmt.Sprintf("maint-%d", r.seq)
}

func (r *MaintenanceRepo) Create(ctx context.Context, item *model.MaintenanceItem) (string, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	id := r.nextID()
	item.ID = id
	copy := *item
	r.items[id] = &copy
	return id, nil
}

func (r *MaintenanceRepo) GetByID(ctx context.Context, id string) (*model.MaintenanceItem, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	item, ok := r.items[id]
	if !ok {
		return nil, model.ErrNotFound("maintenance item")
	}
	copy := *item
	return &copy, nil
}

func (r *MaintenanceRepo) ListByVehicle(ctx context.Context, vehicleID string) ([]*model.MaintenanceItem, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []*model.MaintenanceItem
	for _, item := range r.items {
		if item.VehicleID == vehicleID {
			copy := *item
			result = append(result, &copy)
		}
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].Name < result[j].Name
	})
	return result, nil
}

func (r *MaintenanceRepo) Update(ctx context.Context, id string, item *model.MaintenanceItem) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.items[id]; !ok {
		return model.ErrNotFound("maintenance item")
	}
	copy := *item
	r.items[id] = &copy
	return nil
}

func (r *MaintenanceRepo) Delete(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.items[id]; !ok {
		return model.ErrNotFound("maintenance item")
	}
	delete(r.items, id)
	return nil
}

func (r *MaintenanceRepo) ResetByVehicle(ctx context.Context, vehicleID string) (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	count := 0
	for _, item := range r.items {
		if item.VehicleID == vehicleID {
			item.LastServiceUsage = nil
			item.LastServiceDate = nil
			count++
		}
	}
	return count, nil
}
