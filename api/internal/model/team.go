package model

import "time"

type Team struct {
	ID        string    `json:"id" bson:"_id,omitempty"`
	Name      string    `json:"name" bson:"name"`
	OwnerID   string    `json:"owner_id" bson:"owner_id"`
	MemberIDs []string  `json:"member_ids" bson:"member_ids"`
	CreatedAt time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time `json:"updated_at" bson:"updated_at"`
}

type CreateTeamRequest struct {
	Name string `json:"name"`
}

type UpdateTeamRequest struct {
	Name string `json:"name"`
}

type AddMemberRequest struct {
	UserID string `json:"user_id"`
}
