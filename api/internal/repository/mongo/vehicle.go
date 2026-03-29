package mongo

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

type VehicleRepo struct {
	col *mongo.Collection
}

func (r *VehicleRepo) Create(ctx context.Context, vehicle *model.Vehicle) (string, error) {
	result, err := r.col.InsertOne(ctx, vehicle)
	if err != nil {
		return "", err
	}
	return result.InsertedID.(primitive.ObjectID).Hex(), nil
}

func (r *VehicleRepo) GetByID(ctx context.Context, id string) (*model.Vehicle, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, model.ErrNotFound("vehicle")
	}

	var vehicle model.Vehicle
	err = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&vehicle)
	if err == mongo.ErrNoDocuments {
		return nil, model.ErrNotFound("vehicle")
	}
	if err != nil {
		return nil, err
	}
	vehicle.ID = id
	return &vehicle, nil
}

func (r *VehicleRepo) ListByTeam(ctx context.Context, teamID string) ([]*model.Vehicle, error) {
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := r.col.Find(ctx, bson.M{"team_id": teamID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var vehicles []*model.Vehicle
	for cursor.Next(ctx) {
		var v model.Vehicle
		if err := cursor.Decode(&v); err != nil {
			continue
		}
		v.ID = cursor.Current.Lookup("_id").ObjectID().Hex()
		vehicles = append(vehicles, &v)
	}
	return vehicles, nil
}

func (r *VehicleRepo) Update(ctx context.Context, id string, vehicle *model.Vehicle) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return model.ErrNotFound("vehicle")
	}

	_, err = r.col.ReplaceOne(ctx, bson.M{"_id": oid}, vehicle)
	return err
}

func (r *VehicleRepo) UpdateUsage(ctx context.Context, id string, usage float64) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return model.ErrNotFound("vehicle")
	}

	_, err = r.col.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{
		"$set": bson.M{"current_usage": usage},
	})
	return err
}

func (r *VehicleRepo) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return model.ErrNotFound("vehicle")
	}

	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}
