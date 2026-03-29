# Vehicle Maintenance Tracker — Product Specification v1.0

> **Status:** Current production version (as-built)
> **Date:** 2026-03-29
> **Purpose:** Complete specification of existing functionality to serve as baseline for future development.

---

## 1. Product Overview

Vehicle Maintenance Tracker is a responsive web application for managing vehicle maintenance schedules across teams. Users authenticate via Google, organize vehicles into teams, define maintenance intervals (usage-based and/or time-based), log services and repairs, and receive visual status indicators when maintenance is due or overdue.

The application targets individuals and small groups (racing teams, fleet operators, families) who need to track maintenance across multiple vehicles with shared access.

### 1.1 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 (SPA), React Router 7, React Bootstrap 2 |
| UI Framework | Bootstrap 5, custom minimalist CSS design system |
| Backend / Database | Firebase (Firestore NoSQL) |
| Authentication | Firebase Auth — Google Sign-In only |
| Hosting | Firebase Hosting (dev + prod environments) |
| Build | Vite 7 |
| Testing | Vitest (unit/integration), Playwright (E2E) |
| Security | DOMPurify for input sanitization |

---

## 2. Architecture

### 2.1 Application Structure

```
app/
├── src/
│   ├── App.jsx                    # Router + layout shell
│   ├── main.jsx                   # Entry point
│   ├── contexts/
│   │   └── AuthContext.jsx         # Firebase Auth state provider
│   ├── components/
│   │   ├── auth/                   # Login, ProtectedRoute
│   │   ├── common/                 # NavigationBar
│   │   ├── dashboard/              # Dashboard (fleet overview)
│   │   ├── maintenance/            # Maintenance item + service modals
│   │   ├── teams/                  # Team management (CRUD, export/import)
│   │   └── vehicles/               # Vehicle list, detail, modals
│   ├── services/firebase/          # Firestore service layer
│   ├── utils/                      # Status calculations, stats helpers
│   └── styles/                     # CSS design system
├── e2e/                            # Playwright E2E tests
├── firestore.rules                 # Firestore security rules
├── firestore.indexes.json          # Composite indexes
└── firebase.json                   # Firebase project config
```

### 2.2 Route Map

| Route | Component | Auth Required | Description |
|-------|-----------|:---:|-------------|
| `/` | — | — | Redirects to `/dashboard` |
| `/login` | `Login` | No | Google Sign-In page |
| `/dashboard` | `Dashboard` | Yes | Fleet overview with status cards |
| `/teams` | `TeamsPage` | Yes | Team management |
| `/vehicles` | `VehiclesPage` | Yes | Vehicle list + detail view |
| `/vehicles?vehicleId=<id>` | `VehiclesPage` → `VehicleDetail` | Yes | Specific vehicle detail |

All authenticated routes are wrapped in `ProtectedRoute` and lazy-loaded via `React.lazy` for code splitting.

---

## 3. Authentication & Authorization

### 3.1 Authentication

- **Provider:** Google Sign-In (popup flow) via Firebase Auth.
- **Session:** Managed by Firebase Auth SDK (`onAuthStateChanged`); persists across page refreshes.
- **Auth Context:** React context (`AuthContext`) exposes `user`, `loading`, `error`, `signInWithGoogle()`, `signOut()`.
- **Unauthenticated users** are redirected to `/login`.

### 3.2 Authorization Model

All authorization is enforced at the Firestore security rules level:

| Resource | Read | Create | Update | Delete |
|----------|------|--------|--------|--------|
| **Users** (`users/{uid}`) | Own document only | Own document only | Own document only | Own document only |
| **Teams** (`teams/{teamId}`) | Team members | Any authenticated user (as owner) | Team owner only | Team owner only |
| **Vehicles** (`vehicles/{vehicleId}`) | Team members | Team members | Team members | Team members |
| **Maintenance Items** (`maintenance_items/{itemId}`) | Team members (via vehicle lookup) | Team members (via vehicle lookup) | Team members (via vehicle lookup) | Team members (via vehicle lookup) |
| **Service History** (`service_history/{historyId}`) | Team members (via vehicle lookup) | Team members; `type` must be `'service'` or `'repair'` | Team members | Team members |
| **Usage History** (`usage_history/{historyId}`) | Team members (via vehicle lookup) | Team members; `created_by` must match auth UID; `version` must be 1; full field validation | Team members; `vehicle_id` and `created_by` immutable; `version` must increment by 1 | Team members |

