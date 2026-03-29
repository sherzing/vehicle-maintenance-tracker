package mongo

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/repository"
)

// NewRepositories creates all MongoDB repository implementations and returns them.
func NewRepositories(ctx context.Context, uri string) (*repository.Repositories, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return nil, fmt.Errorf("connecting to mongodb: %w", err)
	}

	if err := client.Ping(ctx, nil); err != nil {
		return nil, fmt.Errorf("pinging mongodb: %w", err)
	}

	db := client.Database("vmt")

	return &repository.Repositories{
		Teams:          &TeamRepo{col: db.Collection("teams")},
		Vehicles:       &VehicleRepo{col: db.Collection("vehicles")},
		Maintenance:    &MaintenanceRepo{col: db.Collection("maintenance_items")},
		ServiceHistory: &ServiceHistoryRepo{col: db.Collection("service_history")},
		UsageHistory:   &UsageHistoryRepo{col: db.Collection("usage_history")},
	}, nil
}
