# Vehicle Maintenance Tracker V2 - Architecture Specification

**Version:** 2.0
**Date:** 2026-03-29
**Status:** New build - replaces V1 web application (preserved on `original` branch)
**Functional Spec:** See `PRODUCT_SPEC_V1.md` (all features carry forward)

---

## 1. System Overview

A cross-platform mobile application backed by a portable REST API for tracking vehicle maintenance intervals across teams. Users manage vehicles, track usage, define maintenance schedules, and receive visual status indicators when service is due.

### 1.1 High-Level Architecture

```
┌──────────────────────┐
│   Flutter Mobile App  │
│   (iOS + Android)     │
│                       │
│  ┌─────────────────┐  │       ┌───────────────────────────┐
│  │ Local DB (Isar) │  │       │       Go REST API          │
│  │ Offline Queue   │──sync───▶│                             │
│  └─────────────────┘  │       │  ┌───────────────────────┐  │
│                       │       │  │  Service Layer         │  │
│  Firebase Auth SDK    │       │  │  (Business Logic)      │  │
│  (Google Sign-In)     │       │  └───────────┬───────────┘  │
└──────────┬────────────┘       │              │              │
           │                    │  ┌───────────▼───────────┐  │
           │  JWT Token         │  │  Repository Interface  │  │
           └───────────────────▶│  └───────────┬───────────┘  │
                                │              │              │
                                │  ┌───────────▼───────────┐  │
                                │  │  DB Adapter            │  │
                                │  │  (Mongo/Firestore/     │  │
                                │  │   Dynamo/Postgres)     │  │
                                │  └───────────────────────┘  │
                                │                             │
                                │  Firebase Admin SDK         │
                                │  (JWT validation only)      │
                                └───────────────────────────┘
```

### 1.2 Technology Choices

| Layer | Technology | Rationale |
|---|---|---|
| Mobile App | Flutter (Dart) | Cross-platform iOS/Android, rich widget toolkit, strong offline support |
| Local DB | Isar | Fast embedded NoSQL for Flutter, supports offline queue |
| API | Go | Single binary, fast cold starts (Lambda-friendly), compiles for any OS |
| API Style | REST (JSON) | Simple, well-understood, easy to test with curl |
| Auth | Firebase Auth | Google Sign-In with JWT tokens; backend validates only, no Firestore dependency |
| Database | Swappable via repository pattern | Start with MongoDB (Docker), swap to Firestore/DynamoDB/PostgreSQL via config |
| Dev Hosting | Docker Compose | Go API + MongoDB locally; deploy anywhere later |

---

## 2. Backend API (`/api`)

### 2.1 Project Structure

```
api/
├── cmd/
│   └── server/
│       └── main.go              # Entry point, wires dependencies
├── internal/
│   ├── auth/
│   │   └── firebase.go          # Firebase JWT validation
│   ├── config/
│   │   └── config.go            # Environment-based configuration
│   ├── handler/
│   │   ├── handler.go           # Router setup, shared helpers
│   │   ├── team.go              # Team endpoints
│   │   ├── vehicle.go           # Vehicle endpoints
│   │   ├── maintenance.go       # Maintenance item endpoints
│   │   ├── service_history.go   # Service/repair log endpoints
│   │   └── usage.go             # Usage tracking endpoints
│   ├── middleware/
│   │   ├── auth.go              # JWT auth middleware
│   │   ├── logging.go           # Request logging
│   │   └── ratelimit.go         # Rate limiting
│   ├── model/
│   │   ├── team.go              # Team domain model
│   │   ├── vehicle.go           # Vehicle domain model
│   │   ├── maintenance.go       # Maintenance item model
│   │   ├── service_history.go   # Service/repair history model
│   │   └── usage.go             # Usage history model
│   ├── repository/
│   │   ├── interfaces.go        # All repository interfaces
│   │   └── mongo/               # MongoDB implementation
│   │       ├── mongo.go         # Connection + shared helpers
│   │       ├── team.go
│   │       ├── vehicle.go
│   │       ├── maintenance.go
│   │       ├── service_history.go
│   │       └── usage.go
│   └── service/
│       ├── team.go              # Team business logic
│       ├── vehicle.go           # Vehicle business logic
│       ├── maintenance.go       # Status calculation, scheduling logic
│       ├── service_history.go   # Service logging with conditional updates
│       └── usage.go             # Usage logging with conflict detection
├── Dockerfile
├── docker-compose.yml
├── go.mod
└── go.sum
```