**Key constraints:**
- Team owner cannot be changed after creation.
- Team owner must always remain in `member_ids`.
- Usage history entries have server-side validation: usage ≥ 0, < 10,000,000; dates cannot be in the future; text fields ≤ 500 chars.

---

## 4. Data Model

### 4.1 Firestore Collections

> **Note:** The actual implementation uses top-level collections (not subcollections) with `team_id` / `vehicle_id` foreign keys and composite indexes for queries.

#### `users/{uid}`
| Field | Type | Required | Description |
|-------|------|:---:|-------------|
| `email` | string | Yes | User email |
| `display_name` | string | Yes | Display name from Google |
| `team_ids` | array\<string\> | Yes | IDs of teams user belongs to |
| `created_at` | timestamp | Yes | Account creation time |

#### `teams/{teamId}`
| Field | Type | Required | Description |
|-------|------|:---:|-------------|
| `name` | string | Yes | Team display name |
| `owner_id` | string | Yes | UID of team creator |
| `member_ids` | array\<string\> | Yes | UIDs of all team members (includes owner) |
| `created_at` | timestamp | Yes | Creation time |
| `updated_at` | timestamp | Yes | Last modification time |

#### `vehicles/{vehicleId}`
| Field | Type | Required | Description |
|-------|------|:---:|-------------|
| `name` | string | Yes | Display name |
| `type` | enum | Yes | `'car'`, `'motorcycle'`, `'bicycle'`, or `'other'` |
| `usage_unit` | enum | Yes | `'km'` or `'hours'` (cars must use `'km'`) |
| `current_usage` | number | Yes | Current odometer/hour meter reading (default: 0) |
| `team_id` | string | Yes | Foreign key to team |
| `make` | string | No | Manufacturer |
| `model` | string | No | Model name |
| `year` | number | No | Year of manufacture |
| `vin` | string | No | Vehicle Identification Number |
| `nickname` | string | No | User-defined nickname |
| `race_number` | number | No | Race number (not unique) |
| `created_at` | timestamp | Yes | Creation time |
| `updated_at` | timestamp | Yes | Last modification time |

#### `maintenance_items/{itemId}`
| Field | Type | Required | Description |
|-------|------|:---:|-------------|
| `name` | string | Yes | Task name (e.g., "Oil Change") |
| `vehicle_id` | string | Yes | Foreign key to vehicle |
| `usage_interval` | number | No | Usage-based interval (e.g., 5000 km) |
| `time_interval_days` | number | No | Time-based interval in days |
| `last_service_usage` | number | Nullable | Usage at last service |
| `last_service_date` | timestamp | Nullable | Date of last service |
| `created_at` | timestamp | Yes | Creation time |
| `updated_at` | timestamp | Yes | Last modification time |

#### `service_history/{historyId}`
| Field | Type | Required | Description |
|-------|------|:---:|-------------|
| `type` | enum | Yes | `'service'` (scheduled) or `'repair'` (ad-hoc) |
| `vehicle_id` | string | Yes | Foreign key to vehicle |
| `maintenance_item_id` | string | Nullable | Foreign key to maintenance item (null for repairs) |
| `item_name` | string | Yes | Name of service/repair |
| `service_date` | timestamp | Yes | When service was performed |
| `service_usage` | number | Nullable | Usage reading at time of service (null for repairs) |
| `cost` | number | Nullable | Cost of service/repair |
| `provider` | string | Nullable | Service provider name |
| `created_at` | timestamp | Yes | When entry was logged |

#### `usage_history/{entryId}`
| Field | Type | Required | Description |
|-------|------|:---:|-------------|
| `vehicle_id` | string | Yes | Foreign key to vehicle |
| `usage` | number | Yes | Usage reading |
| `date` | timestamp | Yes | Date of reading |
| `usage_type` | string | Nullable | Type (e.g., "track day") |
| `location` | string | Nullable | Location of reading |
| `created_by` | string | Yes | UID of creator |
| `created_at` | timestamp | Yes | Creation time |
| `updated_at` | timestamp | Nullable | Last update time |
| `updated_by` | string | Nullable | UID of last updater |
| `version` | integer | Yes | Optimistic locking version (starts at 1) |

---

## 5. Core Business Logic

### 5.1 Maintenance Status Calculation

Each maintenance item has up to two intervals. **Whichever interval is closest to due determines the status.**

