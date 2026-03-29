package mongo

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

type UsageHistoryRepo struct {
	col *mongo.Collection
}

func (r *UsageHistoryRepo) Create(ctx context.Context, entry *model.UsageHistory) (string, error) {
	result, err := r.col.InsertOne(ctx, entry)
	if err != nil {
		return "", err
	}
	return result.InsertedID.(primitive.ObjectID).Hex(), nil
}

func (r *UsageHistoryRepo) GetByID(ctx context.Context, id string) (*model.UsageHistory, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, model.ErrNotFound("usage history entry")
	}

	var entry model.UsageHistory
	err = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&entry)
	if err == mongo.ErrNoDocuments {
		return nil, model.ErrNotFound("usage history entry")
	}
	if err != nil {
		return nil, err
	}
	entry.ID = id
	return &entry, nil
}

func (r *UsageHistoryRepo) ListByVehicle(ctx context.Context, vehicleID string) ([]*model.UsageHistory, error) {
	opts := options.Find().SetSort(bson.D{{Key: "date", Value: -1}})
	cursor, err := r.col.Find(ctx, bson.M{"vehicle_id": vehicleID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var entries []*model.UsageHistory
	for cursor.Next(ctx) {
		var entry model.UsageHistory
		if err := cursor.Decode(&entry); err != nil {
			continue
		}
		entry.ID = cursor.Current.Lookup("_id").ObjectID().Hex()
		entries = append(entries, &entry)
	}
	return entries, nil
}

func (r *UsageHistoryRepo) Update(ctx context.Context, id string, entry *model.UsageHistory, expectedVersion int) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return model.ErrNotFound("usage history entry")
	}

	// Optimistic locking: only update if version matches
	filter := bson.M{"_id": oid, "version": expectedVersion}
	entry.Version = expectedVersion + 1

	result, err := r.col.ReplaceOne(ctx, filter, entry)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return model.ErrConflict("version conflict: this entry was modified by another user")
	}
	return nil
}

func (r *UsageHistoryRepo) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return model.ErrNotFound("usage history entry")
	}

	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func (r *UsageHistoryRepo) DeleteByVehicle(ctx context.Context, vehicleID string) (int, error) {
	result, err := r.col.DeleteMany(ctx, bson.M{"vehicle_id": vehicleID})
	if err != nil {
		return 0, err
	}
	return int(result.DeletedCount), nil
}
