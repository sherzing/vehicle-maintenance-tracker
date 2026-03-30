package firestore

import (
	"context"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

const teamsCollection = "teams"

type TeamRepo struct {
	client *Client
}

func teamToFields(t *model.Team) map[string]FieldValue {
	return map[string]FieldValue{
		"name":       stringField(t.Name),
		"owner_id":   stringField(t.OwnerID),
		"member_ids": stringArrayField(t.MemberIDs),
		"created_at": timeField(t.CreatedAt),
		"updated_at": timeField(t.UpdatedAt),
	}
}

func teamFromDoc(doc *Document) *model.Team {
	f := doc.Fields
	return &model.Team{
		ID:        docID(doc.Name),
		Name:      getString(f, "name"),
		OwnerID:   getString(f, "owner_id"),
		MemberIDs: getStringArray(f, "member_ids"),
		CreatedAt: getTime(f, "created_at"),
		UpdatedAt: getTime(f, "updated_at"),
	}
}

func (r *TeamRepo) Create(ctx context.Context, team *model.Team) (string, error) {
	id, err := r.client.createDoc(ctx, teamsCollection, teamToFields(team))
	if err != nil {
		return "", err
	}
	team.ID = id
	return id, nil
}

func (r *TeamRepo) GetByID(ctx context.Context, id string) (*model.Team, error) {
	doc, err := r.client.getDoc(ctx, teamsCollection, id)
	if err != nil {
		return nil, err
	}
	if doc == nil {
		return nil, model.ErrNotFound("team")
	}
	return teamFromDoc(doc), nil
}

func (r *TeamRepo) ListByUser(ctx context.Context, userID string) ([]*model.Team, error) {
	docs, err := r.client.listDocs(ctx, teamsCollection)
	if err != nil {
		return nil, err
	}
	var result []*model.Team
	for i := range docs {
		team := teamFromDoc(&docs[i])
		for _, mid := range team.MemberIDs {
			if mid == userID {
				result = append(result, team)
				break
			}
		}
	}
	return result, nil
}

func (r *TeamRepo) Update(ctx context.Context, id string, team *model.Team) error {
	return r.client.updateDoc(ctx, teamsCollection, id, teamToFields(team))
}

func (r *TeamRepo) Delete(ctx context.Context, id string) error {
	doc, err := r.client.getDoc(ctx, teamsCollection, id)
	if err != nil {
		return err
	}
	if doc == nil {
		return model.ErrNotFound("team")
	}
	return r.client.deleteDoc(ctx, teamsCollection, id)
}

func (r *TeamRepo) AddMember(ctx context.Context, teamID, userID string) error {
	team, err := r.GetByID(ctx, teamID)
	if err != nil {
		return err
	}
	for _, mid := range team.MemberIDs {
		if mid == userID {
			return nil
		}
	}
	team.MemberIDs = append(team.MemberIDs, userID)
	return r.client.updateDoc(ctx, teamsCollection, teamID, teamToFields(team))
}

func (r *TeamRepo) RemoveMember(ctx context.Context, teamID, userID string) error {
	team, err := r.GetByID(ctx, teamID)
	if err != nil {
		return err
	}
	for i, mid := range team.MemberIDs {
		if mid == userID {
			team.MemberIDs = append(team.MemberIDs[:i], team.MemberIDs[i+1:]...)
			return r.client.updateDoc(ctx, teamsCollection, teamID, teamToFields(team))
		}
	}
	return nil
}
