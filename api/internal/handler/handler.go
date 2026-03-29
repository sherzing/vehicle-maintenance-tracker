package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/auth"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/middleware"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/repository"
)

// Handler holds dependencies for all HTTP handlers.
type Handler struct {
	repos    *repository.Repositories
	verifier *auth.Verifier
}

// New creates a new Handler with the given dependencies.
func New(repos *repository.Repositories, verifier *auth.Verifier) *Handler {
	return &Handler{
		repos:    repos,
		verifier: verifier,
	}
}

// RegisterRoutes sets up all API routes on the given router.
func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/health", h.Health)

	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.Auth(h.verifier))

		// Teams
		r.Post("/teams", h.CreateTeam)
		r.Get("/teams", h.ListTeams)
		r.Get("/teams/{teamId}", h.GetTeam)
		r.Put("/teams/{teamId}", h.UpdateTeam)
		r.Delete("/teams/{teamId}", h.DeleteTeam)
		r.Post("/teams/{teamId}/members", h.AddTeamMember)
		r.Delete("/teams/{teamId}/members/{userId}", h.RemoveTeamMember)

		// Vehicles
		r.Post("/teams/{teamId}/vehicles", h.CreateVehicle)
		r.Get("/teams/{teamId}/vehicles", h.ListVehicles)
		r.Get("/vehicles/{vehicleId}", h.GetVehicle)
		r.Put("/vehicles/{vehicleId}", h.UpdateVehicle)
		r.Delete("/vehicles/{vehicleId}", h.DeleteVehicle)
		r.Post("/vehicles/{vehicleId}/reset", h.ResetVehicleHistory)

		// Maintenance items
		r.Post("/vehicles/{vehicleId}/maintenance", h.CreateMaintenanceItem)
		r.Get("/vehicles/{vehicleId}/maintenance", h.ListMaintenanceItems)
		r.Get("/maintenance/{itemId}", h.GetMaintenanceItem)
		r.Put("/maintenance/{itemId}", h.UpdateMaintenanceItem)
		r.Delete("/maintenance/{itemId}", h.DeleteMaintenanceItem)

		// Service history
		r.Post("/vehicles/{vehicleId}/services", h.LogService)
		r.Post("/vehicles/{vehicleId}/repairs", h.LogRepair)
		r.Get("/vehicles/{vehicleId}/history", h.ListServiceHistory)
		r.Put("/history/{historyId}", h.UpdateServiceHistory)
		r.Delete("/history/{historyId}", h.DeleteServiceHistory)

		// Usage
		r.Post("/vehicles/{vehicleId}/usage", h.LogUsage)
		r.Get("/vehicles/{vehicleId}/usage", h.ListUsageHistory)
		r.Put("/usage/{usageId}", h.UpdateUsage)
		r.Delete("/usage/{usageId}", h.DeleteUsage)
		r.Post("/vehicles/{vehicleId}/usage/resolve-conflict", h.ResolveUsageConflict)

		// Export / Import
		r.Get("/teams/{teamId}/export", h.ExportTeamData)
		r.Post("/teams/{teamId}/import", h.ImportTeamData)

		// VIN decode
		r.Get("/vin/{vin}", h.DecodeVIN)
	})
}

// Health is a simple health check endpoint.
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// --- JSON helpers ---

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func readJSON(r *http.Request, v any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(v)
}

func writeError(w http.ResponseWriter, err error) {
	var appErr *model.AppError
	if errors.As(err, &appErr) {
		writeJSON(w, appErr.Code, appErr)
		return
	}
	writeJSON(w, http.StatusInternalServerError, model.ErrInternal("internal server error"))
}

func getUserID(r *http.Request) string {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		return ""
	}
	return claims.UID
}
