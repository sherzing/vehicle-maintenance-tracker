package firestore

import (
	"context"
	"sort"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

const maintenanceCollection = "maintenance_items"

type MaintenanceRepo struct {
	client *Client
}

func maintenanceToFields(item *model.MaintenanceItem) map[string]FieldValue {
	return map[string]FieldValue{
		"vehicle_id":         stringField(item.VehicleID),
		"name":               stringField(item.Name),
		"usage_interval":     optionalDoubleField(item.UsageInterval),
		"time_interval_days": optionalIntField(item.TimeIntervalDays),
		"last_service_usage": optionalDoubleField(item.LastServiceUsage),
		"last_service_date":  optionalTimeField(item.LastServiceDate),
		"created_at":         timeField(item.CreatedAt),
		"updated_at":         timeField(item.UpdatedAt),
	}
}

func maintenanceFromDoc(doc *Document) *model.MaintenanceItem {
	f := doc.Fields
	return &model.MaintenanceItem{
		ID:               docID(doc.Name),
		VehicleID:        getString(f, "vehicle_id"),
		Name:             getString(f, "name"),
		UsageInterval:    getOptionalFloat64(f, "usage_interval"),
		TimeIntervalDays: getOptionalInt(f, "time_interval_days"),
		LastServiceUsage: getOptionalFloat64(f, "last_service_usage"),
		LastServiceDate:  getOptionalTime(f, "last_service_date"),
		CreatedAt:        getTime(f, "created_at"),
		UpdatedAt:        getTime(f, "updated_at"),
	}
}

func (r *MaintenanceRepo) Create(ctx context.Context, item *model.MaintenanceItem) (string, error) {
	id, err := r.client.createDoc(ctx, maintenanceCollection, maintenanceToFields(item))
	if err != nil {
		return "", err
	}
	item.ID = id
	return id, nil
}

func (r *MaintenanceRepo) GetByID(ctx context.Context, id string) (*model.MaintenanceItem, error) {
	doc, err := r.client.getDoc(ctx, maintenanceCollection, id)
	if err != nil {
		return nil, err
	}
	if doc == nil {
		return nil, model.ErrNotFound("maintenance item")
	}
	return maintenanceFromDoc(doc), nil
}

func (r *MaintenanceRepo) ListByVehicle(ctx context.Context, vehicleID string) ([]*model.MaintenanceItem, error) {
	docs, err := r.client.listDocs(ctx, maintenanceCollection)
	if err != nil {
		return nil, err
	}
	var result []*model.MaintenanceItem
	for i := range docs {
		item := maintenanceFromDoc(&docs[i])
		if item.VehicleID == vehicleID {
			result = append(result, item)
		}
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].Name < result[j].Name
	})
	return result, nil
}

func (r *MaintenanceRepo) Update(ctx context.Context, id string, item *model.MaintenanceItem) error {
	return r.client.updateDoc(ctx, maintenanceCollection, id, maintenanceToFields(item))
}

func (r *MaintenanceRepo) Delete(ctx context.Context, id string) error {
	doc, err := r.client.getDoc(ctx, maintenanceCollection, id)
	if err != nil {
		return err
	}
	if doc == nil {
		return model.ErrNotFound("maintenance item")
	}
	return r.client.deleteDoc(ctx, maintenanceCollection, id)
}

func (r *MaintenanceRepo) ResetByVehicle(ctx context.Context, vehicleID string) (int, error) {
	docs, err := r.client.listDocs(ctx, maintenanceCollection)
	if err != nil {
		return 0, err
	}
	count := 0
	for i := range docs {
		item := maintenanceFromDoc(&docs[i])
		if item.VehicleID == vehicleID {
			item.LastServiceUsage = nil
			item.LastServiceDate = nil
			if err := r.client.updateDoc(ctx, maintenanceCollection, item.ID, maintenanceToFields(item)); err != nil {
				return count, err
			}
			count++
		}
	}
	return count, nil
}
