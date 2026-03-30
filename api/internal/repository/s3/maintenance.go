package s3

import (
	"context"
	"sort"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

const maintenanceCollection = "maintenance"

type MaintenanceRepo struct {
	store *Store
}

func (r *MaintenanceRepo) Create(ctx context.Context, item *model.MaintenanceItem) (string, error) {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	items, err := load[model.MaintenanceItem](ctx, r.store, maintenanceCollection)
	if err != nil {
		return "", err
	}

	id := r.store.nextID("maint")
	item.ID = id
	items = append(items, *item)

	if err := save(ctx, r.store, maintenanceCollection, items); err != nil {
		return "", err
	}
	return id, nil
}

func (r *MaintenanceRepo) GetByID(ctx context.Context, id string) (*model.MaintenanceItem, error) {
	items, err := load[model.MaintenanceItem](ctx, r.store, maintenanceCollection)
	if err != nil {
		return nil, err
	}
	for i := range items {
		if items[i].ID == id {
			return &items[i], nil
		}
	}
	return nil, notFound("maintenance item")
}

func (r *MaintenanceRepo) ListByVehicle(ctx context.Context, vehicleID string) ([]*model.MaintenanceItem, error) {
	items, err := load[model.MaintenanceItem](ctx, r.store, maintenanceCollection)
	if err != nil {
		return nil, err
	}
	var result []*model.MaintenanceItem
	for i := range items {
		if items[i].VehicleID == vehicleID {
			item := items[i]
			result = append(result, &item)
		}
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].Name < result[j].Name
	})
	return result, nil
}

func (r *MaintenanceRepo) Update(ctx context.Context, id string, item *model.MaintenanceItem) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	items, err := load[model.MaintenanceItem](ctx, r.store, maintenanceCollection)
	if err != nil {
		return err
	}
	for i := range items {
		if items[i].ID == id {
			items[i] = *item
			return save(ctx, r.store, maintenanceCollection, items)
		}
	}
	return notFound("maintenance item")
}

func (r *MaintenanceRepo) Delete(ctx context.Context, id string) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	items, err := load[model.MaintenanceItem](ctx, r.store, maintenanceCollection)
	if err != nil {
		return err
	}
	for i := range items {
		if items[i].ID == id {
			items = append(items[:i], items[i+1:]...)
			return save(ctx, r.store, maintenanceCollection, items)
		}
	}
	return notFound("maintenance item")
}

func (r *MaintenanceRepo) ResetByVehicle(ctx context.Context, vehicleID string) (int, error) {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	items, err := load[model.MaintenanceItem](ctx, r.store, maintenanceCollection)
	if err != nil {
		return 0, err
	}
	count := 0
	for i := range items {
		if items[i].VehicleID == vehicleID {
			items[i].LastServiceUsage = nil
			items[i].LastServiceDate = nil
			count++
		}
	}
	if count > 0 {
		if err := save(ctx, r.store, maintenanceCollection, items); err != nil {
			return 0, err
		}
	}
	return count, nil
}
