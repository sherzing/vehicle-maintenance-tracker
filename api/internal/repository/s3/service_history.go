package s3

import (
	"context"
	"sort"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

const serviceHistoryCollection = "service_history"

type ServiceHistoryRepo struct {
	store *Store
}

func (r *ServiceHistoryRepo) Create(ctx context.Context, entry *model.ServiceHistory) (string, error) {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	entries, err := load[model.ServiceHistory](ctx, r.store, serviceHistoryCollection)
	if err != nil {
		return "", err
	}

	id := r.store.nextID("svc")
	entry.ID = id
	entries = append(entries, *entry)

	if err := save(ctx, r.store, serviceHistoryCollection, entries); err != nil {
		return "", err
	}
	return id, nil
}

func (r *ServiceHistoryRepo) GetByID(ctx context.Context, id string) (*model.ServiceHistory, error) {
	entries, err := load[model.ServiceHistory](ctx, r.store, serviceHistoryCollection)
	if err != nil {
		return nil, err
	}
	for i := range entries {
		if entries[i].ID == id {
			return &entries[i], nil
		}
	}
	return nil, notFound("service history entry")
}

func (r *ServiceHistoryRepo) ListByVehicle(ctx context.Context, vehicleID string) ([]*model.ServiceHistory, error) {
	entries, err := load[model.ServiceHistory](ctx, r.store, serviceHistoryCollection)
	if err != nil {
		return nil, err
	}
	var result []*model.ServiceHistory
	for i := range entries {
		if entries[i].VehicleID == vehicleID {
			e := entries[i]
			result = append(result, &e)
		}
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].ServiceDate.After(result[j].ServiceDate)
	})
	return result, nil
}

func (r *ServiceHistoryRepo) ListByMaintenanceItem(ctx context.Context, itemID string) ([]*model.ServiceHistory, error) {
	entries, err := load[model.ServiceHistory](ctx, r.store, serviceHistoryCollection)
	if err != nil {
		return nil, err
	}
	var result []*model.ServiceHistory
	for i := range entries {
		if entries[i].MaintenanceItemID != nil && *entries[i].MaintenanceItemID == itemID {
			e := entries[i]
			result = append(result, &e)
		}
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].ServiceDate.After(result[j].ServiceDate)
	})
	return result, nil
}

func (r *ServiceHistoryRepo) Update(ctx context.Context, id string, entry *model.ServiceHistory) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	entries, err := load[model.ServiceHistory](ctx, r.store, serviceHistoryCollection)
	if err != nil {
		return err
	}
	for i := range entries {
		if entries[i].ID == id {
			entries[i] = *entry
			return save(ctx, r.store, serviceHistoryCollection, entries)
		}
	}
	return notFound("service history entry")
}

func (r *ServiceHistoryRepo) Delete(ctx context.Context, id string) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	entries, err := load[model.ServiceHistory](ctx, r.store, serviceHistoryCollection)
	if err != nil {
		return err
	}
	for i := range entries {
		if entries[i].ID == id {
			entries = append(entries[:i], entries[i+1:]...)
			return save(ctx, r.store, serviceHistoryCollection, entries)
		}
	}
	return notFound("service history entry")
}

func (r *ServiceHistoryRepo) DeleteByVehicle(ctx context.Context, vehicleID string) (int, error) {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	entries, err := load[model.ServiceHistory](ctx, r.store, serviceHistoryCollection)
	if err != nil {
		return 0, err
	}
	var kept []model.ServiceHistory
	count := 0
	for _, e := range entries {
		if e.VehicleID == vehicleID {
			count++
		} else {
			kept = append(kept, e)
		}
	}
	if count > 0 {
		if err := save(ctx, r.store, serviceHistoryCollection, kept); err != nil {
			return 0, err
		}
	}
	return count, nil
}
