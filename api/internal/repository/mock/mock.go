package mock

import "github.com/sherzing/vehicle-maintenance-tracker/api/internal/repository"

// NewRepositories creates a full set of in-memory mock repositories for testing.
func NewRepositories() *repository.Repositories {
	return &repository.Repositories{
		Teams:          NewTeamRepo(),
		Vehicles:       NewVehicleRepo(),
		Maintenance:    NewMaintenanceRepo(),
		ServiceHistory: NewServiceHistoryRepo(),
		UsageHistory:   NewUsageHistoryRepo(),
	}
}