#### 5.1.1 Usage-Based Status

```
usage_since_service = current_usage - (last_service_usage || 0)
percentage = usage_since_service / usage_interval
```

#### 5.1.2 Time-Based Status

```
days_since_service = (now - last_service_date) / (1 day)
percentage = days_since_service / time_interval_days
```

If `last_service_date` is null, epoch (1970-01-01) is used, making the item immediately overdue.

#### 5.1.3 Status Thresholds

The system uses dynamic warning thresholds based on interval size:

| Interval Size | Warning Threshold | Overdue Threshold |
|---------------|:-:|:-:|
| **Large** (>1,500 km / >20 hours / >30 days) | 90% consumed (10% remaining) | 110% consumed (10% past due) |
| **Small** (≤1,500 km / ≤20 hours / ≤30 days) | 80% consumed (20% remaining) | 110% consumed (10% past due) |

#### 5.1.4 Status Labels

| Status | Condition | Visual |
|--------|-----------|--------|
| **OK** | percentage < warning threshold | Green badge |
| **Due Soon** | warning threshold ≤ percentage < 100% | Blue/yellow badge |
| **Due** | 100% ≤ percentage < 110% | Orange/warning badge |
| **Overdue** | percentage ≥ 110% | Red badge |

#### 5.1.5 Vehicle-Level Status

A vehicle's overall status is the **worst** status across all its maintenance items:
- If any item is **Overdue** → vehicle is Overdue
- Else if any item is **Due Soon** → vehicle is Due Soon
- Else → vehicle is OK

### 5.2 Service Logging

When a scheduled service is logged:

1. A `service_history` entry is created with `type: 'service'`.
2. The linked `maintenance_item` is updated with `last_service_usage` and `last_service_date` from the logged entry.
3. This resets the countdown for that maintenance item.

**Historical entry protection:** When a service history entry is edited or deleted, the system recalculates the maintenance item's `last_service_usage` and `last_service_date` based on the most recent remaining entry. If no entries remain, the fields are set to null.

### 5.3 Repair Logging

Repairs are ad-hoc entries that:
- Create a `service_history` entry with `type: 'repair'` and `maintenance_item_id: null`.
- Do **not** affect any maintenance item's schedule.
- Track description, date, cost, and provider.

### 5.4 Usage Tracking

When a usage update is logged:

1. A `usage_history` entry is created with validation (non-negative, < 10M, date not future).
2. If the new usage > vehicle's `current_usage`, the vehicle's `current_usage` is updated.
3. **Conflict detection:** If the new usage is higher than current but there are later-dated entries with lower values (impossible odometer scenario), the system returns conflict info for the UI to resolve.
4. **Optimistic locking:** Usage history entries use a `version` field; updates must increment by exactly 1.

When a usage history entry is deleted, `current_usage` is recalculated as the highest remaining entry's value (or 0 if none remain).

### 5.5 Vehicle History Reset

Vehicles can have their history completely reset:
- Deletes all `service_history` entries for the vehicle.
- Deletes all `usage_history` entries for the vehicle.
- Resets `current_usage` to 0.
- **Option to keep maintenance items** (default: yes) — if kept, their `last_serviced_date` and `last_serviced_usage` are set to null.

---

## 6. Feature Specifications

### 6.1 Dashboard

**Purpose:** Fleet-level overview showing all vehicles in the active team with at-a-glance status.

**Behavior:**
- Loads all teams the user belongs to.
- Persists selected team in `localStorage` (`selectedTeamId`).
- Team selector dropdown includes a "+ Create New Team" option.
- For each vehicle, loads all maintenance items and calculates aggregate status.
- Vehicles are sorted by status priority: Overdue → Due Soon → OK.

**Filters:**
- All Vehicles (with count)
- Overdue (with count)
- Due Soon (with count)
- Good Standing (with count)

**Vehicle Cards display:**
- Vehicle name, make, and model
- Status badge (Overdue / Due Soon / OK)
- Current usage with unit
- Next service due: item name + remaining distance/time
- Clicking a card navigates to `/vehicles?vehicleId=<id>`

**Empty states:**
- No teams: prompt to create a team
- No vehicles: prompt to add a vehicle

### 6.2 Team Management

**Purpose:** Create and manage teams that own vehicles.

