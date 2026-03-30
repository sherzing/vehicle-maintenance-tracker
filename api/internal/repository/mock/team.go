package mock

import (
	"context"
	"fmt"
	"sync"

	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

// TeamRepo is an in-memory mock implementation of repository.TeamRepository.
type TeamRepo struct {
	mu    sync.RWMutex
	teams map[string]*model.Team
	seq   int
}

func NewTeamRepo() *TeamRepo {
	return &TeamRepo{teams: make(map[string]*model.Team)}
}

func (r *TeamRepo) nextID() string {
	r.seq++
	return fmt.Sprintf("team-%d", r.seq)
}

func (r *TeamRepo) Create(ctx context.Context, team *model.Team) (string, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	id := r.nextID()
	team.ID = id
	copy := *team
	r.teams[id] = &copy
	return id, nil
}

func (r *TeamRepo) GetByID(ctx context.Context, id string) (*model.Team, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	team, ok := r.teams[id]
	if !ok {
		return nil, model.ErrNotFound("team")
	}
	copy := *team
	return &copy, nil
}

func (r *TeamRepo) ListByUser(ctx context.Context, userID string) ([]*model.Team, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []*model.Team
	for _, team := range r.teams {
		for _, mid := range team.MemberIDs {
			if mid == userID {
				copy := *team
				result = append(result, &copy)
				break
			}
		}
	}
	return result, nil
}

func (r *TeamRepo) Update(ctx context.Context, id string, team *model.Team) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.teams[id]; !ok {
		return model.ErrNotFound("team")
	}
	copy := *team
	r.teams[id] = &copy
	return nil
}

func (r *TeamRepo) Delete(ctx context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.teams[id]; !ok {
		return model.ErrNotFound("team")
	}
	delete(r.teams, id)
	return nil
}

func (r *TeamRepo) AddMember(ctx context.Context, teamID, userID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	team, ok := r.teams[teamID]
	if !ok {
		return model.ErrNotFound("team")
	}
	for _, mid := range team.MemberIDs {
		if mid == userID {
			return nil // Already a member
		}
	}
	team.MemberIDs = append(team.MemberIDs, userID)
	return nil
}

func (r *TeamRepo) RemoveMember(ctx context.Context, teamID, userID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	team, ok := r.teams[teamID]
	if !ok {
		return model.ErrNotFound("team")
	}
	for i, mid := range team.MemberIDs {
		if mid == userID {
			team.MemberIDs = append(team.MemberIDs[:i], team.MemberIDs[i+1:]...)
			return nil
		}
	}
	return nil
}
