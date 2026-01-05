# Database Management Scripts

This directory contains scripts for managing the Firebase database.

## Prerequisites

To use these scripts, you need a Firebase service account key file.

### How to Get a Service Account Key

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project (maintainer-dev for development)
3. Go to **Project Settings** (gear icon) > **Service Accounts**
4. Click **Generate New Private Key**
5. Save the downloaded JSON file as `service-account-dev.json` in the project root directory

**IMPORTANT:** Never commit the service account key to version control! It contains sensitive credentials.

## Available Scripts

### Reset Database (`reset-db.js`)

Deletes all documents from the development database.

**Collections affected:**
- teams
- vehicles
- maintenance_items
- service_history
- users

**Usage:**
```bash
npm run reset-db-dev
```

**Authentication:**
The script looks for credentials in this order:
1. `GOOGLE_APPLICATION_CREDENTIALS` environment variable
2. `service-account-dev.json` file in the project root

**Safety:**
- Includes confirmation prompt (you must type "DELETE ALL DATA")
- Shows progress as it deletes documents
- Only works with the development database (maintainer-dev)

**Example:**
```bash
$ npm run reset-db-dev

🔥 Firebase Development Database Reset Tool

Project: maintainer-dev
Collections to reset: teams, vehicles, maintenance_items, service_history, users

⚠️  WARNING: This will delete ALL data from the development database!
⚠️  This action CANNOT be undone!

Type "DELETE ALL DATA" to confirm: DELETE ALL DATA

🗑️  Starting database reset...

  Deleting teams... ✅ Deleted 3 document(s)
  Deleting vehicles... ✅ Deleted 15 document(s)
  Deleting maintenance_items... ✅ Deleted 42 document(s)
  Deleting service_history... ✅ Deleted 128 document(s)
  Deleting users... ✅ Deleted 5 document(s)

✅ Database reset complete!
```

### Seed Database (`seed-db.js`)

Populates the development database with sample data for testing.

**Creates:**
- 2 teams (Racing Team Alpha, Personal Vehicles)
- 4 vehicles (race car, race motorcycle, daily car, lawn tractor)
- 9 maintenance items across all vehicles
- 13 service history entries with realistic data

**Usage:**
```bash
npm run seed-db-dev
```

**Authentication:**
Same as reset-db.js - uses service account credentials.

**Example:**
```bash
$ npm run seed-db-dev

🌱 Firebase Development Database Seed Tool

Project: maintainer-dev

Creating teams...
  ✅ Created team: Racing Team Alpha (abc123)
  ✅ Created team: Personal Vehicles (def456)

Creating vehicles...
  ✅ Created vehicle: Race Car #42 (ghi789)
  ✅ Created vehicle: Race Bike #7 (jkl012)
  ✅ Created vehicle: Daily Driver (mno345)
  ✅ Created vehicle: John Deere Tractor (pqr678)

Creating maintenance items...
  ✅ Created: Oil Change for Race Car #42
  ...

Creating service history...
  ✅ Created 4 service history entries for Race Car #42
  ...

✅ Database seeded successfully!

Summary:
  - 2 teams
  - 4 vehicles
  - 9 maintenance items
  - 13 service history entries
```

**Common Workflow:**
```bash
# Reset and seed the database
npm run reset-db-dev && npm run seed-db-dev
```

## Project Structure

```
maintainer-cc/app/
├── scripts/
│   ├── README.md          # This file
│   ├── reset-db.js        # Database reset script
│   └── seed-db.js         # Database seed script
├── service-account-dev.json  # Service account key (gitignored)
└── package.json
```
