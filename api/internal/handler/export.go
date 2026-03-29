package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

// ExportTeamData exports all vehicles and history for a team as JSON.
func (h *Handler) ExportTeamData(w http.ResponseWriter, r *http.Request) {
	teamID := chi.URLParam(r, "teamId")

	vehicles, err := h.repos.Vehicles.ListByTeam(r.Context(), teamID)
	if err != nil {
		writeError(w, err)
		return
	}

	type vehicleExport struct {
		Vehicle          any   `json:"vehicle"`
		MaintenanceItems any   `json:"maintenance_items"`
		ServiceHistory   any   `json:"service_history"`
		UsageHistory     any   `json:"usage_history"`
	}

	var exports []vehicleExport
	for _, v := range vehicles {
		items, _ := h.repos.Maintenance.ListByVehicle(r.Context(), v.ID)
		services, _ := h.repos.ServiceHistory.ListByVehicle(r.Context(), v.ID)
		usage, _ := h.repos.UsageHistory.ListByVehicle(r.Context(), v.ID)

		exports = append(exports, vehicleExport{
			Vehicle:          v,
			MaintenanceItems: items,
			ServiceHistory:   services,
			UsageHistory:     usage,
		})
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"team_id":  teamID,
		"version":  "2.0",
		"vehicles": exports,
	})
}

// ImportTeamData imports vehicles and history from JSON into a team.
func (h *Handler) ImportTeamData(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement import with validation, modes (full, vehicle-only, etc.)
	writeJSON(w, http.StatusNotImplemented, map[string]string{
		"message": "import not yet implemented",
	})
}
