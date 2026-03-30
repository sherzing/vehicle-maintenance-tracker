package mock

import (
	"context"
	"fmt"
	"sort"
	"sync"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

type VehicleRepo struct {
	mu       sync.RWMutex
	vehicles map[string]*model.Vehicle
	seq      int
}

func NewVehicleRepo() *VehicleRepo {
	return &VehicleRepo{vehicles: make(map[string]*model.Vehicle)}
}

func (r *VehicleRepo) nextID() string {
	r.seq++
	return fmt.Sprintf("vehicle-%d", r.seq)
}

func (r *VehicleRepo) Create(ctx context.Context, vehicle *model.Vehicle) (string, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	id := r.nextID()
	vehicle.ID = id
	copy := *vehicle
	r.vehicles[id] = &copy
	return id, nil
}

func (r *VehicleRepo) GetByID(ctx context.Context, id string) (*model.Vehicle, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	v, ok := r.vehicles[id]
	if !ok {
		return nil, model.ErrNotFound("vehicle")
	}
	copy := *v
	return &copy, nil
}

func (r *VehicleRepo) ListByTeam(ctx context.Context, teamID string) ([]*model.Vehicle, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []*model.Vehicle
	for _, v := range r.vehicles {
		if v.TeamID == teamID {
			copy := *v
			result = append(result, &copy)
		}
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].CreatedAt.After(result[j].CreatedAt)
	})
	return result, nil
}

func (r *VehicleRepo) Update(ctx context.Context, id string, vehicle *model.Vehicle) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.vehicles[id]; !ok {
		return model.ErrNotFound("vehicle")
	}
	copy := *vehicle
	r.vehicles[id] = &copy
	return nil
}

func (r *VehicleRepo) UpdateUsage(ctx context.Context, id string, usage float64) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	v, ok := r.vehicles[id]
	if !ok {
		return model.ErrNotFound("vehicle")
	}
	v.CurrentUsage = usage
	return nil
}

func (r *VehicleRepo) Delete(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.vehicles[id]; !ok {
		return model.ErrNotFound("vehicle")
	}
	delete(r.vehicles, id)
	return nil
}
