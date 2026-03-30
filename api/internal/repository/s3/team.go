package s3

import (
	"context"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

const teamsCollection = "teams"

type TeamRepo struct {
	store *Store
}

func (r *TeamRepo) Create(ctx context.Context, team *model.Team) (string, error) {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	teams, err := load[model.Team](ctx, r.store, teamsCollection)
	if err != nil {
		return "", err
	}

	id := r.store.nextID("team")
	team.ID = id
	teams = append(teams, *team)

	if err := save(ctx, r.store, teamsCollection, teams); err != nil {
		return "", err
	}
	return id, nil
}

func (r *TeamRepo) GetByID(ctx context.Context, id string) (*model.Team, error) {
	teams, err := load[model.Team](ctx, r.store, teamsCollection)
	if err != nil {
		return nil, err
	}
	for i := range teams {
		if teams[i].ID == id {
			return &teams[i], nil
		}
	}
	return nil, notFound("team")
}

func (r *TeamRepo) ListByUser(ctx context.Context, userID string) ([]*model.Team, error) {
	teams, err := load[model.Team](ctx, r.store, teamsCollection)
	if err != nil {
		return nil, err
	}
	var result []*model.Team
	for i := range teams {
		for _, mid := range teams[i].MemberIDs {
			if mid == userID {
				t := teams[i]
				result = append(result, &t)
				break
			}
		}
	}
	return result, nil
}

func (r *TeamRepo) Update(ctx context.Context, id string, team *model.Team) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	teams, err := load[model.Team](ctx, r.store, teamsCollection)
	if err != nil {
		return err
	}
	for i := range teams {
		if teams[i].ID == id {
			teams[i] = *team
			return save(ctx, r.store, teamsCollection, teams)
		}
	}
	return notFound("team")
}

func (r *TeamRepo) Delete(ctx context.Context, id string) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	teams, err := load[model.Team](ctx, r.store, teamsCollection)
	if err != nil {
		return err
	}
	for i := range teams {
		if teams[i].ID == id {
			teams = append(teams[:i], teams[i+1:]...)
			return save(ctx, r.store, teamsCollection, teams)
		}
	}
	return notFound("team")
}

func (r *TeamRepo) AddMember(ctx context.Context, teamID, userID string) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	teams, err := load[model.Team](ctx, r.store, teamsCollection)
	if err != nil {
		return err
	}
	for i := range teams {
		if teams[i].ID == teamID {
			for _, mid := range teams[i].MemberIDs {
				if mid == userID {
					return nil // already a member
				}
			}
			teams[i].MemberIDs = append(teams[i].MemberIDs, userID)
			return save(ctx, r.store, teamsCollection, teams)
		}
	}
	return notFound("team")
}

func (r *TeamRepo) RemoveMember(ctx context.Context, teamID, userID string) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	teams, err := load[model.Team](ctx, r.store, teamsCollection)
	if err != nil {
		return err
	}
	for i := range teams {
		if teams[i].ID == teamID {
			for j, mid := range teams[i].MemberIDs {
				if mid == userID {
					teams[i].MemberIDs = append(teams[i].MemberIDs[:j], teams[i].MemberIDs[j+1:]...)
					return save(ctx, r.store, teamsCollection, teams)
				}
			}
			return nil
		}
	}
	return notFound("team")
}
