package model

import "time"

type HistoryEntryType string

const (
	HistoryTypeService HistoryEntryType = "service"
	HistoryTypeRepair  HistoryEntryType = "repair"
)

type ServiceHistory struct {
	ID                string           `json:"id" bson:"_id,omitempty"`
	VehicleID         string           `json:"vehicle_id" bson:"vehicle_id"`
	Type              HistoryEntryType `json:"type" bson:"type"`
	MaintenanceItemID *string          `json:"maintenance_item_id" bson:"maintenance_item_id"`
	ItemName          string           `json:"item_name" bson:"item_name"`
	ServiceUsage      *float64         `json:"service_usage" bson:"service_usage"`
	ServiceDate       time.Time        `json:"service_date" bson:"service_date"`
	Cost              *float64         `json:"cost" bson:"cost"`
	Provider          *string          `json:"provider" bson:"provider"`
	LoggedBy          string           `json:"logged_by" bson:"logged_by"`
	CreatedAt         time.Time        `json:"created_at" bson:"created_at"`
}

type LogServiceRequest struct {
	MaintenanceItemID string   `json:"maintenance_item_id"`
	ServiceUsage      float64  `json:"service_usage"`
	ServiceDate       string   `json:"service_date"` // ISO 8601
	Cost              *float64 `json:"cost,omitempty"`
	Provider          *string  `json:"provider,omitempty"`
}

type LogRepairRequest struct {
	Description string   `json:"description"`
	ServiceDate string   `json:"service_date"` // ISO 8601
	Cost        *float64 `json:"cost,omitempty"`
	Provider    *string  `json:"provider,omitempty"`
}

type UpdateServiceHistoryRequest struct {
	ServiceUsage *float64 `json:"service_usage,omitempty"`
	ServiceDate  *string  `json:"service_date,omitempty"`
	Cost         *float64 `json:"cost,omitempty"`
	Provider     *string  `json:"provider,omitempty"`
	Description  *string  `json:"description,omitempty"` // For repairs only
}
