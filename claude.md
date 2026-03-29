# Vehicle Maintenance Tracker V2 - Project Context

## Overview

A cross-platform **mobile app** (Flutter) backed by a **Go REST API** for tracking vehicle maintenance intervals across teams. Users manage vehicles, track usage (km/hours), define maintenance schedules, and receive visual status indicators when service is due.

**V1 (web app)** is preserved on the `original` branch. This is a clean rebuild with the same functionality but different architecture and design.

**Key Documents:**
- `PRODUCT_SPEC_V1.md` — Full functional specification (all features carry forward)
- `docs/ARCHITECTURE_V2.md` — V2 architecture, API endpoints, data flow

## Tech Stack

| Layer | Technology |
|---|---|
| **Mobile App** | Flutter (Dart), Material 3, Isar (offline DB) |
| **API Backend** | Go, chi router, REST (JSON) |
| **Database** | Swappable via repository pattern (MongoDB default, Firestore/DynamoDB planned) |
| **Auth** | Firebase Auth (Google Sign-In only), JWT token validation |
| **Dev Environment** | Docker Compose (Go API + MongoDB) |

## Project Structure

```
/api                          # Go REST API
  /cmd/server/main.go         # Entry point
  /internal/
    /auth/                    # Firebase JWT validation
    /config/                  # Environment-based config
    /handler/                 # HTTP handlers (one file per resource)
    /middleware/               # Auth, logging, rate limiting
    /model/                   # Domain models + request/response types
    /repository/
      /interfaces.go          # All repository interfaces (portability layer)
      /mongo/                 # MongoDB implementation
    /service/                 # Business logic (TODO)
  /Dockerfile
  /docker-compose.yml

/mobile                       # Flutter mobile app (to be created)
  /lib/
    /models/                  # Dart data classes (mirrors Go models)
    /services/                # API client, auth, offline sync
    /providers/               # State management
    /screens/                 # UI screens
    /widgets/                 # Reusable components

/app                          # V1 web app (legacy, see `original` branch)
/docs/                        # Architecture docs
/tasks/                       # Original PRD
```

## Core Business Logic

All business logic from V1 carries forward. Key algorithms are implemented in the Go service layer.

### Status Calculation
Maintenance items have TWO intervals — whichever comes first determines status:
1. **Usage Interval:** `(last_service_usage + usage_interval) - current_usage`
2. **Time Interval:** `(last_service_date + time_interval_days) - current_date`

**Status Levels:**
- **Overdue (Red):** percentage >= 110% of interval
- **Due:** percentage >= 100% and < 110%
- **Due Soon (Yellow):** percentage >= threshold (80-90% depending on interval size)
- **OK (Green):** percentage < threshold

**Dynamic Thresholds:**
- Small intervals (km <= 1500, hours <= 20, days <= 30): warn at 80%
- Large intervals: warn at 90%

### Critical Rules

**Service Logging:**
- Only update `last_service_usage` and `last_service_date` if the logged service date >= current last_service_date
- Always create a service_history entry regardless
- Repairs (`type: "repair"`) don't affect maintenance schedule

**Usage Updates:**
- Update BOTH `vehicle.current_usage` AND create `usage_history` entry
- Only update current_usage if new reading is higher
- Detect conflicts when entries are out of chronological order
- Optimistic locking via `version` field on usage history

**Never-Serviced Items:**
- `last_service_usage` and `last_service_date` are nullable
- If null, treat as overdue (usage defaults to 0, date defaults to epoch)

## Repository Pattern (Database Portability)

The API uses Go interfaces to abstract database operations. To add a new database backend:

1. Create `api/internal/repository/<driver>/` directory
2. Implement all interfaces from `repository/interfaces.go`
3. Add initialization in `cmd/server/main.go` switch on `DB_DRIVER`
4. Set `DB_DRIVER=<driver>` environment variable

**Current:** `mongo` (MongoDB)
**Planned:** `firestore`, `dynamo`

## Enums & Constants

**Vehicle Types:**
```go
"car" | "motorcycle" | "bicycle" | "other"
```

**Usage Units:**
```go
"km" | "hours"
// Constraint: Cars must use "km"
```

## Key Validation Rules
1. Cars MUST use `usage_unit: "km"`
2. At least one interval required (usage_interval OR time_interval_days)
3. `race_number` is optional and NOT unique
4. Team members have equal permissions (owner role reserved for future use)
5. Usage values: 0 to 10,000,000
6. Dates: cannot be in the future, not before 1900
7. Text fields: max 500 characters

## API Endpoints

All endpoints require `Authorization: Bearer <firebase-jwt>` except `GET /health`.
Full endpoint list in `docs/ARCHITECTURE_V2.md` Section 2.2.

Key patterns:
- Teams: `/api/v1/teams/...`
- Vehicles: `/api/v1/teams/:teamId/vehicles` (create/list) and `/api/v1/vehicles/:id` (get/update/delete)
- Maintenance: `/api/v1/vehicles/:vehicleId/maintenance`
- Service history: `/api/v1/vehicles/:vehicleId/services` and `/api/v1/vehicles/:vehicleId/repairs`
- Usage: `/api/v1/vehicles/:vehicleId/usage`
- Export/Import: `/api/v1/teams/:teamId/export` and `/api/v1/teams/:teamId/import`
- VIN decode: `/api/v1/vin/:vin` (proxies NHTSA API)

## Development

### Running Locally

```bash
# Start API + MongoDB
cd api
cp .env.example .env  # Set FIREBASE_PROJECT_ID
docker compose up

# API available at http://localhost:8080
# Health check: curl http://localhost:8080/health
```

### Testing

**Go API:**
```bash
cd api
go test ./...                    # Unit tests
go test -tags=integration ./...  # Integration tests (needs Docker)
```

**Flutter App:**
```bash
cd mobile
flutter test                     # Unit + widget tests
flutter test integration_test    # Integration tests
```

### Test Requirements
- **Tests are MANDATORY for every feature**
- Write failing tests first, then implement
- Cover happy path, error cases, edge cases, validation
- Go: use `testing` package + `httptest` for handlers
- Flutter: use `flutter_test` for unit + widget tests
- Mock repository interfaces for service layer tests

## Security
- Validate all inputs at the handler layer (OWASP top 10)
- Firebase JWT validation on every authenticated request
- Team membership checked before data access
- Rate limiting per user (configurable RPM)
- Error messages sanitized — no internal details leaked

## Common Pitfalls to Avoid
1. Don't update maintenance schedule when logging historical services (check date!)
2. Don't forget to update BOTH current_usage and usage_history
3. Don't apply warning threshold to absolute values — use percentage of interval
4. Don't enforce race_number uniqueness
5. Don't couple business logic to a specific database — use repository interfaces
6. Don't skip the `version` field on usage history updates (optimistic locking)
