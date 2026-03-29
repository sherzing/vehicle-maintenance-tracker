package model

import "time"

type VehicleType string

const (
	VehicleTypeCar        VehicleType = "car"
	VehicleTypeMotorcycle VehicleType = "motorcycle"
	VehicleTypeBicycle    VehicleType = "bicycle"
	VehicleTypeOther      VehicleType = "other"
)

type UsageUnit string

const (
	UsageUnitKM    UsageUnit = "km"
	UsageUnitHours UsageUnit = "hours"
)

type Vehicle struct {
	ID           string      `json:"id" bson:"_id,omitempty"`
	TeamID       string      `json:"team_id" bson:"team_id"`
	Name         string      `json:"name" bson:"name"`
	Type         VehicleType `json:"type" bson:"type"`
	UsageUnit    UsageUnit   `json:"usage_unit" bson:"usage_unit"`
	CurrentUsage float64     `json:"current_usage" bson:"current_usage"`
	Make         string      `json:"make,omitempty" bson:"make,omitempty"`
	Model        string      `json:"model,omitempty" bson:"model,omitempty"`
	Year         int         `json:"year,omitempty" bson:"year,omitempty"`
	VIN          string      `json:"vin,omitempty" bson:"vin,omitempty"`
	RaceNumber   string      `json:"race_number,omitempty" bson:"race_number,omitempty"`
	Nickname     string      `json:"nickname,omitempty" bson:"nickname,omitempty"`
	CreatedAt    time.Time   `json:"created_at" bson:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at" bson:"updated_at"`
}

type CreateVehicleRequest struct {
	Name         string      `json:"name"`
	Type         VehicleType `json:"type"`
	UsageUnit    UsageUnit   `json:"usage_unit"`
	CurrentUsage float64     `json:"current_usage"`
	Make         string      `json:"make,omitempty"`
	Model        string      `json:"model,omitempty"`
	Year         int         `json:"year,omitempty"`
	VIN          string      `json:"vin,omitempty"`
	RaceNumber   string      `json:"race_number,omitempty"`
	Nickname     string      `json:"nickname,omitempty"`
}

type UpdateVehicleRequest struct {
	Name         *string      `json:"name,omitempty"`
	Type         *VehicleType `json:"type,omitempty"`
	UsageUnit    *UsageUnit   `json:"usage_unit,omitempty"`
	CurrentUsage *float64     `json:"current_usage,omitempty"`
	Make         *string      `json:"make,omitempty"`
	Model        *string      `json:"model,omitempty"`
	Year         *int         `json:"year,omitempty"`
	VIN          *string      `json:"vin,omitempty"`
	RaceNumber   *string      `json:"race_number,omitempty"`
	Nickname     *string      `json:"nickname,omitempty"`
}

// Validate checks vehicle business rules.
func (r *CreateVehicleRequest) Validate() error {
	if r.Name == "" {
		return ErrRequired("name")
	}
	if r.Type == "" {
		r.Type = VehicleTypeCar
	}
	if r.UsageUnit == "" {
		r.UsageUnit = UsageUnitKM
	}
	// Cars must use km
	if r.Type == VehicleTypeCar && r.UsageUnit != UsageUnitKM {
		return ErrValidation("cars must use km as usage unit")
	}
	return nil
}
