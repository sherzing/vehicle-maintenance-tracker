package s3

import (
	"context"
	"sort"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

const usageCollection = "usage_history"

type UsageHistoryRepo struct {
	store *Store
}

func (r *UsageHistoryRepo) Create(ctx context.Context, entry *model.UsageHistory) (string, error) {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	entries, err := load[model.UsageHistory](ctx, r.store, usageCollection)
	if err != nil {
		return "", err
	}

	id := r.store.nextID("usage")
	entry.ID = id
	entries = append(entries, *entry)

	if err := save(ctx, r.store, usageCollection, entries); err != nil {
		return "", err
	}
	return id, nil
}

func (r *UsageHistoryRepo) GetByID(ctx context.Context, id string) (*model.UsageHistory, error) {
	entries, err := load[model.UsageHistory](ctx, r.store, usageCollection)
	if err != nil {
		return nil, err
	}
	for i := range entries {
		if entries[i].ID == id {
			return &entries[i], nil
		}
	}
	return nil, notFound("usage history entry")
}

func (r *UsageHistoryRepo) ListByVehicle(ctx context.Context, vehicleID string) ([]*model.UsageHistory, error) {
	entries, err := load[model.UsageHistory](ctx, r.store, usageCollection)
	if err != nil {
		return nil, err
	}
	var result []*model.UsageHistory
	for i := range entries {
		if entries[i].VehicleID == vehicleID {
			e := entries[i]
			result = append(result, &e)
		}
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].Date.After(result[j].Date)
	})
	return result, nil
}

func (r *UsageHistoryRepo) Update(ctx context.Context, id string, entry *model.UsageHistory, expectedVersion int) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	entries, err := load[model.UsageHistory](ctx, r.store, usageCollection)
	if err != nil {
		return err
	}
	for i := range entries {
		if entries[i].ID == id {
			if entries[i].Version != expectedVersion {
				return model.ErrConflict("version conflict: this entry was modified by another user")
			}
			entry.Version = expectedVersion + 1
			entries[i] = *entry
			return save(ctx, r.store, usageCollection, entries)
		}
	}
	return notFound("usage history entry")
}

func (r *UsageHistoryRepo) Delete(ctx context.Context, id string) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	entries, err := load[model.UsageHistory](ctx, r.store, usageCollection)
	if err != nil {
		return err
	}
	for i := range entries {
		if entries[i].ID == id {
			entries = append(entries[:i], entries[i+1:]...)
			return save(ctx, r.store, usageCollection, entries)
		}
	}
	return notFound("usage history entry")
}

func (r *UsageHistoryRepo) DeleteByVehicle(ctx context.Context, vehicleID string) (int, error) {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	entries, err := load[model.UsageHistory](ctx, r.store, usageCollection)
	if err != nil {
		return 0, err
	}
	var kept []model.UsageHistory
	count := 0
	for _, e := range entries {
		if e.VehicleID == vehicleID {
			count++
		} else {
			kept = append(kept, e)
		}
	}
	if count > 0 {
		if err := save(ctx, r.store, usageCollection, kept); err != nil {
			return 0, err
		}
	}
	return count, nil
}
