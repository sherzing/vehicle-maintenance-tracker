package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

func (h *Handler) LogService(w http.ResponseWriter, r *http.Request) {
	vehicleID := chi.URLParam(r, "vehicleId")

	var req model.LogServiceRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, model.ErrValidation("invalid request body"))
		return
	}

	serviceDate, err := time.Parse(time.RFC3339, req.ServiceDate)
	if err != nil {
		writeError(w, model.ErrValidation("invalid service_date format, use ISO 8601"))
		return
	}

	// Get the maintenance item to record its name
	item, err := h.repos.Maintenance.GetByID(r.Context(), req.MaintenanceItemID)
	if err != nil {
		writeError(w, err)
		return
	}

	entry := &model.ServiceHistory{
		VehicleID:         vehicleID,
		Type:              model.HistoryTypeService,
		MaintenanceItemID: &req.MaintenanceItemID,
		ItemName:          item.Name,
		ServiceUsage:      &req.ServiceUsage,
		ServiceDate:       serviceDate,
		Cost:              req.Cost,
		Provider:          req.Provider,
		LoggedBy:          getUserID(r),
		CreatedAt:         time.Now(),
	}

	id, err := h.repos.ServiceHistory.Create(r.Context(), entry)
	if err != nil {
		writeError(w, err)
		return
	}

	// Conditionally update maintenance item's last service info
	// Only update if this service date >= current last_service_date
	shouldUpdate := item.LastServiceDate == nil || !serviceDate.Before(*item.LastServiceDate)
	if shouldUpdate {
		item.LastServiceUsage = &req.ServiceUsage
		item.LastServiceDate = &serviceDate
		item.UpdatedAt = time.Now()
		h.repos.Maintenance.Update(r.Context(), item.ID, item)
	}

	entry.ID = id
	writeJSON(w, http.StatusCreated, entry)
}

func (h *Handler) LogRepair(w http.ResponseWriter, r *http.Request) {
	vehicleID := chi.URLParam(r, "vehicleId")

	var req model.LogRepairRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, model.ErrValidation("invalid request body"))
		return
	}

	serviceDate, err := time.Parse(time.RFC3339, req.ServiceDate)
	if err != nil {
		writeError(w, model.ErrValidation("invalid service_date format, use ISO 8601"))
		return
	}

	entry := &model.ServiceHistory{
		VehicleID:   vehicleID,
		Type:        model.HistoryTypeRepair,
		ItemName:    req.Description,
		ServiceDate: serviceDate,
		Cost:        req.Cost,
		Provider:    req.Provider,
		LoggedBy:    getUserID(r),
		CreatedAt:   time.Now(),
	}

	id, err := h.repos.ServiceHistory.Create(r.Context(), entry)
	if err != nil {
		writeError(w, err)
		return
	}

	entry.ID = id
	writeJSON(w, http.StatusCreated, entry)
}

func (h *Handler) ListServiceHistory(w http.ResponseWriter, r *http.Request) {
	vehicleID := chi.URLParam(r, "vehicleId")
	history, err := h.repos.ServiceHistory.ListByVehicle(r.Context(), vehicleID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, history)
}

func (h *Handler) UpdateServiceHistory(w http.ResponseWriter, r *http.Request) {
	historyID := chi.URLParam(r, "historyId")

	existing, err := h.repos.ServiceHistory.GetByID(r.Context(), historyID)
	if err != nil {
		writeError(w, err)
		return
	}

	var req model.UpdateServiceHistoryRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, model.ErrValidation("invalid request body"))
		return
	}

	if req.ServiceUsage != nil {
		existing.ServiceUsage = req.ServiceUsage
	}
	if req.ServiceDate != nil {
		t, err := time.Parse(time.RFC3339, *req.ServiceDate)
		if err != nil {
			writeError(w, model.ErrValidation("invalid service_date format"))
			return
		}
		existing.ServiceDate = t
	}
	if req.Cost != nil {
		existing.Cost = req.Cost
	}
	if req.Provider != nil {
		existing.Provider = req.Provider
	}
	if req.Description != nil && existing.Type == model.HistoryTypeRepair {
		existing.ItemName = *req.Description
	}

	if err := h.repos.ServiceHistory.Update(r.Context(), historyID, existing); err != nil {
		writeError(w, err)
		return
	}

	// Recalculate maintenance item's last service if this is a service entry
	if existing.Type == model.HistoryTypeService && existing.MaintenanceItemID != nil {
		h.recalculateLastService(r, *existing.MaintenanceItemID)
	}

	writeJSON(w, http.StatusOK, existing)
}

func (h *Handler) DeleteServiceHistory(w http.ResponseWriter, r *http.Request) {
	historyID := chi.URLParam(r, "historyId")

	existing, err := h.repos.ServiceHistory.GetByID(r.Context(), historyID)
	if err != nil {
		writeError(w, err)
		return
	}

	if err := h.repos.ServiceHistory.Delete(r.Context(), historyID); err != nil {
		writeError(w, err)
		return
	}

	// Recalculate maintenance item's last service if this was a service entry
	if existing.Type == model.HistoryTypeService && existing.MaintenanceItemID != nil {
		h.recalculateLastService(r, *existing.MaintenanceItemID)
	}

	w.WriteHeader(http.StatusNoContent)
}

// recalculateLastService updates a maintenance item's last_service fields
// based on the most recent remaining service history entry.
func (h *Handler) recalculateLastService(r *http.Request, itemID string) {
	history, err := h.repos.ServiceHistory.ListByMaintenanceItem(r.Context(), itemID)
	if err != nil {
		return
	}

	item, err := h.repos.Maintenance.GetByID(r.Context(), itemID)
	if err != nil {
		return
	}

	if len(history) > 0 {
		// Already sorted most recent first
		most := history[0]
		item.LastServiceUsage = most.ServiceUsage
		item.LastServiceDate = &most.ServiceDate
	} else {
		item.LastServiceUsage = nil
		item.LastServiceDate = nil
	}

	item.UpdatedAt = time.Now()
	h.repos.Maintenance.Update(r.Context(), itemID, item)
}