### 2.2 REST API Endpoints

All endpoints require `Authorization: Bearer <firebase-jwt>` except health check.

#### Health

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check (no auth) |

#### Teams

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/teams` | Create team |
| GET | `/api/v1/teams` | List user's teams |
| GET | `/api/v1/teams/:id` | Get team by ID |
| PUT | `/api/v1/teams/:id` | Update team (owner only) |
| DELETE | `/api/v1/teams/:id` | Delete team (owner only) |
| POST | `/api/v1/teams/:id/members` | Add member to team |
| DELETE | `/api/v1/teams/:id/members/:userId` | Remove member from team |

#### Vehicles

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/teams/:teamId/vehicles` | Create vehicle |
| GET | `/api/v1/teams/:teamId/vehicles` | List team vehicles |
| GET | `/api/v1/vehicles/:id` | Get vehicle by ID |
| PUT | `/api/v1/vehicles/:id` | Update vehicle |
| DELETE | `/api/v1/vehicles/:id` | Delete vehicle + cascade |
| POST | `/api/v1/vehicles/:id/reset` | Reset vehicle history |

#### Maintenance Items

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/vehicles/:vehicleId/maintenance` | Create maintenance item |
| GET | `/api/v1/vehicles/:vehicleId/maintenance` | List items with calculated status |
| GET | `/api/v1/maintenance/:id` | Get item by ID |
| PUT | `/api/v1/maintenance/:id` | Update item |
| DELETE | `/api/v1/maintenance/:id` | Delete item |

#### Service History

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/vehicles/:vehicleId/services` | Log service for maintenance item |
| POST | `/api/v1/vehicles/:vehicleId/repairs` | Log ad-hoc repair |
| GET | `/api/v1/vehicles/:vehicleId/history` | Get all service + repair history |
| PUT | `/api/v1/history/:id` | Update history entry |
| DELETE | `/api/v1/history/:id` | Delete history entry |

#### Usage

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/vehicles/:vehicleId/usage` | Log usage reading |
| GET | `/api/v1/vehicles/:vehicleId/usage` | Get usage history |
| PUT | `/api/v1/usage/:id` | Update usage entry |
| DELETE | `/api/v1/usage/:id` | Delete usage entry |
| POST | `/api/v1/vehicles/:vehicleId/usage/resolve-conflict` | Resolve usage conflict |

#### Export / Import

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/teams/:teamId/export` | Export team data as JSON |
| POST | `/api/v1/teams/:teamId/import` | Import team data from JSON |

#### VIN Decode

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/vin/:vin` | Decode VIN via NHTSA API |

### 2.3 Repository Pattern (Portability Layer)

The repository interfaces define all data operations. Implementations are swapped via configuration.

```go
// Swap implementations via environment variable:
//   DB_DRIVER=mongo    → MongoRepository
//   DB_DRIVER=firestore → FirestoreRepository
//   DB_DRIVER=dynamo   → DynamoRepository
```

Each repository implementation lives in its own sub-package under `internal/repository/`.

#### Adding a New Database Backend

1. Create `internal/repository/<driver>/` directory
2. Implement all interfaces from `interfaces.go`
3. Add initialization in `cmd/server/main.go` switch statement
4. Set `DB_DRIVER=<driver>` in environment

### 2.4 Authentication Flow

```
Mobile App                    Go API                     Firebase Auth
    │                           │                             │
    ├── signInWithGoogle() ────▶│                             │
    │                           │                             │
    │◀── Firebase ID Token ─────┤                             │
    │                           │                             │
    ├── API request ───────────▶│                             │
    │   Authorization: Bearer   │                             │
    │   <firebase-id-token>     │── Verify token ────────────▶│
    │                           │◀── Decoded claims ──────────┤
    │                           │                             │
    │                           │── Extract UID, check ──────▶│
    │                           │   team membership           │
    │◀── JSON response ────────┤                             │
