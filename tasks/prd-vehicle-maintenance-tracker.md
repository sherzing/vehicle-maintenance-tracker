# Product Requirements Document (PRD): Vehicle Maintenance Tracker

## 1. Introduction
This project aims to build a responsive web application that allows users to track maintenance intervals for their vehicles (cars and motorcycles). The application solves the problem of forgetting critical service dates by tracking current usage (kilometers or hours) against defined maintenance schedules. It also serves as a historical log for past services and usage updates.

## 2. Goals
* **Prevent Missed Maintenance:** Accurately calculate and visually highlight when a vehicle requires service.
* **Support Multiple Vehicle Types:** Handle logic for Cars (distance-based) and Motorcycles (distance or time-based), with extensibility for additional vehicle types.
* **Historical Record:** Maintain a log of past services and usage updates.
* **Secure & Cloud-Based:** Use Google Authentication for user management and Google Firebase for data storage.

## 3. User Stories
* **Authentication**
    * As a User, I want to log in using my Google account so that my data is secure and accessible across devices.
    * As a User, I want to create a Team or be invited to a Team so I can share vehicle management with others.
* **Vehicle Management**
    * As a User, I want to add a new car or motorcycle to my team.
    * As a User, I want to add details to a vehicle, like VIN, main user, nickname, make, model, year, and race number (if applicable).
    * As a Team Member, I want to configure the measurement unit for my vehicle (Kilometers for cars; Kilometers or Hours for motorcycles).
* **Interval Management**
    * As a Team Member, I want to define specific maintenance tasks (e.g., "Oil Change") with a primary interval (e.g., "Every 10,000 km").
    * As a Team Member, I want to optionally specify the "Last Performed" usage and date when creating a new task (or leave blank for never-serviced items).
    * As a Team Member, I want to set a secondary time-based interval (e.g., "Every 6 months") so that I am notified even if I haven't reached the usage limit.
    * As a Team Member, I want to define multiple independent maintenance items for a single vehicle (e.g., Oil Change vs. Timing Belt).
* **Usage Tracking**
    * As a Team Member, I want to input the current usage (odometer reading or hour meter) of the vehicle.
    * As a Team Member, I want the system to keep a history of these usage updates.
* **Service Logging**
    * As a Team Member, I want to record when I complete a specific maintenance task.
    * As a Team Member, I want to edit or delete existing maintenance records.
    * As a Team Member, I want to record past maintenance tasks and the date when those happened.
    * As a Team Member, I want to add text notes to a service record (e.g., "Used 10W-40 Oil, also replaced filter") for future reference.
    * As a Team Member, I want the system to update the "remaining usage" calculation after I log a service, if it's the most recent service for that maintenance item.
* **Dashboard**
    * As a User, I want to see a visual highlight (e.g., Red or Yellow warning) if a service is due soon or overdue.
    * As a User, I want to see the current state for all my vehicles, highlighting the current usage and remaining usage and time until the next service.

## 4. Functional Requirements

### 4.1. Authentication
1.  The app must use **Google Firebase Authentication** (Google Sign-In provider).
2.  Users must be authenticated to view or edit any data.
3.  **Team Support:** Users can create "Teams" to group vehicles and members.
4.  **Team Ownership:** The user who creates a Team becomes the Team Owner. Future versions may add owner-specific permissions.
5.  **Access Control:** Vehicles belong to a Team. All Team Members can view/edit that Team's vehicles.
6.  **Teams:** Store team details (Name, Owner ID, Members List).

### 4.2. Data Management (Firebase Firestore)
1.  **Vehicles:** Store vehicle details. Each Vehicle document must include:
    * `name` (String): Display name
    * `type` (Enum): One of `['car', 'motorcycle']` (extensible for future vehicle types)
    * `unit` (Enum): Either `'km'` or `'hours'` (enforced based on type: cars must use `'km'`)
    * `current_usage` (Number): Current odometer/hour meter reading
    * `race_number` (Number, optional): Race number for tracked racing vehicles (not unique)
    * `vin` (String, optional): Vehicle Identification Number
    * `make` (String, optional): Manufacturer
    * `model` (String, optional): Model name
    * `year` (Number, optional): Year of manufacture
    * `nickname` (String, optional): User-defined nickname
    * `team_id` (Reference): Link to parent Team
