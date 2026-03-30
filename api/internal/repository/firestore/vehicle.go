package firestore

import (
	"context"
	"sort"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

const vehiclesCollection = "vehicles"

type VehicleRepo struct {
	client *Client
}

func vehicleToFields(v *model.Vehicle) map[string]FieldValue {
	return map[string]FieldValue{
		"team_id":       stringField(v.TeamID),
		"name":          stringField(v.Name),
		"type":          stringField(string(v.Type)),
		"usage_unit":    stringField(string(v.UsageUnit)),
		"current_usage": doubleField(v.CurrentUsage),
		"make":          stringField(v.Make),
		"model":         stringField(v.Model),
		"year":          intField(v.Year),
		"vin":           stringField(v.VIN),
		"race_number":   stringField(v.RaceNumber),
		"nickname":      stringField(v.Nickname),
		"created_at":    timeField(v.CreatedAt),
		"updated_at":    timeField(v.UpdatedAt),
	}
}

func vehicleFromDoc(doc *Document) *model.Vehicle {
	f := doc.Fields
	return &model.Vehicle{
		ID:           docID(doc.Name),
		TeamID:       getString(f, "team_id"),
		Name:         getString(f, "name"),
		Type:         model.VehicleType(getString(f, "type")),
		UsageUnit:    model.UsageUnit(getString(f, "usage_unit")),
		CurrentUsage: getFloat64(f, "current_usage"),
		Make:         getString(f, "make"),
		Model:        getString(f, "model"),
		Year:         getInt(f, "year"),
		VIN:          getString(f, "vin"),
		RaceNumber:   getString(f, "race_number"),
		Nickname:     getString(f, "nickname"),
		CreatedAt:    getTime(f, "created_at"),
		UpdatedAt:    getTime(f, "updated_at"),
	}
}

func (r *VehicleRepo) Create(ctx context.Context, vehicle *model.Vehicle) (string, error) {
	id, err := r.client.createDoc(ctx, vehiclesCollection, vehicleToFields(vehicle))
	if err != nil {
		return "", err
	}
	vehicle.ID = id
	return id, nil
}

func (r *VehicleRepo) GetByID(ctx context.Context, id string) (*model.Vehicle, error) {
	doc, err := r.client.getDoc(ctx, vehiclesCollection, id)
	if err != nil {
		return nil, err
	}
	if doc == nil {
		return nil, model.ErrNotFound("vehicle")
	}
	return vehicleFromDoc(doc), nil
}

func (r *VehicleRepo) ListByTeam(ctx context.Context, teamID string) ([]*model.Vehicle, error) {
	docs, err := r.client.listDocs(ctx, vehiclesCollection)
	if err != nil {
		return nil, err
	}
	var result []*model.Vehicle
	for i := range docs {
		v := vehicleFromDoc(&docs[i])
		if v.TeamID == teamID {
			result = append(result, v)
		}
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].CreatedAt.After(result[j].CreatedAt)
	})
	return result, nil
}

func (r *VehicleRepo) Update(ctx context.Context, id string, vehicle *model.Vehicle) error {
	return r.client.updateDoc(ctx, vehiclesCollection, id, vehicleToFields(vehicle))
}

func (r *VehicleRepo) UpdateUsage(ctx context.Context, id string, usage float64) error {
	vehicle, err := r.GetByID(ctx, id)
	if err != nil {
		return err
	}
	vehicle.CurrentUsage = usage
	return r.client.updateDoc(ctx, vehiclesCollection, id, vehicleToFields(vehicle))
}

func (r *VehicleRepo) Delete(ctx context.Context, id string) error {
	doc, err := r.client.getDoc(ctx, vehiclesCollection, id)
	if err != nil {
		return err
	}
	if doc == nil {
		return model.ErrNotFound("vehicle")
	}
	return r.client.deleteDoc(ctx, vehiclesCollection, id)
}