```

### 2.5 Business Logic (Service Layer)

All business logic from V1 carries forward. Key algorithms:

**Maintenance Status Calculation:**
- Dual-interval: usage-based AND time-based, whichever comes first
- Dynamic thresholds: small intervals warn earlier (80%) vs large intervals (90%)
- Four statuses: OK, Due Soon, Due, Overdue

**Service Logging:**
- Only updates maintenance item's `last_service_*` if new service date >= current
- Always creates history entry regardless
- Repairs don't affect maintenance schedule

**Usage Conflict Detection:**
- Detects impossible scenarios (new reading higher but dated before a lower reading)
- Returns conflict info for mobile app to prompt user resolution

---

## 3. Mobile App (`/mobile`)

### 3.1 Flutter Project Structure

```
mobile/
├── lib/
│   ├── main.dart                  # App entry point
│   ├── app.dart                   # MaterialApp, routing, theme
│   ├── config/
│   │   ├── api_config.dart        # API base URL, timeouts
│   │   └── theme.dart             # App theme (colors, typography)
│   ├── models/                    # Dart data classes (mirrors API models)
│   │   ├── team.dart
│   │   ├── vehicle.dart
│   │   ├── maintenance_item.dart
│   │   ├── service_history.dart
│   │   └── usage_history.dart
│   ├── services/
│   │   ├── api_client.dart        # HTTP client with auth headers
│   │   ├── auth_service.dart      # Firebase Auth (Google Sign-In)
│   │   ├── sync_service.dart      # Offline queue sync
│   │   └── local_db.dart          # Isar local database
│   ├── providers/                 # State management (Riverpod or Provider)
│   │   ├── auth_provider.dart
│   │   ├── team_provider.dart
│   │   ├── vehicle_provider.dart
│   │   └── maintenance_provider.dart
│   ├── screens/
│   │   ├── login_screen.dart
│   │   ├── dashboard_screen.dart
│   │   ├── teams/
│   │   │   ├── teams_screen.dart
│   │   │   └── team_detail_screen.dart
│   │   ├── vehicles/
│   │   │   ├── vehicles_screen.dart
│   │   │   ├── vehicle_detail_screen.dart
│   │   │   └── add_vehicle_screen.dart
│   │   └── maintenance/
│   │       ├── maintenance_list.dart
│   │       ├── log_service_screen.dart
│   │       └── log_usage_screen.dart
│   └── widgets/                   # Reusable UI components
│       ├── status_badge.dart
│       ├── vehicle_card.dart
│       ├── maintenance_item_card.dart
│       ├── service_history_tile.dart
│       └── usage_conflict_dialog.dart
├── test/                          # Unit and widget tests
├── pubspec.yaml
└── analysis_options.yaml
```

### 3.2 Offline Support

**Strategy: Queue and Sync**

1. All write operations (log usage, log service, create vehicle, etc.) are saved to local Isar DB immediately
2. Each queued operation is marked with a `syncStatus`: `pending`, `syncing`, `synced`, `failed`
3. `SyncService` runs on app startup and connectivity change:
   - Processes pending operations in order
   - Retries failed operations with exponential backoff
   - Handles conflict responses from API (e.g., usage conflicts)
4. Read operations hit local cache first, then API for fresh data
5. Pull-to-refresh forces API fetch and updates local cache

**Conflict Resolution:**
- Timestamps on all records; server is source of truth
- Usage conflicts surfaced to user via `UsageConflictDialog`
- Last-write-wins for non-critical fields; prompt user for critical conflicts

### 3.3 Navigation

```
Login Screen
    │
    ▼
Dashboard (default)
    ├── Team selector (dropdown)
    ├── Vehicle cards grid (filterable: All / Overdue / Due Soon / Good)
    │   └── Tap card → Vehicle Detail
    │
    ├── Bottom Nav: Dashboard | Vehicles | Teams | Profile
    │
    ▼
Vehicle Detail
    ├── Hero: name, make/model/year, current usage, days in service
    ├── Quick actions: Log Service, Log Repair, Log Usage
    ├── Maintenance items list (with status badges + progress bars)
    │   └── Tap item → Log Service / Edit Item
    ├── Service history timeline
    └── Settings gear → Edit Vehicle, Reset History

Teams Screen
    ├── Team list
    ├── Create team
    ├── Edit team
    └── Export / Import

Profile Screen
    ├── User info (from Google)
    ├── Active team indicator
    └── Sign out
