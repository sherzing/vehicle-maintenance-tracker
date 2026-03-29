package model

import "time"

type MaintenanceItem struct {
	ID               string     `json:"id" bson:"_id,omitempty"`
	VehicleID        string     `json:"vehicle_id" bson:"vehicle_id"`
	Name             string     `json:"name" bson:"name"`
	UsageInterval    *float64   `json:"usage_interval" bson:"usage_interval,omitempty"`
	TimeIntervalDays *int       `json:"time_interval_days" bson:"time_interval_days,omitempty"`
	LastServiceUsage *float64   `json:"last_service_usage" bson:"last_service_usage"`
	LastServiceDate  *time.Time `json:"last_service_date" bson:"last_service_date"`
	CreatedAt        time.Time  `json:"created_at" bson:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at" bson:"updated_at"`
}

// MaintenanceStatus is the calculated status for a maintenance item.
type MaintenanceStatus string

const (
	StatusOK       MaintenanceStatus = "ok"
	StatusDueSoon  MaintenanceStatus = "due_soon"
	StatusDue      MaintenanceStatus = "due"
	StatusOverdue  MaintenanceStatus = "overdue"
)

// MaintenanceItemWithStatus wraps an item with its calculated status.
type MaintenanceItemWithStatus struct {
	MaintenanceItem
	Status        MaintenanceStatus `json:"status"`
	Percentage    float64           `json:"percentage"`
	PrimaryReason string            `json:"primary_reason,omitempty"`
	UsageRemaining *float64         `json:"usage_remaining,omitempty"`
	DaysRemaining  *float64         `json:"days_remaining,omitempty"`
}

type CreateMaintenanceItemRequest struct {
	Name             string   `json:"name"`
	UsageInterval    *float64 `json:"usage_interval,omitempty"`
	TimeIntervalDays *int     `json:"time_interval_days,omitempty"`
	LastServiceUsage *float64 `json:"last_service_usage,omitempty"`
	LastServiceDate  *string  `json:"last_service_date,omitempty"` // ISO 8601
}

type UpdateMaintenanceItemRequest struct {
	Name             *string  `json:"name,omitempty"`
	UsageInterval    *float64 `json:"usage_interval,omitempty"`
	TimeIntervalDays *int     `json:"time_interval_days,omitempty"`
	LastServiceUsage *float64 `json:"last_service_usage,omitempty"`
	LastServiceDate  *string  `json:"last_service_date,omitempty"`
}

func (r *CreateMaintenanceItemRequest) Validate() error {
	if r.Name == "" {
		return ErrRequired("name")
	}
	if r.UsageInterval == nil && r.TimeIntervalDays == nil {
		return ErrValidation("at least one interval (usage_interval or time_interval_days) is required")
	}
	return nil
}
