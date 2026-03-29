package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

func (h *Handler) CreateTeam(w http.ResponseWriter, r *http.Request) {
	var req model.CreateTeamRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, model.ErrValidation("invalid request body"))
		return
	}
	if req.Name == "" {
		writeError(w, model.ErrRequired("name"))
		return
	}

	userID := getUserID(r)
	now := time.Now()

	team := &model.Team{
		Name:      req.Name,
		OwnerID:   userID,
		MemberIDs: []string{userID},
		CreatedAt: now,
		UpdatedAt: now,
	}

	id, err := h.repos.Teams.Create(r.Context(), team)
	if err != nil {
		writeError(w, err)
		return
	}

	team.ID = id
	writeJSON(w, http.StatusCreated, team)
}

func (h *Handler) ListTeams(w http.ResponseWriter, r *http.Request) {
	teams, err := h.repos.Teams.ListByUser(r.Context(), getUserID(r))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, teams)
}

func (h *Handler) GetTeam(w http.ResponseWriter, r *http.Request) {
	team, err := h.repos.Teams.GetByID(r.Context(), chi.URLParam(r, "teamId"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, team)
}

func (h *Handler) UpdateTeam(w http.ResponseWriter, r *http.Request) {
	teamID := chi.URLParam(r, "teamId")
	team, err := h.repos.Teams.GetByID(r.Context(), teamID)
	if err != nil {
		writeError(w, err)
		return
	}

	if team.OwnerID != getUserID(r) {
		writeError(w, model.ErrForbidden("only team owner can update team"))
		return
	}

	var req model.UpdateTeamRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, model.ErrValidation("invalid request body"))
		return
	}

	team.Name = req.Name
	team.UpdatedAt = time.Now()

	if err := h.repos.Teams.Update(r.Context(), teamID, team); err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, team)
}

func (h *Handler) DeleteTeam(w http.ResponseWriter, r *http.Request) {
	teamID := chi.URLParam(r, "teamId")
	team, err := h.repos.Teams.GetByID(r.Context(), teamID)
	if err != nil {
		writeError(w, err)
		return
	}

	if team.OwnerID != getUserID(r) {
		writeError(w, model.ErrForbidden("only team owner can delete team"))
		return
	}

	if err := h.repos.Teams.Delete(r.Context(), teamID); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) AddTeamMember(w http.ResponseWriter, r *http.Request) {
	var req model.AddMemberRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, model.ErrValidation("invalid request body"))
		return
	}

	teamID := chi.URLParam(r, "teamId")
	if err := h.repos.Teams.AddMember(r.Context(), teamID, req.UserID); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) RemoveTeamMember(w http.ResponseWriter, r *http.Request) {
	teamID := chi.URLParam(r, "teamId")
	userID := chi.URLParam(r, "userId")

	team, err := h.repos.Teams.GetByID(r.Context(), teamID)
	if err != nil {
		writeError(w, err)
		return
	}

	if team.OwnerID == userID {
		writeError(w, model.ErrValidation("cannot remove team owner"))
		return
	}

	if err := h.repos.Teams.RemoveMember(r.Context(), teamID, userID); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
