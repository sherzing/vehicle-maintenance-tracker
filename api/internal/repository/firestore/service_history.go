package firestore

import (
	"context"
	"sort"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

const serviceHistoryCollection = "service_history"

type ServiceHistoryRepo struct {
	client *Client
}

func serviceHistoryToFields(e *model.ServiceHistory) map[string]FieldValue {
	return map[string]FieldValue{
		"vehicle_id":          stringField(e.VehicleID),
		"type":                stringField(string(e.Type)),
		"maintenance_item_id": optionalStringField(e.MaintenanceItemID),
		"item_name":           stringField(e.ItemName),
		"service_usage":       optionalDoubleField(e.ServiceUsage),
		"service_date":        timeField(e.ServiceDate),
		"cost":                optionalDoubleField(e.Cost),
		"provider":            optionalStringField(e.Provider),
		"logged_by":           stringField(e.LoggedBy),
		"created_at":          timeField(e.CreatedAt),
	}
}

func serviceHistoryFromDoc(doc *Document) *model.ServiceHistory {
	f := doc.Fields
	return &model.ServiceHistory{
		ID:                docID(doc.Name),
		VehicleID:         getString(f, "vehicle_id"),
		Type:              model.HistoryEntryType(getString(f, "type")),
		MaintenanceItemID: getOptionalString(f, "maintenance_item_id"),
		ItemName:          getString(f, "item_name"),
		ServiceUsage:      getOptionalFloat64(f, "service_usage"),
		ServiceDate:       getTime(f, "service_date"),
		Cost:              getOptionalFloat64(f, "cost"),
		Provider:          getOptionalString(f, "provider"),
		LoggedBy:          getString(f, "logged_by"),
		CreatedAt:         getTime(f, "created_at"),
	}
}

func (r *ServiceHistoryRepo) Create(ctx context.Context, entry *model.ServiceHistory) (string, error) {
	id, err := r.client.createDoc(ctx, serviceHistoryCollection, serviceHistoryToFields(entry))
	if err != nil {
		return "", err
	}
	entry.ID = id
	return id, nil
}

func (r *ServiceHistoryRepo) GetByID(ctx context.Context, id string) (*model.ServiceHistory, error) {
	doc, err := r.client.getDoc(ctx, serviceHistoryCollection, id)
	if err != nil {
		return nil, err
	}
	if doc == nil {
		return nil, model.ErrNotFound("service history entry")
	}
	return serviceHistoryFromDoc(doc), nil
}

func (r *ServiceHistoryRepo) ListByVehicle(ctx context.Context, vehicleID string) ([]*model.ServiceHistory, error) {
	docs, err := r.client.listDocs(ctx, serviceHistoryCollection)
	if err != nil {
		return nil, err
	}
	var result []*model.ServiceHistory
	for i := range docs {
		e := serviceHistoryFromDoc(&docs[i])
		if e.VehicleID == vehicleID {
			result = append(result, e)
		}
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].ServiceDate.After(result[j].ServiceDate)
	})
	return result, nil
}

func (r *ServiceHistoryRepo) ListByMaintenanceItem(ctx context.Context, itemID string) ([]*model.ServiceHistory, error) {
	docs, err := r.client.listDocs(ctx, serviceHistoryCollection)
	if err != nil {
		return nil, err
	}
	var result []*model.ServiceHistory
	for i := range docs {
		e := serviceHistoryFromDoc(&docs[i])
		if e.MaintenanceItemID != nil && *e.MaintenanceItemID == itemID {
			result = append(result, e)
		}
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].ServiceDate.After(result[j].ServiceDate)
	})
	return result, nil
}

func (r *ServiceHistoryRepo) Update(ctx context.Context, id string, entry *model.ServiceHistory) error {
	return r.client.updateDoc(ctx, serviceHistoryCollection, id, serviceHistoryToFields(entry))
}

func (r *ServiceHistoryRepo) Delete(ctx context.Context, id string) error {
	doc, err := r.client.getDoc(ctx, serviceHistoryCollection, id)
	if err != nil {
		return err
	}
	if doc == nil {
		return model.ErrNotFound("service history entry")
	}
	return r.client.deleteDoc(ctx, serviceHistoryCollection, id)
}

func (r *ServiceHistoryRepo) DeleteByVehicle(ctx context.Context, vehicleID string) (int, error) {
	docs, err := r.client.listDocs(ctx, serviceHistoryCollection)
	if err != nil {
		return 0, err
	}
	count := 0
	for i := range docs {
		e := serviceHistoryFromDoc(&docs[i])
		if e.VehicleID == vehicleID {
			if err := r.client.deleteDoc(ctx, serviceHistoryCollection, e.ID); err != nil {
				return count, err
			}
			count++
		}
	}
	return count, nil
}