```

### 3.4 Design Language

The mobile app uses a **new design** distinct from the V1 web app:

- **Material 3** design system via Flutter's built-in widgets
- **Color scheme:** Generated from a seed color via `ColorScheme.fromSeed()`
- **Status colors:** Red (overdue), Amber (due soon), Green (ok) — same semantics, new palette
- **Typography:** Material 3 type scale
- **Dark mode:** Supported from day one
- **Animations:** Hero transitions between vehicle list and detail, shimmer loading states
- **Platform-adaptive:** Follows iOS conventions on iOS, Material on Android

---

## 4. Data Model

Same logical schema as V1 (see `PRODUCT_SPEC_V1.md` Section 4). Collections map to:

| V1 Firestore Collection | V2 Equivalent |
|---|---|
| `users` | `users` |
| `teams` | `teams` |
| `vehicles` | `vehicles` |
| `maintenance_items` | `maintenance_items` |
| `service_history` | `service_history` |
| `usage_history` | `usage_history` |

All fields, types, and constraints remain identical. The repository pattern abstracts the storage backend.

### 4.1 Model Additions for V2

| Field | Collection | Purpose |
|---|---|---|
| `sync_id` | all | Client-generated UUID for offline sync deduplication |
| `updated_at` | all | ISO 8601 timestamp (server-set), used for sync ordering |

---

## 5. Deployment Portability

### 5.1 Docker (Default for Development)

```yaml
# docker-compose.yml
services:
  api:
    build: ./api
    ports: ["8080:8080"]
    environment:
      DB_DRIVER: mongo
      MONGO_URI: mongodb://mongo:27017/vmt
      FIREBASE_PROJECT_ID: maintainer-dev
    depends_on: [mongo]
  mongo:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: [mongo_data:/data/db]
```

### 5.2 AWS Lambda + DynamoDB

```
DB_DRIVER=dynamo
AWS_REGION=us-east-1
DYNAMO_TABLE_PREFIX=vmt_
```

- Compile Go with `GOOS=linux GOARCH=amd64`
- Deploy via Serverless Framework or AWS SAM
- Swap repository to `internal/repository/dynamo/`

### 5.3 Firebase (Cloud Run + Firestore)

```
DB_DRIVER=firestore
GCP_PROJECT_ID=maintainer-85295
```

- Deploy Go container to Cloud Run
- Swap repository to `internal/repository/firestore/`
- Use existing Firebase Auth project

### 5.4 Vercel

```
DB_DRIVER=mongo  (or postgres via Vercel Postgres)
MONGO_URI=mongodb+srv://...
```

- Use Vercel's Go runtime for serverless functions
- Or deploy as a standalone container via Vercel

---

## 6. Configuration

All configuration via environment variables:

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `8080` | API server port |
| `DB_DRIVER` | Yes | `mongo` | Database backend: `mongo`, `firestore`, `dynamo` |
| `MONGO_URI` | If mongo | - | MongoDB connection string |
| `FIREBASE_PROJECT_ID` | Yes | - | Firebase project for JWT validation |
| `GOOGLE_APPLICATION_CREDENTIALS` | If firestore | - | GCP service account key path |
| `AWS_REGION` | If dynamo | - | AWS region for DynamoDB |
| `DYNAMO_TABLE_PREFIX` | If dynamo | `vmt_` | DynamoDB table name prefix |
| `LOG_LEVEL` | No | `info` | Logging level: `debug`, `info`, `warn`, `error` |
| `RATE_LIMIT_RPM` | No | `60` | Requests per minute per user |
| `CORS_ORIGINS` | No | `*` | Allowed CORS origins |

---

## 7. Testing Strategy

| Layer | Tool | Scope |
|---|---|---|
| Go unit tests | `go test` | Service layer, status calculations, validators |
| Go integration tests | `go test` + testcontainers | Repository implementations against real DB |
| API tests | `go test` + httptest | Handler layer with mocked services |
| Flutter unit tests | `flutter test` | Models, providers, services |
| Flutter widget tests | `flutter test` | Screen rendering, interactions |
| Flutter integration | `flutter test integration_test` | Full app flows on emulator |

---

## 8. Migration from V1

- **Data:** Export from V1 web app (existing export feature) → import via V2 API `/import` endpoint
- **Auth:** Same Firebase project, same Google accounts — users keep their identity
- **No dual-run required:** V1 web app preserved on `original` branch; V2 is a clean rebuild
