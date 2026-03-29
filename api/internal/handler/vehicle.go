package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

func (h *Handler) CreateVehicle(w http.ResponseWriter, r *http.Request) {
	teamID := chi.URLParam(r, "teamId")

	var req model.CreateVehicleRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, model.ErrValidation("invalid request body"))
		return
	}
	if err := req.Validate(); err != nil {
		writeError(w, err)
		return
	}

	now := time.Now()
	vehicle := &model.Vehicle{
		TeamID:       teamID,
		Name:         req.Name,
		Type:         req.Type,
		UsageUnit:    req.UsageUnit,
		CurrentUsage: req.CurrentUsage,
		Make:         req.Make,
		Model:        req.Model,
		Year:         req.Year,
		VIN:          req.VIN,
		RaceNumber:   req.RaceNumber,
		Nickname:     req.Nickname,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	id, err := h.repos.Vehicles.Create(r.Context(), vehicle)
	if err != nil {
		writeError(w, err)
		return
	}

	vehicle.ID = id
	writeJSON(w, http.StatusCreated, vehicle)
}

func (h *Handler) ListVehicles(w http.ResponseWriter, r *http.Request) {
	teamID := chi.URLParam(r, "teamId")
	vehicles, err := h.repos.Vehicles.ListByTeam(r.Context(), teamID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, vehicles)
}

func (h *Handler) GetVehicle(w http.ResponseWriter, r *http.Request) {
	vehicle, err := h.repos.Vehicles.GetByID(r.Context(), chi.URLParam(r, "vehicleId"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, vehicle)
}

func (h *Handler) UpdateVehicle(w http.ResponseWriter, r *http.Request) {
	vehicleID := chi.URLParam(r, "vehicleId")

	vehicle, err := h.repos.Vehicles.GetByID(r.Context(), vehicleID)
	if err != nil {
		writeError(w, err)
		return
	}

	var req model.UpdateVehicleRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, model.ErrValidation("invalid request body"))
		return
	}

	if req.Name != nil {
		vehicle.Name = *req.Name
	}
	if req.Type != nil {
		vehicle.Type = *req.Type
	}
	if req.UsageUnit != nil {
		vehicle.UsageUnit = *req.UsageUnit
	}
	if req.CurrentUsage != nil {
		vehicle.CurrentUsage = *req.CurrentUsage
	}
	if req.Make != nil {
		vehicle.Make = *req.Make
	}
	if req.Model != nil {
		vehicle.Model = *req.Model
	}
	if req.Year != nil {
		vehicle.Year = *req.Year
	}
	if req.VIN != nil {
		vehicle.VIN = *req.VIN
	}
	if req.RaceNumber != nil {
		vehicle.RaceNumber = *req.RaceNumber
	}
	if req.Nickname != nil {
		vehicle.Nickname = *req.Nickname
	}

	// Re-validate after merge
	if vehicle.Type == model.VehicleTypeCar && vehicle.UsageUnit != model.UsageUnitKM {
		writeError(w, model.ErrValidation("cars must use km as usage unit"))
		return
	}

	vehicle.UpdatedAt = time.Now()
	if err := h.repos.Vehicles.Update(r.Context(), vehicleID, vehicle); err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, vehicle)
}

func (h *Handler) DeleteVehicle(w http.ResponseWriter, r *http.Request) {
	vehicleID := chi.URLParam(r, "vehicleId")

	// Cascade delete related data
	h.repos.ServiceHistory.DeleteByVehicle(r.Context(), vehicleID)
	h.repos.UsageHistory.DeleteByVehicle(r.Context(), vehicleID)
	// Maintenance items don't have a DeleteByVehicle, delete individually
	items, _ := h.repos.Maintenance.ListByVehicle(r.Context(), vehicleID)
	for _, item := range items {
		h.repos.Maintenance.Delete(r.Context(), item.ID)
	}

	if err := h.repos.Vehicles.Delete(r.Context(), vehicleID); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) ResetVehicleHistory(w http.ResponseWriter, r *http.Request) {
	vehicleID := chi.URLParam(r, "vehicleId")

	serviceDeleted, _ := h.repos.ServiceHistory.DeleteByVehicle(r.Context(), vehicleID)
	usageDeleted, _ := h.repos.UsageHistory.DeleteByVehicle(r.Context(), vehicleID)
	maintenanceReset, _ := h.repos.Maintenance.ResetByVehicle(r.Context(), vehicleID)

	if err := h.repos.Vehicles.UpdateUsage(r.Context(), vehicleID, 0); err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]int{
		"service_history_deleted":  serviceDeleted,
		"usage_history_deleted":    usageDeleted,
		"maintenance_items_reset":  maintenanceReset,
	})
}
