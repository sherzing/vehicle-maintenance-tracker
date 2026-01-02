# Vehicle Maintenance Tracker - Project Context

## Overview
A responsive web application for tracking vehicle maintenance intervals across teams. Users can manage cars and motorcycles, track usage (km/hours), define maintenance schedules, and receive visual warnings when service is due.

**Key Features:**
- Team-based vehicle management with Google Authentication
- Dual-interval tracking (usage-based + time-based)
- Historical logging of services and usage updates
- Smart status indicators (Red/Yellow/Green based on 10% threshold)
- Race number tracking for racing vehicles

**Full Specification:** See `tasks/prd-vehicle-maintenance-tracker.md`

## Tech Stack
- **Frontend:** React or Vue (SPA)
- **UI Framework:** Bootstrap/Tailwind CSS
- **Backend/DB:** Firebase (Firestore + Auth)
- **Hosting:** Firebase Hosting
- **Authentication:** Google Sign-In only

## Core Business Logic

### Status Calculation
Maintenance items have TWO intervals - whichever comes first determines status:
1. **Usage Interval:** `(last_serviced_usage + primary_interval) - current_usage`
2. **Time Interval:** `(last_serviced_date + secondary_interval_months) - current_date`

**Status Colors:**
- **Red (Overdue):** `remaining <= 0`
- **Yellow (Warning):** `remaining < 10% of interval`
  - Usage: `< (primary_interval * 0.10)`
  - Time: `< (secondary_interval * 0.10)` months
- **Green (Good):** `remaining >= 10% of interval`

### Critical Rules

**Service Logging:**
- Only update `last_serviced_usage` and `last_serviced_date` if the logged service date is >= current last_serviced_date
- This prevents historical entries from breaking the schedule
- Always create a service_history entry regardless

**Usage Updates:**
- Update BOTH `vehicle.current_usage` field AND create `usage_history` entry
- Dual storage for performance (quick access) and audit trail

**Never-Serviced Items:**
- `last_serviced_usage` and `last_serviced_date` are nullable
- If null, treat as overdue or use vehicle creation date as baseline

## Data Schema (Firestore)

### Collections Structure
```
users/{uid}
  - email, display_name, team_ids[], created_at

teams/{teamId}
  - name, owner_id, member_ids[], created_at, updated_at

  vehicles/{vehicleId}  [subcollection]
    - name, type, unit, current_usage, race_number
    - vin, make, model, year, nickname
    - team_id, created_at, updated_at

    usage_history/{entryId}  [subcollection]
      - timestamp, usage, updated_by

    maintenance_items/{itemId}  [subcollection]
      - name, primary_interval, secondary_interval
      - last_serviced_usage, last_serviced_date
      - created_at, updated_at

      service_history/{serviceId}  [subcollection]
        - service_date, usage_at_service, notes
        - logged_by, logged_at
```

## Enums & Constants

**Vehicle Types:**
```typescript
type VehicleType = 'car' | 'motorcycle'  // extensible
```

**Units:**
```typescript
type Unit = 'km' | 'hours'
// Constraint: Cars must use 'km'
```

**Warning Threshold:**
```typescript
const WARNING_THRESHOLD = 0.10  // 10%
```

## Key Validation Rules
1. Cars MUST use `unit: 'km'` (motorcycles can use 'km' or 'hours')
2. `primary_interval` is required, `secondary_interval` is optional
3. `race_number` is optional and NOT unique (multiple vehicles can have same number)
4. Team members have equal permissions (owner role reserved for future use)

## Development Notes

### Firestore Security Rules (TODO)
- Users can only read/write teams they're a member of (`uid in team.member_ids`)
- All vehicle operations must verify team membership
- Validate vehicle type/unit constraints in security rules

### UI Requirements
- Responsive: desktop (sidepane nav) + mobile (hamburger menu)
- Show race_number on vehicle cards when present
- Display both remaining usage AND remaining time
- Color-code maintenance items per status rules above

### Future Extensibility
- Vehicle type enum can be expanded (truck, boat, etc.)
- Team owner permissions can be added later
- Consider archiving vehicles instead of deletion

## Common Pitfalls to Avoid
1. Don't update maintenance schedule when logging historical services (check date!)
2. Don't forget to update BOTH current_usage field and usage_history
3. Don't apply 10% warning to absolute values - use percentage of interval
4. Don't enforce race_number uniqueness
5. Don't allow null/undefined for required fields (use Firestore validation)

## Quick Reference: File Structure (Suggested)
```
/src
  /components
    /auth          - Login, team management
    /vehicles      - Vehicle list, detail, forms
    /maintenance   - Maintenance item cards, service logging
    /dashboard     - Main dashboard with status overview
  /services
    /firebase      - Firestore queries, auth helpers
  /utils
    /calculations  - Status calculation logic
  /types           - TypeScript interfaces matching schema
```
