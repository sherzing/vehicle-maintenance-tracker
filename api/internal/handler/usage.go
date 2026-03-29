package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

func (h *Handler) LogUsage(w http.ResponseWriter, r *http.Request) {
	vehicleID := chi.URLParam(r, "vehicleId")

	var req model.LogUsageRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, model.ErrValidation("invalid request body"))
		return
	}
	if err := req.Validate(); err != nil {
		writeError(w, err)
		return
	}

	date, err := time.Parse(time.RFC3339, req.Date)
	if err != nil {
		writeError(w, model.ErrValidation("invalid date format, use ISO 8601"))
		return
	}
	if date.After(time.Now()) {
		writeError(w, model.ErrValidation("date cannot be in the future"))
		return
	}

	entry := &model.UsageHistory{
		VehicleID: vehicleID,
		Usage:     req.Usage,
		Date:      date,
		UsageType: req.UsageType,
		Location:  req.Location,
		CreatedBy: getUserID(r),
		CreatedAt: time.Now(),
		Version:   1,
	}

	id, err := h.repos.UsageHistory.Create(r.Context(), entry)
	if err != nil {
		writeError(w, err)
		return
	}

	// Check if we should update vehicle's current_usage
	vehicle, err := h.repos.Vehicles.GetByID(r.Context(), vehicleID)
	if err != nil {
		writeError(w, err)
		return
	}

	resp := model.LogUsageResponse{EntryID: id, Conflict: false}

	if req.Usage > vehicle.CurrentUsage {
		// Check for conflicts (later entries with lower usage)
		conflict := h.detectUsageConflict(r, vehicleID, req.Usage, date, vehicle.CurrentUsage)
		if conflict != nil {
			resp.Conflict = true
			resp.ConflictInfo = conflict
		} else {
			h.repos.Vehicles.UpdateUsage(r.Context(), vehicleID, req.Usage)
		}
	}

	writeJSON(w, http.StatusCreated, resp)
}

func (h *Handler) ListUsageHistory(w http.ResponseWriter, r *http.Request) {
	vehicleID := chi.URLParam(r, "vehicleId")
	history, err := h.repos.UsageHistory.ListByVehicle(r.Context(), vehicleID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, history)
}

func (h *Handler) UpdateUsage(w http.ResponseWriter, r *http.Request) {
	usageID := chi.URLParam(r, "usageId")

	var req model.UpdateUsageRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, model.ErrValidation("invalid request body"))
		return
	}

	date, err := time.Parse(time.RFC3339, req.Date)
	if err != nil {
		writeError(w, model.ErrValidation("invalid date format"))
		return
	}

	existing, err := h.repos.UsageHistory.GetByID(r.Context(), usageID)
	if err != nil {
		writeError(w, err)
		return
	}

	now := time.Now()
	userID := getUserID(r)
	existing.Usage = req.Usage
	existing.Date = date
	existing.UsageType = req.UsageType
	existing.Location = req.Location
	existing.UpdatedAt = &now
	existing.UpdatedBy = &userID

	expectedVersion := existing.Version
	if req.ExpectedVersion != nil {
		expectedVersion = *req.ExpectedVersion
	}

	if err := h.repos.UsageHistory.Update(r.Context(), usageID, existing, expectedVersion); err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, existing)
}

func (h *Handler) DeleteUsage(w http.ResponseWriter, r *http.Request) {
	usageID := chi.URLParam(r, "usageId")

	existing, err := h.repos.UsageHistory.GetByID(r.Context(), usageID)
	if err != nil {
		writeError(w, err)
		return
	}

	if err := h.repos.UsageHistory.Delete(r.Context(), usageID); err != nil {
		writeError(w, err)
		return
	}

	// Recalculate vehicle's current_usage from remaining entries
	remaining, _ := h.repos.UsageHistory.ListByVehicle(r.Context(), existing.VehicleID)
	highestUsage := 0.0
	for _, entry := range remaining {
		if entry.Usage > highestUsage {
			highestUsage = entry.Usage
		}
	}
	h.repos.Vehicles.UpdateUsage(r.Context(), existing.VehicleID, highestUsage)

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) ResolveUsageConflict(w http.ResponseWriter, r *http.Request) {
	vehicleID := chi.URLParam(r, "vehicleId")

	var req model.ResolveConflictRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, model.ErrValidation("invalid request body"))
		return
	}

	if err := h.repos.Vehicles.UpdateUsage(r.Context(), vehicleID, req.ChosenUsage); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// detectUsageConflict checks if a new usage reading conflicts with later entries.
func (h *Handler) detectUsageConflict(r *http.Request, vehicleID string, newUsage float64, newDate time.Time, currentUsage float64) *model.UsageConflict {
	if newUsage <= currentUsage {
		return nil
	}

	history, err := h.repos.UsageHistory.ListByVehicle(r.Context(), vehicleID)
	if err != nil {
		return nil
	}

	highestLater := 0.0
	hasConflict := false
	for _, entry := range history {
		if entry.Date.After(newDate) {
			if entry.Usage < newUsage {
				hasConflict = true
			}
			if entry.Usage > highestLater {
				highestLater = entry.Usage
			}
		}
	}

	if !hasConflict {
		return nil
	}

	return &model.UsageConflict{
		NewUsage:          newUsage,
		CurrentUsage:      currentUsage,
		HighestLaterUsage: highestLater,
	}
}
