package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"github.com/go-chi/chi/v5"
)

var vinRegex = regexp.MustCompile(`^[A-HJ-NPR-Z0-9]{17}$`)

// DecodeVIN calls the NHTSA API to decode a VIN.
func (h *Handler) DecodeVIN(w http.ResponseWriter, r *http.Request) {
	vin := strings.ToUpper(chi.URLParam(r, "vin"))

	if !vinRegex.MatchString(vin) {
		writeError(w, fmt.Errorf("invalid VIN format: must be 17 alphanumeric characters, no I/O/Q"))
		return
	}

	resp, err := http.Get(fmt.Sprintf("https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/%s?format=json", vin))
	if err != nil {
		writeError(w, fmt.Errorf("failed to call NHTSA API: %w", err))
		return
	}
	defer resp.Body.Close()

	var nhtsaResp struct {
		Results []struct {
			Variable string `json:"Variable"`
			Value    string `json:"Value"`
		} `json:"Results"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&nhtsaResp); err != nil {
		writeError(w, fmt.Errorf("failed to decode NHTSA response: %w", err))
		return
	}

	getValue := func(name string) string {
		for _, r := range nhtsaResp.Results {
			if r.Variable == name {
				return r.Value
			}
		}
		return ""
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"make":  getValue("Make"),
		"model": getValue("Model"),
		"year":  getValue("Model Year"),
		"type":  mapNHTSAType(getValue("Vehicle Type")),
	})
}

func mapNHTSAType(nhtsaType string) string {
	t := strings.ToLower(nhtsaType)
	switch {
	case strings.Contains(t, "passenger"), strings.Contains(t, "car"),
		strings.Contains(t, "truck"), strings.Contains(t, "suv"), strings.Contains(t, "van"):
		return "car"
	case strings.Contains(t, "motorcycle"), strings.Contains(t, "moped"):
		return "motorcycle"
	default:
		return "other"
	}
}
