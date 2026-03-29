package mongo

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

type MaintenanceRepo struct {
	col *mongo.Collection
}

func (r *MaintenanceRepo) Create(ctx context.Context, item *model.MaintenanceItem) (string, error) {
	result, err := r.col.InsertOne(ctx, item)
	if err != nil {
		return "", err
	}
	return result.InsertedID.(primitive.ObjectID).Hex(), nil
}

func (r *MaintenanceRepo) GetByID(ctx context.Context, id string) (*model.MaintenanceItem, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, model.ErrNotFound("maintenance item")
	}

	var item model.MaintenanceItem
	err = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&item)
	if err == mongo.ErrNoDocuments {
		return nil, model.ErrNotFound("maintenance item")
	}
	if err != nil {
		return nil, err
	}
	item.ID = id
	return &item, nil
}

func (r *MaintenanceRepo) ListByVehicle(ctx context.Context, vehicleID string) ([]*model.MaintenanceItem, error) {
	opts := options.Find().SetSort(bson.D{{Key: "name", Value: 1}})
	cursor, err := r.col.Find(ctx, bson.M{"vehicle_id": vehicleID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var items []*model.MaintenanceItem
	for cursor.Next(ctx) {
		var item model.MaintenanceItem
		if err := cursor.Decode(&item); err != nil {
			continue
		}
		item.ID = cursor.Current.Lookup("_id").ObjectID().Hex()
		items = append(items, &item)
	}
	return items, nil
}

func (r *MaintenanceRepo) Update(ctx context.Context, id string, item *model.MaintenanceItem) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return model.ErrNotFound("maintenance item")
	}

	_, err = r.col.ReplaceOne(ctx, bson.M{"_id": oid}, item)
	return err
}

func (r *MaintenanceRepo) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return model.ErrNotFound("maintenance item")
	}

	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func (r *MaintenanceRepo) ResetByVehicle(ctx context.Context, vehicleID string) (int, error) {
	result, err := r.col.UpdateMany(ctx,
		bson.M{"vehicle_id": vehicleID},
		bson.M{"$set": bson.M{
			"last_service_usage": nil,
			"last_service_date":  nil,
		}},
	)
	if err != nil {
		return 0, err
	}
	return int(result.ModifiedCount), nil
}