2.  **Maintenance Items:** Store tasks linked to a vehicle. Each Maintenance Item must include:
    * Must support a **Primary Interval** (Number, e.g., 5000).
    * Must support an optional **Secondary Interval** (Time in months, e.g., 6).
    * Must track the `last_serviced_usage` (Number, nullable) and `last_serviced_date` (Timestamp, nullable).
    * **Initialization:** Initial `last_serviced_usage` and `last_serviced_date` are **optional**. If not provided (never serviced), the system treats the item as "due immediately" or uses vehicle creation date as baseline.
3.  **Usage History:** Create a log entry (subcollection under Vehicle) every time the user updates the current usage. Each entry includes:
    * `timestamp` (Timestamp): When the update was made
    * `usage` (Number): New usage value
    * `updated_by` (User ID): Who made the update
    * Also updates the parent Vehicle's `current_usage` field.
4.  **Service History:** Create a log entry (subcollection under Maintenance Item) when a service is recorded. Each entry includes:
    * `service_date` (Timestamp): Date when service was performed
    * `usage_at_service` (Number): Usage value at time of service
    * `notes` (String, optional): Text notes
    * `logged_by` (User ID): Who logged the service
    * `logged_at` (Timestamp): When the entry was created

### 4.3. Logic & Calculations
1.  **Remaining Usage Calculation:**
    * Formula: `(Last Service Usage + Interval) - Current Usage`
    * If `last_serviced_usage` is null (never serviced), treat as 0 or set remaining to negative (overdue).
2.  **Remaining Time Calculation:**
    * Formula: `(Last Service Date + Time Interval in months) - Current Date`
    * If `last_serviced_date` is null (never serviced), use vehicle creation date or treat as overdue.
3.  **Status Determination:**
    * The system must compare both Remaining Usage and Remaining Time.
    * The status is determined by **whichever occurs first** (earliest due date/usage).
    * **Status Colors:**
        * **Red (Overdue):** `Remaining <= 0` (either usage or time)
        * **Yellow (Warning):** `Remaining < 10% of Interval`
            * For usage: `Remaining Usage < (Primary Interval * 0.10)`
            * For time: `Remaining Time < (Secondary Interval in months * 0.10)` (e.g., 6 months * 0.10 = 0.6 months = ~18 days)
        * **Green (Good):** `Remaining >= 10% of Interval`
