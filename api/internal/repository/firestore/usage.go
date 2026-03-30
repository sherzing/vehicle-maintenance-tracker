package firestore

import (
	"context"
	"sort"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

const usageCollection = "usage_history"

type UsageHistoryRepo struct {
	client *Client
}

func usageToFields(e *model.UsageHistory) map[string]FieldValue {
	return map[string]FieldValue{
		"vehicle_id": stringField(e.VehicleID),
		"usage":      doubleField(e.Usage),
		"date":       timeField(e.Date),
		"usage_type": optionalStringField(e.UsageType),
		"location":   optionalStringField(e.Location),
		"created_by": stringField(e.CreatedBy),
		"created_at": timeField(e.CreatedAt),
		"updated_at": optionalTimeField(e.UpdatedAt),
		"updated_by": optionalStringField(e.UpdatedBy),
		"version":    intField(e.Version),
	}
}

func usageFromDoc(doc *Document) *model.UsageHistory {
	f := doc.Fields
	return &model.UsageHistory{
		ID:        docID(doc.Name),
		VehicleID: getString(f, "vehicle_id"),
		Usage:     getFloat64(f, "usage"),
		Date:      getTime(f, "date"),
		UsageType: getOptionalString(f, "usage_type"),
		Location:  getOptionalString(f, "location"),
		CreatedBy: getString(f, "created_by"),
		CreatedAt: getTime(f, "created_at"),
		UpdatedAt: getOptionalTime(f, "updated_at"),
		UpdatedBy: getOptionalString(f, "updated_by"),
		Version:   getInt(f, "version"),
	}
}

func (r *UsageHistoryRepo) Create(ctx context.Context, entry *model.UsageHistory) (string, error) {
	id, err := r.client.createDoc(ctx, usageCollection, usageToFields(entry))
	if err != nil {
		return "", err
	}
	entry.ID = id
	return id, nil
}

func (r *UsageHistoryRepo) GetByID(ctx context.Context, id string) (*model.UsageHistory, error) {
	doc, err := r.client.getDoc(ctx, usageCollection, id)
	if err != nil {
		return nil, err
	}
	if doc == nil {
		return nil, model.ErrNotFound("usage history entry")
	}
	return usageFromDoc(doc), nil
}

func (r *UsageHistoryRepo) ListByVehicle(ctx context.Context, vehicleID string) ([]*model.UsageHistory, error) {
	docs, err := r.client.listDocs(ctx, usageCollection)
	if err != nil {
		return nil, err
	}
	var result []*model.UsageHistory
	for i := range docs {
		e := usageFromDoc(&docs[i])
		if e.VehicleID == vehicleID {
			result = append(result, e)
		}
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].Date.After(result[j].Date)
	})
	return result, nil
}

func (r *UsageHistoryRepo) Update(ctx context.Context, id string, entry *model.UsageHistory, expectedVersion int) error {
	// Fetch current to check version (optimistic locking)
	current, err := r.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if current.Version != expectedVersion {
		return model.ErrConflict("version conflict: this entry was modified by another user")
	}
	entry.Version = expectedVersion + 1
	return r.client.updateDoc(ctx, usageCollection, id, usageToFields(entry))
}

func (r *UsageHistoryRepo) Delete(ctx context.Context, id string) error {
	doc, err := r.client.getDoc(ctx, usageCollection, id)
	if err != nil {
		return err
	}
	if doc == nil {
		return model.ErrNotFound("usage history entry")
	}
	return r.client.deleteDoc(ctx, usageCollection, id)
}

func (r *UsageHistoryRepo) DeleteByVehicle(ctx context.Context, vehicleID string) (int, error) {
	docs, err := r.client.listDocs(ctx, usageCollection)
	if err != nil {
		return 0, err
	}
	count := 0
	for i := range docs {
		e := usageFromDoc(&docs[i])
		if e.VehicleID == vehicleID {
			if err := r.client.deleteDoc(ctx, usageCollection, e.ID); err != nil {
				return count, err
			}
			count++
		}
	}
	return count, nil
}