**Features:**
- **Create Team:** Name input; creator becomes owner and first member.
- **Edit Team:** Rename team (owner only via security rules).
- **Add Members:** Add users by email to the team.
- **Remove Members:** Remove users from the team.
- **Active Team Indicator:** Shows which team is currently selected; syncs with localStorage.

### 6.3 Team Data Export/Import

**Export:**
- Exports all vehicles for a team as a versioned JSON file (`version: '1.0'`).
- Includes: vehicle data, maintenance items, service history, usage history.
- Timestamps are converted to ISO strings for portability.
- Downloaded as `team-export-{teamId}-{date}.json`.

**Import modes:**
| Mode | Vehicles | Maintenance Items | Service History | Usage History |
|------|:---:|:---:|:---:|:---:|
| `full` | Yes | Yes | Yes | Yes |
| `vehicle-maintenance` | Yes | Yes | Yes | No |
| `vehicle-maintenance-items` | Yes | Yes | No | No |
| `vehicle-only` | Yes | No | No | No |

**Import options:**
- **Overwrite existing:** If a vehicle with the same VIN already exists in the target team, delete it and all its data, then re-import. If disabled, matching VINs are skipped.

**Validation:** Import data is validated for required fields, valid enums (`type`, `unit`), and car/km constraint before import begins.

### 6.4 Vehicle Management

**Purpose:** CRUD operations for vehicles within a team.

**Create Vehicle:**
- Required: name, type, make, model, year
- Optional: VIN, race number, nickname, initial usage
- Unit auto-set to `'km'` for cars; selectable for motorcycles

**Edit Vehicle:**
- All fields editable post-creation (accessible via settings gear dropdown)

**Vehicle Detail View:**
- **Hero section:** Vehicle name, year/make/model, current mileage, next service due, days in service, total maintenance cost (last 12 months)
- **Maintenance Schedule:** List of all maintenance items with progress bars, status badges, remaining usage/time, and per-item "Log Service" + "Edit" buttons
- **Service History:** Chronological timeline showing service and repair entries with date, icon (📋 service / 🔧 repair), item name, provider, usage, cost; each entry is editable
- **Action buttons:** Log Service, Log Repair, Log Usage, Settings (Edit Vehicle, Reset History)

### 6.5 Maintenance Item Management

**Create Maintenance Item:**
- Required: name
- Optional: usage interval, time interval (days), last service usage, last service date

**Edit Maintenance Item:**
- All fields editable

**Delete Maintenance Item:**
- Removes the item (service history entries remain as orphaned records)

**Display:**
- Item name + interval description ("Every X km or Every Y days")
- Status badge (OK / Due Soon / Due / Overdue)
- Progress bar showing percentage consumed (capped at 100% visually)
- Last service usage or "Never serviced"
- Remaining usage/time text

### 6.6 Service Logging

**Log Scheduled Service:**
- Select maintenance item (or invoke from a specific item)
- Input: service date, usage at service, cost (optional), provider (optional)
- Updates the maintenance item's `last_service_usage` and `last_service_date`

**Log Repair:**
- Input: description, date, cost (optional), provider (optional)
- Creates a `service_history` entry with `type: 'repair'`
- Does not affect maintenance schedules

**Edit Service/Repair:**
- All fields editable
- On edit: recalculates maintenance item's last service from all history entries
- On delete: recalculates or clears maintenance item's last service fields

### 6.7 Usage Logging

**Log Usage:**
- Input: usage reading, date, usage type (optional), location (optional)
- Validates: non-negative, < 10M, date not in future
- Updates vehicle `current_usage` if new reading is higher
- Detects and surfaces conflicts when historical entries would create impossible odometer sequences

**Edit Usage:**
- Uses optimistic locking (version field) to prevent concurrent modification
- Recalculates vehicle `current_usage` after edit

**Delete Usage:**
- Recalculates `current_usage` from remaining entries (highest value, or 0 if empty)

---

## 7. UI Design System

### 7.1 Layout

- **Desktop:** Full-width container with navigation bar at top
- **Mobile:** Responsive layout with hamburger menu
- **Design language:** Minimalist with custom CSS variables (`--gray-300`, `--gray-500`, `--gray-900`, `--radius-md`, etc.)

### 7.2 Component Library

Built on Bootstrap 5 via React Bootstrap with custom minimalist overrides:

