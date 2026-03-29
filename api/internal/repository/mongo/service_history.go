package mongo

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

type ServiceHistoryRepo struct {
	col *mongo.Collection
}

func (r *ServiceHistoryRepo) Create(ctx context.Context, entry *model.ServiceHistory) (string, error) {
	result, err := r.col.InsertOne(ctx, entry)
	if err != nil {
		return "", err
	}
	return result.InsertedID.(primitive.ObjectID).Hex(), nil
}

func (r *ServiceHistoryRepo) GetByID(ctx context.Context, id string) (*model.ServiceHistory, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, model.ErrNotFound("service history entry")
	}

	var entry model.ServiceHistory
	err = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&entry)
	if err == mongo.ErrNoDocuments {
		return nil, model.ErrNotFound("service history entry")
	}
	if err != nil {
		return nil, err
	}
	entry.ID = id
	return &entry, nil
}

func (r *ServiceHistoryRepo) ListByVehicle(ctx context.Context, vehicleID string) ([]*model.ServiceHistory, error) {
	opts := options.Find().SetSort(bson.D{{Key: "service_date", Value: -1}})
	cursor, err := r.col.Find(ctx, bson.M{"vehicle_id": vehicleID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var entries []*model.ServiceHistory
	for cursor.Next(ctx) {
		var entry model.ServiceHistory
		if err := cursor.Decode(&entry); err != nil {
			continue
		}
		entry.ID = cursor.Current.Lookup("_id").ObjectID().Hex()
		entries = append(entries, &entry)
	}
	return entries, nil
}

func (r *ServiceHistoryRepo) ListByMaintenanceItem(ctx context.Context, itemID string) ([]*model.ServiceHistory, error) {
	opts := options.Find().SetSort(bson.D{{Key: "service_date", Value: -1}})
	cursor, err := r.col.Find(ctx, bson.M{"maintenance_item_id": itemID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var entries []*model.ServiceHistory
	for cursor.Next(ctx) {
		var entry model.ServiceHistory
		if err := cursor.Decode(&entry); err != nil {
			continue
		}
		entry.ID = cursor.Current.Lookup("_id").ObjectID().Hex()
		entries = append(entries, &entry)
	}
	return entries, nil
}

func (r *ServiceHistoryRepo) Update(ctx context.Context, id string, entry *model.ServiceHistory) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return model.ErrNotFound("service history entry")
	}

	_, err = r.col.ReplaceOne(ctx, bson.M{"_id": oid}, entry)
	return err
}

func (r *ServiceHistoryRepo) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return model.ErrNotFound("service history entry")
	}

	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func (r *ServiceHistoryRepo) DeleteByVehicle(ctx context.Context, vehicleID string) (int, error) {
	result, err := r.col.DeleteMany(ctx, bson.M{"vehicle_id": vehicleID})
	if err != nil {
		return 0, err
	}
	return int(result.DeletedCount), nil
}
