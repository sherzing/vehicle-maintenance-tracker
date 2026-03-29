package mongo

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

type TeamRepo struct {
	col *mongo.Collection
}

func (r *TeamRepo) Create(ctx context.Context, team *model.Team) (string, error) {
	result, err := r.col.InsertOne(ctx, team)
	if err != nil {
		return "", err
	}
	return result.InsertedID.(primitive.ObjectID).Hex(), nil
}

func (r *TeamRepo) GetByID(ctx context.Context, id string) (*model.Team, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, model.ErrNotFound("team")
	}

	var team model.Team
	err = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&team)
	if err == mongo.ErrNoDocuments {
		return nil, model.ErrNotFound("team")
	}
	if err != nil {
		return nil, err
	}
	team.ID = id
	return &team, nil
}

func (r *TeamRepo) ListByUser(ctx context.Context, userID string) ([]*model.Team, error) {
	cursor, err := r.col.Find(ctx, bson.M{"member_ids": userID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var teams []*model.Team
	for cursor.Next(ctx) {
		var team model.Team
		if err := cursor.Decode(&team); err != nil {
			continue
		}
		team.ID = cursor.Current.Lookup("_id").ObjectID().Hex()
		teams = append(teams, &team)
	}
	return teams, nil
}

func (r *TeamRepo) Update(ctx context.Context, id string, team *model.Team) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return model.ErrNotFound("team")
	}

	_, err = r.col.ReplaceOne(ctx, bson.M{"_id": oid}, team)
	return err
}

func (r *TeamRepo) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return model.ErrNotFound("team")
	}

	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func (r *TeamRepo) AddMember(ctx context.Context, teamID, userID string) error {
	oid, err := primitive.ObjectIDFromHex(teamID)
	if err != nil {
		return model.ErrNotFound("team")
	}

	_, err = r.col.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{
		"$addToSet": bson.M{"member_ids": userID},
	})
	return err
}

func (r *TeamRepo) RemoveMember(ctx context.Context, teamID, userID string) error {
	oid, err := primitive.ObjectIDFromHex(teamID)
	if err != nil {
		return model.ErrNotFound("team")
	}

	_, err = r.col.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{
		"$pull": bson.M{"member_ids": userID},
	})
	return err
}
