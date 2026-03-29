package model

import "time"

type UsageHistory struct {
	ID        string     `json:"id" bson:"_id,omitempty"`
	VehicleID string     `json:"vehicle_id" bson:"vehicle_id"`
	Usage     float64    `json:"usage" bson:"usage"`
	Date      time.Time  `json:"date" bson:"date"`
	UsageType *string    `json:"usage_type" bson:"usage_type"`
	Location  *string    `json:"location" bson:"location"`
	CreatedBy string     `json:"created_by" bson:"created_by"`
	CreatedAt time.Time  `json:"created_at" bson:"created_at"`
	UpdatedAt *time.Time `json:"updated_at" bson:"updated_at"`
	UpdatedBy *string    `json:"updated_by" bson:"updated_by"`
	Version   int        `json:"version" bson:"version"`
}

type LogUsageRequest struct {
	Usage     float64 `json:"usage"`
	Date      string  `json:"date"` // ISO 8601
	UsageType *string `json:"usage_type,omitempty"`
	Location  *string `json:"location,omitempty"`
}

type UpdateUsageRequest struct {
	Usage           float64 `json:"usage"`
	Date            string  `json:"date"` // ISO 8601
	UsageType       *string `json:"usage_type,omitempty"`
	Location        *string `json:"location,omitempty"`
	ExpectedVersion *int    `json:"expected_version,omitempty"`
}

type UsageConflict struct {
	NewUsage          float64 `json:"new_usage"`
	CurrentUsage      float64 `json:"current_usage"`
	HighestLaterUsage float64 `json:"highest_later_usage"`
}

type LogUsageResponse struct {
	EntryID      string         `json:"entry_id"`
	Conflict     bool           `json:"conflict"`
	ConflictInfo *UsageConflict `json:"conflict_info,omitempty"`
}

type ResolveConflictRequest struct {
	ChosenUsage float64 `json:"chosen_usage"`
}

func (r *LogUsageRequest) Validate() error {
	if r.Usage < 0 {
		return ErrValidation("usage cannot be negative")
	}
	if r.Usage >= 10_000_000 {
		return ErrValidation("usage exceeds maximum allowed value (10,000,000)")
	}
	if r.Date == "" {
		return ErrRequired("date")
	}
	return nil
}
