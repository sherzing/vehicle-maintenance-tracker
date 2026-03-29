package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
)

func (h *Handler) CreateMaintenanceItem(w http.ResponseWriter, r *http.Request) {
	vehicleID := chi.URLParam(r, "vehicleId")

	var req model.CreateMaintenanceItemRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, model.ErrValidation("invalid request body"))
		return
	}
	if err := req.Validate(); err != nil {
		writeError(w, err)
		return
	}

	now := time.Now()
	item := &model.MaintenanceItem{
		VehicleID:        vehicleID,
		Name:             req.Name,
		UsageInterval:    req.UsageInterval,
		TimeIntervalDays: req.TimeIntervalDays,
		LastServiceUsage: req.LastServiceUsage,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	if req.LastServiceDate != nil {
		t, err := time.Parse(time.RFC3339, *req.LastServiceDate)
		if err != nil {
			writeError(w, model.ErrValidation("invalid last_service_date format, use ISO 8601"))
			return
		}
		item.LastServiceDate = &t
	}

	id, err := h.repos.Maintenance.Create(r.Context(), item)
	if err != nil {
		writeError(w, err)
		return
	}

	item.ID = id
	writeJSON(w, http.StatusCreated, item)
}

func (h *Handler) ListMaintenanceItems(w http.ResponseWriter, r *http.Request) {
	vehicleID := chi.URLParam(r, "vehicleId")
	items, err := h.repos.Maintenance.ListByVehicle(r.Context(), vehicleID)
	if err != nil {
		writeError(w, err)
		return
	}

	// Get vehicle to know current usage for status calculation
	vehicle, err := h.repos.Vehicles.GetByID(r.Context(), vehicleID)
	if err != nil {
		writeError(w, err)
		return
	}

	// Calculate status for each item
	result := make([]model.MaintenanceItemWithStatus, 0, len(items))
	for _, item := range items {
		withStatus := calculateMaintenanceStatus(item, vehicle.CurrentUsage)
		result = append(result, withStatus)
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) GetMaintenanceItem(w http.ResponseWriter, r *http.Request) {
	item, err := h.repos.Maintenance.GetByID(r.Context(), chi.URLParam(r, "itemId"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *Handler) UpdateMaintenanceItem(w http.ResponseWriter, r *http.Request) {
	itemID := chi.URLParam(r, "itemId")

	item, err := h.repos.Maintenance.GetByID(r.Context(), itemID)
	if err != nil {
		writeError(w, err)
		return
	}

	var req model.UpdateMaintenanceItemRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, model.ErrValidation("invalid request body"))
		return
	}

	if req.Name != nil {
		item.Name = *req.Name
	}
	if req.UsageInterval != nil {
		item.UsageInterval = req.UsageInterval
	}
	if req.TimeIntervalDays != nil {
		item.TimeIntervalDays = req.TimeIntervalDays
	}
	if req.LastServiceUsage != nil {
		item.LastServiceUsage = req.LastServiceUsage
	}
	if req.LastServiceDate != nil {
		t, err := time.Parse(time.RFC3339, *req.LastServiceDate)
		if err != nil {
			writeError(w, model.ErrValidation("invalid last_service_date format"))
			return
		}
		item.LastServiceDate = &t
	}

	item.UpdatedAt = time.Now()
	if err := h.repos.Maintenance.Update(r.Context(), itemID, item); err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, item)
}

func (h *Handler) DeleteMaintenanceItem(w http.ResponseWriter, r *http.Request) {
	itemID := chi.URLParam(r, "itemId")
	if err := h.repos.Maintenance.Delete(r.Context(), itemID); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// calculateMaintenanceStatus applies the V1 status algorithm.
func calculateMaintenanceStatus(item *model.MaintenanceItem, currentUsage float64) model.MaintenanceItemWithStatus {
	const (
		warningThresholdLarge = 0.9
		warningThresholdSmall = 0.8
		overdueThreshold      = 1.1
		smallIntervalKM       = 1500.0
		smallIntervalHours    = 20.0
		smallIntervalDays     = 30
	)

	result := model.MaintenanceItemWithStatus{
		MaintenanceItem: *item,
		Status:          model.StatusOK,
	}

	var usagePct, timePct float64

	// Usage-based status
	if item.UsageInterval != nil && *item.UsageInterval > 0 {
		lastUsage := 0.0
		if item.LastServiceUsage != nil {
			lastUsage = *item.LastServiceUsage
		}
		usageSince := currentUsage - lastUsage
		usagePct = usageSince / *item.UsageInterval
		remaining := *item.UsageInterval - usageSince
		if remaining < 0 {
			remaining = 0
		}
		result.UsageRemaining = &remaining
	}

	// Time-based status
	if item.TimeIntervalDays != nil && *item.TimeIntervalDays > 0 {
		lastDate := time.Time{}
		if item.LastServiceDate != nil {
			lastDate = *item.LastServiceDate
		}
		daysSince := time.Since(lastDate).Hours() / 24
		timePct = daysSince / float64(*item.TimeIntervalDays)
		remaining := float64(*item.TimeIntervalDays) - daysSince
		if remaining < 0 {
			remaining = 0
		}
		result.DaysRemaining = &remaining
	}

	// Determine overall status from highest percentage
	pct := usagePct
	reason := "usage"
	if timePct > usagePct {
		pct = timePct
		reason = "time"
	}
	result.Percentage = pct
	result.PrimaryReason = reason

	if pct >= overdueThreshold {
		result.Status = model.StatusOverdue
	} else if pct >= 1.0 {
		result.Status = model.StatusDue
	} else if pct >= warningThresholdLarge {
		result.Status = model.StatusDueSoon
	}

	return result
}
