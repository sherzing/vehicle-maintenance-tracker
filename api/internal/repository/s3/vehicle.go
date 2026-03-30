package s3

import (
	"context"
	"sort"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

const vehiclesCollection = "vehicles"

type VehicleRepo struct {
	store *Store
}

func (r *VehicleRepo) Create(ctx context.Context, vehicle *model.Vehicle) (string, error) {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	vehicles, err := load[model.Vehicle](ctx, r.store, vehiclesCollection)
	if err != nil {
		return "", err
	}

	id := r.store.nextID("veh")
	vehicle.ID = id
	vehicles = append(vehicles, *vehicle)

	if err := save(ctx, r.store, vehiclesCollection, vehicles); err != nil {
		return "", err
	}
	return id, nil
}

func (r *VehicleRepo) GetByID(ctx context.Context, id string) (*model.Vehicle, error) {
	vehicles, err := load[model.Vehicle](ctx, r.store, vehiclesCollection)
	if err != nil {
		return nil, err
	}
	for i := range vehicles {
		if vehicles[i].ID == id {
			return &vehicles[i], nil
		}
	}
	return nil, notFound("vehicle")
}

func (r *VehicleRepo) ListByTeam(ctx context.Context, teamID string) ([]*model.Vehicle, error) {
	vehicles, err := load[model.Vehicle](ctx, r.store, vehiclesCollection)
	if err != nil {
		return nil, err
	}
	var result []*model.Vehicle
	for i := range vehicles {
		if vehicles[i].TeamID == teamID {
			v := vehicles[i]
			result = append(result, &v)
		}
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].CreatedAt.After(result[j].CreatedAt)
	})
	return result, nil
}

func (r *VehicleRepo) Update(ctx context.Context, id string, vehicle *model.Vehicle) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	vehicles, err := load[model.Vehicle](ctx, r.store, vehiclesCollection)
	if err != nil {
		return err
	}
	for i := range vehicles {
		if vehicles[i].ID == id {
			vehicles[i] = *vehicle
			return save(ctx, r.store, vehiclesCollection, vehicles)
		}
	}
	return notFound("vehicle")
}

func (r *VehicleRepo) UpdateUsage(ctx context.Context, id string, usage float64) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	vehicles, err := load[model.Vehicle](ctx, r.store, vehiclesCollection)
	if err != nil {
		return err
	}
	for i := range vehicles {
		if vehicles[i].ID == id {
			vehicles[i].CurrentUsage = usage
			return save(ctx, r.store, vehiclesCollection, vehicles)
		}
	}
	return notFound("vehicle")
}

func (r *VehicleRepo) Delete(ctx context.Context, id string) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	vehicles, err := load[model.Vehicle](ctx, r.store, vehiclesCollection)
	if err != nil {
		return err
	}
	for i := range vehicles {
		if vehicles[i].ID == id {
			vehicles = append(vehicles[:i], vehicles[i+1:]...)
			return save(ctx, r.store, vehiclesCollection, vehicles)
		}
	}
	return notFound("vehicle")
}
