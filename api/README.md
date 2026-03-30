# Vehicle Maintenance Tracker — API

Go REST API backend for the Vehicle Maintenance Tracker mobile app.

## Prerequisites

- Go 1.24+
- Docker and Docker Compose (for MongoDB)

## Quick Start (Local Development)

```bash
# 1. Start MongoDB
docker compose up -d mongo

# 2. Run the API with auth disabled for local dev
AUTH_DISABLED=true go run ./cmd/server

# 3. Verify it's running
curl http://localhost:8080/health
```

All requests run as `dev-user-1` when auth is disabled. No Google/Firebase credentials needed.

## Environment Variables

### Required (production)

| Variable | Description |
|----------|-------------|
| `FIREBASE_PROJECT_ID` | Firebase project ID for JWT verification. Not required when `AUTH_DISABLED=true`. |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port |
| `DB_DRIVER` | `mongo` | Storage backend: `mongo` or `s3` |
| `MONGO_URI` | `mongodb://localhost:27017/vmt` | MongoDB connection string (when `DB_DRIVER=mongo`) |
| `AUTH_DISABLED` | `false` | Set to `true` to skip Firebase JWT auth and inject a dev user. **Disabled by default — auth is always enforced unless explicitly opted out.** |
| `DEV_USER_ID` | `dev-user-1` | User ID injected when `AUTH_DISABLED=true` |
| `LOG_LEVEL` | `info` | Log verbosity |
| `RATE_LIMIT_RPM` | `60` | Max requests per minute per user |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |

### S3 Backend (`DB_DRIVER=s3`)

| Variable | Default | Description |
|----------|---------|-------------|
| `S3_BUCKET` | *(required)* | S3 bucket name |
| `S3_PREFIX` | `vmt/` | Key prefix for all objects |
| `AWS_REGION` | | AWS region for the S3 bucket |

The S3 backend stores each collection as a JSON file in S3. Designed for Lambda deployments where the mobile app caches locally and syncs in the background.

### Firestore Backend (`DB_DRIVER=firestore`)

| Variable | Default | Description |
|----------|---------|-------------|
| `FIREBASE_PROJECT_ID` | *(required)* | Firebase/GCP project ID |
| `FIRESTORE_TOKEN` | | OAuth2 access token. If empty, use Application Default Credentials (`gcloud auth application-default login`). |

Uses the Firestore REST API directly — no GCP SDK needed. Each collection maps to a Firestore collection (teams, vehicles, maintenance_items, service_history, usage_history). Ideal if you already have a Firebase project from the V1 web app.

## Running Tests

```bash
# Run all tests
go test ./... -v

# Run only handler tests (all API endpoint tests)
go test ./internal/handler/ -v

# Run only S3 repository tests
go test ./internal/repository/s3/ -v

# Run only Firestore repository tests
go test ./internal/repository/firestore/ -v

# Run a specific test
go test ./internal/handler/ -v -run TestCreateTeam
```

Tests use in-memory mock repositories — no database or AWS credentials needed.

## Example API Calls

With `AUTH_DISABLED=true` and the server running:

```bash
# Create a team
curl -X POST http://localhost:8080/api/v1/teams \
  -H "Content-Type: application/json" \
  -d '{"name": "My Fleet"}'

# List your teams
curl http://localhost:8080/api/v1/teams

# Create a vehicle (replace TEAM_ID with the id from create team response)
curl -X POST http://localhost:8080/api/v1/teams/TEAM_ID/vehicles \
  -H "Content-Type: application/json" \
  -d '{"name": "Honda Civic", "type": "car", "usage_unit": "km", "current_usage": 50000}'

# List vehicles for a team
curl http://localhost:8080/api/v1/teams/TEAM_ID/vehicles

# Add a maintenance item (replace VEHICLE_ID)
curl -X POST http://localhost:8080/api/v1/vehicles/VEHICLE_ID/maintenance \
  -H "Content-Type: application/json" \
  -d '{"name": "Oil Change", "usage_interval": 5000}'

# List maintenance items with status
curl http://localhost:8080/api/v1/vehicles/VEHICLE_ID/maintenance

# Log usage
curl -X POST http://localhost:8080/api/v1/vehicles/VEHICLE_ID/usage \
  -H "Content-Type: application/json" \
  -d '{"usage": 55000, "date": "2025-03-30T10:00:00Z"}'

# Log a service
curl -X POST http://localhost:8080/api/v1/vehicles/VEHICLE_ID/services \
  -H "Content-Type: application/json" \
  -d '{"maintenance_item_id": "ITEM_ID", "service_usage": 55000, "service_date": "2025-03-30T10:00:00Z"}'

# Export all team data
curl http://localhost:8080/api/v1/teams/TEAM_ID/export
```

## Docker

```bash
# Run the full stack (API + MongoDB)
docker compose up

# Run just MongoDB (for local go run)
docker compose up -d mongo
```

## Project Structure

```
api/
├── cmd/server/          # Entry point
├── internal/
│   ├── auth/            # Firebase JWT verification (lightweight, no Admin SDK)
│   ├── config/          # Environment-based configuration
│   ├── handler/         # HTTP handlers + tests
│   ├── middleware/       # Auth, logging, rate limiting
│   ├── model/           # Data models, request/response types, errors
│   └── repository/      # Database portability layer
│       ├── interfaces.go  # Repository interfaces
│       ├── mock/          # In-memory (tests)
│       ├── mongo/         # MongoDB (Docker/self-hosted)
│       ├── s3/            # S3 JSON files (Lambda/serverless)
│       └── firestore/     # Firestore REST API (Firebase/GCP)
├── Dockerfile
├── docker-compose.yml
└── go.mod
```

## Storage Backends

The API uses a repository pattern — swap backends by changing `DB_DRIVER`:

| Driver | Use Case | Infra |
|--------|----------|-------|
| `mongo` | Local dev, Docker, self-hosted | MongoDB 7+ |
| `s3` | Serverless Lambda deployment | S3 bucket |
| `firestore` | Firebase/GCP deployment | Firestore database |
| `mock` | Unit tests only (in code) | None |
