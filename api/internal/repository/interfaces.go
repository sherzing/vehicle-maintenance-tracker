package repository

import (
	"context"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

// TeamRepository defines data operations for teams.
type TeamRepository interface {
	Create(ctx context.Context, team *model.Team) (string, error)
	GetByID(ctx context.Context, id string) (*model.Team, error)
	ListByUser(ctx context.Context, userID string) ([]*model.Team, error)
	Update(ctx context.Context, id string, team *model.Team) error
	Delete(ctx context.Context, id string) error
	AddMember(ctx context.Context, teamID, userID string) error
	RemoveMember(ctx context.Context, teamID, userID string) error
}

// VehicleRepository defines data operations for vehicles.
type VehicleRepository interface {
	Create(ctx context.Context, vehicle *model.Vehicle) (string, error)
	GetByID(ctx context.Context, id string) (*model.Vehicle, error)
	ListByTeam(ctx context.Context, teamID string) ([]*model.Vehicle, error)
	Update(ctx context.Context, id string, vehicle *model.Vehicle) error
	UpdateUsage(ctx context.Context, id string, usage float64) error
	Delete(ctx context.Context, id string) error
}

// MaintenanceItemRepository defines data operations for maintenance items.
type MaintenanceItemRepository interface {
	Create(ctx context.Context, item *model.MaintenanceItem) (string, error)
	GetByID(ctx context.Context, id string) (*model.MaintenanceItem, error)
	ListByVehicle(ctx context.Context, vehicleID string) ([]*model.MaintenanceItem, error)
	Update(ctx context.Context, id string, item *model.MaintenanceItem) error
	Delete(ctx context.Context, id string) error
	ResetByVehicle(ctx context.Context, vehicleID string) (int, error)
}

// ServiceHistoryRepository defines data operations for service and repair logs.
type ServiceHistoryRepository interface {
	Create(ctx context.Context, entry *model.ServiceHistory) (string, error)
	GetByID(ctx context.Context, id string) (*model.ServiceHistory, error)
	ListByVehicle(ctx context.Context, vehicleID string) ([]*model.ServiceHistory, error)
	ListByMaintenanceItem(ctx context.Context, itemID string) ([]*model.ServiceHistory, error)
	Update(ctx context.Context, id string, entry *model.ServiceHistory) error
	Delete(ctx context.Context, id string) error
	DeleteByVehicle(ctx context.Context, vehicleID string) (int, error)
}

// UsageHistoryRepository defines data operations for usage readings.
type UsageHistoryRepository interface {
	Create(ctx context.Context, entry *model.UsageHistory) (string, error)
	GetByID(ctx context.Context, id string) (*model.UsageHistory, error)
	ListByVehicle(ctx context.Context, vehicleID string) ([]*model.UsageHistory, error)
	Update(ctx context.Context, id string, entry *model.UsageHistory, expectedVersion int) error
	Delete(ctx context.Context, id string) error
	DeleteByVehicle(ctx context.Context, vehicleID string) (int, error)
}

// Repositories groups all repository interfaces for dependency injection.
type Repositories struct {
	Teams          TeamRepository
	Vehicles       VehicleRepository
	Maintenance    MaintenanceItemRepository
	ServiceHistory ServiceHistoryRepository
	UsageHistory   UsageHistoryRepository
}