4.  **Service Logging Effects:**
    * Creating a Service Log entry must **conditionally** update the linked Maintenance Item's `last_serviced_usage` and `last_serviced_date`.
    * **Update Rule:** Only update if the logged `service_date` is **greater than or equal to** the current `last_serviced_date` (i.e., it's the most recent service).
    * This prevents historical service entries from incorrectly resetting the maintenance schedule.

### 4.4. User Interface
1.  **Layout:** Use a responsive navigation structure (e.g., Sidepane on Desktop, Collapsible Drawer/Hamburger menu on Mobile).
2.  **Dashboard:** Display a list of vehicles after login. If no vehicles are available, show a message to add a vehicle.
3.  **Vehicle Detail View:** Show current usage, race number (if set), list of maintenance items, and their status.
    * **Visual Indicators:** (See section 4.3.3 for calculation details)
        * **Green:** Good (Service not near - remaining >= 10% of interval).
        * **Yellow:** Warning (Approaching limit - remaining < 10% of interval).
        * **Red:** Overdue (Limit exceeded - remaining <= 0).
4.  **Forms:**
    * Simple input forms for adding vehicles (including optional race number), adding maintenance items, and updating usage.
    * Maintenance item form should allow optional "Last Performed" date/usage for existing services, or leave blank for new items.
    * A "Complete Service" modal/form that asks for the date and optional notes.

## 5. Non-Goals (Out of Scope)
* **Push Notifications:** The app will not send emails or phone push notifications in this version. The user must open the app to check status.
* **Cost Tracking:** The app will not track prices of parts or labor costs.
* **Inventory:** The app will not track spare parts inventory.
* **Image Uploads:** Users cannot upload photos of receipts or vehicles (text notes only).

## 6. Design Considerations
* **Responsiveness:** The application must work well on desktop browsers and mobile devices (responsive web design).
* **UI Framework:** Use a common, modern UI library (e.g., Material UI, Ant Design, or Bootstrap) to ensure a clean look without custom CSS heavy-lifting.
* **Simplicity:** Prioritize a clean interface. Avoid clutter.

## 7. Technical Considerations
* **Stack:** Suggested stack for a junior developer:
    * **Frontend:** React, or Vue (Single Page Application). Use Bootstrap for Vite or Tailwind CSS Admin for UI layout
    * **Backend/DB:** Google Firebase (Firestore for NoSQL DB, Firebase Auth).
    * **Hosting:** Firebase Hosting.

### 7.1. Complete Firestore Data Schema

**Collection: `users`**
```
users/{uid}
  - email: string
  - display_name: string
  - team_ids: array<string>  // List of team IDs this user belongs to
  - created_at: timestamp
```

**Collection: `teams`**
```
teams/{teamId}
  - name: string
  - owner_id: string  // User ID of the team creator
  - member_ids: array<string>  // List of user IDs in this team
  - created_at: timestamp
  - updated_at: timestamp

  Subcollection: vehicles
  teams/{teamId}/vehicles/{vehicleId}
    - name: string
    - type: string (enum: 'car' | 'motorcycle')
    - unit: string (enum: 'km' | 'hours')
    - current_usage: number
    - race_number: number (optional)
    - vin: string (optional)
    - make: string (optional)
    - model: string (optional)
    - year: number (optional)
    - nickname: string (optional)
    - created_at: timestamp
    - updated_at: timestamp

    Subcollection: usage_history
    teams/{teamId}/vehicles/{vehicleId}/usage_history/{entryId}
      - timestamp: timestamp
      - usage: number
      - updated_by: string (user ID)

    Subcollection: maintenance_items
    teams/{teamId}/vehicles/{vehicleId}/maintenance_items/{itemId}
      - name: string  // e.g., "Oil Change"
      - primary_interval: number  // e.g., 5000
      - secondary_interval: number (optional)  // Time in months, e.g., 6
      - last_serviced_usage: number (nullable)
      - last_serviced_date: timestamp (nullable)
      - created_at: timestamp
      - updated_at: timestamp

      Subcollection: service_history
      teams/{teamId}/vehicles/{vehicleId}/maintenance_items/{itemId}/service_history/{serviceId}
        - service_date: timestamp
        - usage_at_service: number
        - notes: string (optional)
        - logged_by: string (user ID)
        - logged_at: timestamp
```

**Notes on Data Structure:**
- All vehicles are scoped under their team for proper access control
- Usage history is maintained at the vehicle level (all usage updates)
- Service history is maintained at the maintenance item level (specific to each task)
- The `current_usage` field on the vehicle document provides quick access without querying the usage_history subcollection
- Timestamps use Firebase server timestamps for consistency

## 8. Success Metrics
* Users can successfully create a vehicle and add a maintenance interval.
* The system accurately flags a vehicle as "Overdue" when the usage exceeds the defined interval.
* Data persists correctly after a page refresh (Firebase integration is working).

## 9. Open Questions
* Should we allow archiving vehicles if they are sold, or just deleting them? (Assumption: Delete is fine for MVP).
* Should Team Owners have special permissions (e.g., ability to remove members, delete team) in the MVP, or should all team members have equal permissions for now? (Current: All members equal, owner designation reserved for future use).
