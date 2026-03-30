package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/auth"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/handler"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/middleware"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/model"
	"github.com/sherzing/vehicle-maintenance-tracker/api/internal/repository/mock"
)

// testRouter creates a chi router with team routes and a fake auth middleware
// that injects the given userID as claims.
func testRouter(h *handler.Handler, userID string) chi.Router {
	r := chi.NewRouter()

	// Inject fake claims instead of real auth middleware
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := &auth.Claims{UID: userID}
			ctx := context.WithValue(r.Context(), middleware.UserClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	})

	r.Post("/teams", h.CreateTeam)
	r.Get("/teams", h.ListTeams)
	r.Get("/teams/{teamId}", h.GetTeam)
	r.Put("/teams/{teamId}", h.UpdateTeam)
	r.Delete("/teams/{teamId}", h.DeleteTeam)
	r.Post("/teams/{teamId}/members", h.AddTeamMember)
	r.Delete("/teams/{teamId}/members/{userId}", h.RemoveTeamMember)

	return r
}

func jsonBody(v any) *bytes.Buffer {
	buf := new(bytes.Buffer)
	json.NewEncoder(buf).Encode(v)
	return buf
}

func TestCreateTeam(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := testRouter(h, "user-1")

	body := jsonBody(model.CreateTeamRequest{Name: "My Fleet"})
	req := httptest.NewRequest("POST", "/teams", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var team model.Team
	json.NewDecoder(w.Body).Decode(&team)

	if team.Name != "My Fleet" {
		t.Errorf("expected name 'My Fleet', got %q", team.Name)
	}
	if team.OwnerID != "user-1" {
		t.Errorf("expected owner 'user-1', got %q", team.OwnerID)
	}
	if len(team.MemberIDs) != 1 || team.MemberIDs[0] != "user-1" {
		t.Errorf("expected member_ids ['user-1'], got %v", team.MemberIDs)
	}
	if team.ID == "" {
		t.Error("expected non-empty ID")
	}
}

func TestCreateTeam_EmptyName(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := testRouter(h, "user-1")

	body := jsonBody(model.CreateTeamRequest{Name: ""})
	req := httptest.NewRequest("POST", "/teams", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestListTeams(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := testRouter(h, "user-1")

	// Create two teams
	for _, name := range []string{"Fleet A", "Fleet B"} {
		body := jsonBody(model.CreateTeamRequest{Name: name})
		req := httptest.NewRequest("POST", "/teams", body)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusCreated {
			t.Fatalf("setup failed: %d %s", w.Code, w.Body.String())
		}
	}

	// List
	req := httptest.NewRequest("GET", "/teams", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var teams []*model.Team
	json.NewDecoder(w.Body).Decode(&teams)
	if len(teams) != 2 {
		t.Errorf("expected 2 teams, got %d", len(teams))
	}
}

func TestListTeams_OnlyShowsUserTeams(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)

	// User-1 creates a team
	r1 := testRouter(h, "user-1")
	body := jsonBody(model.CreateTeamRequest{Name: "User1 Fleet"})
	req := httptest.NewRequest("POST", "/teams", body)
	w := httptest.NewRecorder()
	r1.ServeHTTP(w, req)

	// User-2 lists teams — should see 0
	r2 := testRouter(h, "user-2")
	req = httptest.NewRequest("GET", "/teams", nil)
	w = httptest.NewRecorder()
	r2.ServeHTTP(w, req)

	var teams []*model.Team
	json.NewDecoder(w.Body).Decode(&teams)
	if len(teams) != 0 {
		t.Errorf("expected 0 teams for user-2, got %d", len(teams))
	}
}

func TestGetTeam(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := testRouter(h, "user-1")

	// Create
	body := jsonBody(model.CreateTeamRequest{Name: "My Fleet"})
	req := httptest.NewRequest("POST", "/teams", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var created model.Team
	json.NewDecoder(w.Body).Decode(&created)

	// Get
	req = httptest.NewRequest("GET", "/teams/"+created.ID, nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var team model.Team
	json.NewDecoder(w.Body).Decode(&team)
	if team.ID != created.ID {
		t.Errorf("expected ID %q, got %q", created.ID, team.ID)
	}
}

func TestGetTeam_NotFound(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := testRouter(h, "user-1")

	req := httptest.NewRequest("GET", "/teams/nonexistent", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

func TestUpdateTeam(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := testRouter(h, "user-1")

	// Create
	body := jsonBody(model.CreateTeamRequest{Name: "Old Name"})
	req := httptest.NewRequest("POST", "/teams", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var created model.Team
	json.NewDecoder(w.Body).Decode(&created)

	// Update
	body = jsonBody(model.UpdateTeamRequest{Name: "New Name"})
	req = httptest.NewRequest("PUT", "/teams/"+created.ID, body)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var updated model.Team
	json.NewDecoder(w.Body).Decode(&updated)
	if updated.Name != "New Name" {
		t.Errorf("expected name 'New Name', got %q", updated.Name)
	}
}

func TestUpdateTeam_NonOwnerForbidden(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)

	// User-1 creates team
	r1 := testRouter(h, "user-1")
	body := jsonBody(model.CreateTeamRequest{Name: "Fleet"})
	req := httptest.NewRequest("POST", "/teams", body)
	w := httptest.NewRecorder()
	r1.ServeHTTP(w, req)
	var created model.Team
	json.NewDecoder(w.Body).Decode(&created)

	// User-2 tries to update — should be forbidden
	r2 := testRouter(h, "user-2")
	body = jsonBody(model.UpdateTeamRequest{Name: "Hacked"})
	req = httptest.NewRequest("PUT", "/teams/"+created.ID, body)
	w = httptest.NewRecorder()
	r2.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

func TestDeleteTeam(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := testRouter(h, "user-1")

	// Create
	body := jsonBody(model.CreateTeamRequest{Name: "Fleet"})
	req := httptest.NewRequest("POST", "/teams", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var created model.Team
	json.NewDecoder(w.Body).Decode(&created)

	// Delete
	req = httptest.NewRequest("DELETE", "/teams/"+created.ID, nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d: %s", w.Code, w.Body.String())
	}

	// Verify gone
	req = httptest.NewRequest("GET", "/teams/"+created.ID, nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 after delete, got %d", w.Code)
	}
}

func TestDeleteTeam_NonOwnerForbidden(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)

	// User-1 creates team
	r1 := testRouter(h, "user-1")
	body := jsonBody(model.CreateTeamRequest{Name: "Fleet"})
	req := httptest.NewRequest("POST", "/teams", body)
	w := httptest.NewRecorder()
	r1.ServeHTTP(w, req)
	var created model.Team
	json.NewDecoder(w.Body).Decode(&created)

	// User-2 tries to delete
	r2 := testRouter(h, "user-2")
	req = httptest.NewRequest("DELETE", "/teams/"+created.ID, nil)
	w = httptest.NewRecorder()
	r2.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

func TestAddTeamMember(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := testRouter(h, "user-1")

	// Create team
	body := jsonBody(model.CreateTeamRequest{Name: "Fleet"})
	req := httptest.NewRequest("POST", "/teams", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var created model.Team
	json.NewDecoder(w.Body).Decode(&created)

	// Add member
	body = jsonBody(model.AddMemberRequest{UserID: "user-2"})
	req = httptest.NewRequest("POST", "/teams/"+created.ID+"/members", body)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d: %s", w.Code, w.Body.String())
	}

	// Verify user-2 can now see the team
	r2 := testRouter(h, "user-2")
	req = httptest.NewRequest("GET", "/teams", nil)
	w = httptest.NewRecorder()
	r2.ServeHTTP(w, req)

	var teams []*model.Team
	json.NewDecoder(w.Body).Decode(&teams)
	if len(teams) != 1 {
		t.Errorf("expected user-2 to see 1 team, got %d", len(teams))
	}
}

func TestRemoveTeamMember(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := testRouter(h, "user-1")

	// Create team
	body := jsonBody(model.CreateTeamRequest{Name: "Fleet"})
	req := httptest.NewRequest("POST", "/teams", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var created model.Team
	json.NewDecoder(w.Body).Decode(&created)

	// Add user-2
	body = jsonBody(model.AddMemberRequest{UserID: "user-2"})
	req = httptest.NewRequest("POST", "/teams/"+created.ID+"/members", body)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Remove user-2
	req = httptest.NewRequest("DELETE", "/teams/"+created.ID+"/members/user-2", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d: %s", w.Code, w.Body.String())
	}

	// Verify user-2 no longer sees the team
	r2 := testRouter(h, "user-2")
	req = httptest.NewRequest("GET", "/teams", nil)
	w = httptest.NewRecorder()
	r2.ServeHTTP(w, req)

	var teams []*model.Team
	json.NewDecoder(w.Body).Decode(&teams)
	if len(teams) != 0 {
		t.Errorf("expected user-2 to see 0 teams after removal, got %d", len(teams))
	}
}

func TestRemoveTeamMember_CannotRemoveOwner(t *testing.T) {
	repos := mock.NewRepositories()
	h := handler.New(repos, nil)
	r := testRouter(h, "user-1")

	// Create team
	body := jsonBody(model.CreateTeamRequest{Name: "Fleet"})
	req := httptest.NewRequest("POST", "/teams", body)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var created model.Team
	json.NewDecoder(w.Body).Decode(&created)

	// Try to remove owner
	req = httptest.NewRequest("DELETE", "/teams/"+created.ID+"/members/user-1", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}
