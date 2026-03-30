package firestore

import (
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/repository"
)

// NewRepositories creates all Firestore-backed repository implementations.
func NewRepositories(client *Client) *repository.Repositories {
	return &repository.Repositories{
		Teams:          &TeamRepo{client: client},
		Vehicles:       &VehicleRepo{client: client},
		Maintenance:    &MaintenanceRepo{client: client},
		ServiceHistory: &ServiceHistoryRepo{client: client},
		UsageHistory:   &UsageHistoryRepo{client: client},
	}
}