- **Navigation:** Top navbar with brand, page links (Dashboard, Teams, Vehicles), user dropdown (Manage Teams, Sign Out)
- **Cards:** `.minimalist-vehicle-card` — clickable cards with hover effects
- **Badges:** `.minimalist-status-badge` with `status-overdue`, `status-due_soon`, `status-ok` variants
- **Progress bars:** `.minimalist-progress-bar` with status-colored fills
- **Filters:** `.minimalist-filter-btn` toggle buttons with active state
- **Modals:** React Bootstrap modals for all create/edit/log forms
- **Dropdowns:** Settings gear dropdown for vehicle actions
- **Empty states:** Centered icon + text with call-to-action button

### 7.3 Status Color Mapping

| Status | Badge Class | Visual Color |
|--------|------------|:---:|
| Overdue | `status-overdue` | Red |
| Due | `status-due` | Orange |
| Due Soon | `status-due_soon` | Yellow/Blue |
| OK | `status-ok` | Green |

---

## 8. Utility Modules

### 8.1 VIN Decoder (`utils/vinDecoder.js`)

Integrates with the **NHTSA Vehicle API** (`vpic.nhtsa.dot.gov`) to auto-populate vehicle details from a VIN.

- `decodeVIN(vin)` — Calls the NHTSA DecodeVin endpoint; returns make, model, year, type, body class, manufacturer, engine details, fuel type.
- `isValidVINFormat(vin)` — Validates 17-character format; rejects I, O, Q characters.
- `mapVehicleType(nhtsaType)` — Maps NHTSA vehicle types to app types: passenger/sedan/coupe → `'car'`, motorcycle/moped → `'motorcycle'`, truck/SUV/van → `'car'`, otherwise → `'other'`.

### 8.2 Input Sanitization (`utils/sanitize.js`)

Uses **DOMPurify** for XSS prevention:

- `sanitizeText(text)` — Strips all HTML tags, returns plain text only.
- `sanitizeHTML(html)` — Allows safe formatting tags (`b`, `i`, `em`, `strong`, `a`, `p`, `br`, `ul`, `ol`, `li`) with restricted attributes.

### 8.3 Client-Side Rate Limiter (`utils/rateLimiter.js`)

Singleton `RateLimiter` class for UI-level protection against rapid repeated operations:

- Configurable minimum interval between operations (default: 1,000 ms).
- Configurable maximum operations per 60-second window (default: 10).
- `useRateLimit(operationKey, options)` — React hook returning `checkLimit()`, `recordOperation()`, `clear()`.

**Note:** This is client-side only. The spec notes that production should add server-side rate limiting via Firebase App Check and Cloud Functions.

### 8.4 Error Handler (`utils/errorHandler.js`)

Prevents information disclosure by mapping internal errors to user-friendly messages:

- Maps Firebase Auth error codes (e.g., `auth/too-many-requests`) to safe messages.
- Maps Firestore error codes (e.g., `permission-denied`, `not-found`) to safe messages.
- Maps custom validation errors to appropriate messages.
- Falls back to generic context-aware messages (`"Unable to create resource. Please try again."`).
- `logError(error, context)` — Logs full details in development; minimal info in production.
- `handleError(error, context)` — Combined log + sanitize convenience function.

### 8.5 Calculations (`utils/calculations.js`)

Original calculation module with simpler 10% threshold logic:

- `calculateRemainingUsage(lastServicedUsage, interval, currentUsage)` — Returns remaining usage; -1 if never serviced.
- `calculateRemainingTime(lastServicedDate, intervalMonths, currentDate)` — Returns remaining months; -1 if never serviced.
- `getServiceStatus(remaining, interval)` — Returns `'overdue'` / `'warning'` / `'good'` using flat 10% threshold.
- `getMaintenanceItemStatus(item, currentUsage, currentDate)` — Combines both intervals; worst status wins.
- `getStatusColor(status)` — Maps to Bootstrap variants (`danger`, `warning`, `success`).

**Note:** The dashboard and vehicle detail views use the more advanced `maintenanceStatus.js` module (Section 5.1) with dynamic thresholds. This module appears to be the original implementation retained for backward compatibility.

### 8.6 Vehicle Stats (`utils/vehicleStats.js`)

Display-oriented utility functions:

- `calculateDaysInService(createdAt)` — Days since vehicle creation.
- `formatDate(timestamp)` — Formats as "Jan 2024".
- `formatTimelineDate(timestamp)` — Returns `{ day, monthYear }` for service history timeline.
- `calculateTotalCost(serviceHistory, months)` — Sums costs from service entries within the last N months.
- `calculateNextServiceDue(maintenanceItems, currentUsage, usageUnit)` — Finds the maintenance item with the highest percentage consumed; returns name and remaining distance/time.

---

## 9. Security

### 8.1 Client-Side

- **Input sanitization:** DOMPurify for user-provided text content
- **Input validation:** All service layer functions validate IDs (format, length, path traversal), usage values (type, range, NaN/Infinity), dates (valid Date object, not future, not before 1900), and text (type, length ≤ 500 chars)
- **NoSQL injection prevention:** Vehicle IDs and history IDs validated against path traversal (`/`, `..`)
- **Protected routes:** `ProtectedRoute` component redirects unauthenticated users

### 8.2 Server-Side (Firestore Rules)

- All reads/writes require authentication
- Team membership verified for all vehicle/maintenance/service/usage operations
- Team updates restricted to owner with structural validation
- Usage history has comprehensive field-level validation in security rules
- Service history entries must have valid `type` enum
- Optimistic locking enforced: version must increment by exactly 1 on updates
- `created_by` and `vehicle_id` are immutable on usage history updates

---

## 10. Deployment

### 10.1 Environments

| Environment | Firebase Project | Build Command |
|-------------|-----------------|---------------|
| Development | `-P dev` | `npm run build:dev` |
| Production | `-P prod` | `npm run build:prod` |

### 10.2 Deployment Commands

```bash
# Dev: run tests, build, deploy hosting only
npm run deploy:dev

# Dev: run tests, build, deploy everything (hosting + rules)
npm run deploy:dev:all

# Prod: run tests, build, deploy hosting only
npm run deploy:prod

# Deploy Firestore rules only
npm run deploy:dev:rules
npm run deploy:prod:rules
```

### 10.3 Testing

| Type | Tool | Command |
|------|------|---------|
| Unit / Integration | Vitest + Testing Library + happy-dom | `npm test` |
| E2E | Playwright | `npm run test:e2e` |
| All | Combined | `npm run test:all` |
| Coverage | Vitest | `npm run test:coverage` |

### 10.4 Development Utilities

- **Firebase emulators:** `npm run emulators`
- **Database reset (dev):** `npm run reset-db-dev`
- **Database seed (dev):** `npm run seed-db-dev`

---

## 11. Known Constraints & Limitations

1. **No push notifications.** Users must open the app to check status.
2. **No image uploads.** Text notes only for service records.
3. **No inventory tracking.** Parts and supplies are not tracked.
4. **Google-only authentication.** No email/password or other OAuth providers.
5. **Equal team member permissions.** All members can CRUD all vehicles/items in the team. Owner role is reserved for future differentiated permissions (currently only enforced on team-level CRUD).
6. **No vehicle archival.** Vehicles are deleted, not archived.
7. **Client-side sorting.** Queries avoid composite indexes where possible by sorting in the client.
8. **Race number is not unique.** Multiple vehicles may share the same race number.
9. **Cars must use `km`.** Motorcycles, bicycles, and other types can choose between `km` and `hours`.
10. **No offline support.** Requires network connectivity for all operations.

---

## 12. Data Validation Rules Summary

| Field | Rule |
|-------|------|
| Usage value | Number, ≥ 0, < 10,000,000, not NaN/Infinity |
| Date | Valid Date, not in future, not before 1900 |
| Text fields (usage_type, location, provider) | String or null, ≤ 500 characters, trimmed |
| Vehicle ID / History ID | Non-empty string, ≤ 1,500 chars, no `/` or `..` |
| User ID | Non-empty string, ≤ 128 chars |
| Vehicle type | `'car'`, `'motorcycle'`, `'bicycle'`, or `'other'` |
| Vehicle unit | `'km'` or `'hours'`; `'car'` type enforces `'km'` |
| Service history type | `'service'` or `'repair'` |
| Usage history version | Integer, ≥ 1, < 1,000,000; must increment by 1 on update |

---

## 13. Future Considerations (Out of Scope)

These items are referenced in the codebase or PRD as future work:

- Push/email notifications when maintenance is due
- Differentiated owner vs. member permissions within teams
- Vehicle archival (soft delete) instead of hard delete
- Additional vehicle types (truck, boat, etc.)
- Cost tracking dashboards and reporting
- Image/receipt uploads attached to service entries
- Offline-first with Firebase offline persistence
- Bulk operations (service multiple items at once)
