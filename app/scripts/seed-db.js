#!/usr/bin/env node

/**
 * Database Seed Script for Development Environment
 *
 * This script populates the development Firestore database with sample data.
 * Useful after running reset-db.js to have test data to work with.
 *
 * Usage:
 *   npm run seed-db
 *
 * This will create:
 *   - 2 teams
 *   - 4 vehicles (2 per team)
 *   - Multiple maintenance items per vehicle
 *   - Sample service history entries
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const projectId = 'maintainer-dev';

console.log('\n🌱 Firebase Development Database Seed Tool\n');
console.log(`Project: ${projectId}\n`);

// Check for service account credentials
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  join(__dirname, '..', 'service-account-dev.json');

if (!existsSync(credentialsPath)) {
  console.error('❌ Error: Service account credentials not found.');
  console.error('See scripts/README.md for setup instructions.\n');
  process.exit(1);
}

// Initialize Firebase Admin with credentials
initializeApp({
  credential: cert(credentialsPath),
  projectId: projectId,
});

const db = getFirestore();

// Helper to create timestamps
function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return Timestamp.fromDate(date);
}

/**
 * Seed the database with sample data
 */
async function seedDatabase() {
  try {
    console.log('Creating teams...');

    // Create Team 1: Racing Team
    const team1Ref = await db.collection('teams').add({
      name: 'Racing Team Alpha',
      created_at: daysAgo(180),
      updated_at: daysAgo(180),
    });
    console.log(`  ✅ Created team: Racing Team Alpha (${team1Ref.id})`);

    // Create Team 2: Personal Vehicles
    const team2Ref = await db.collection('teams').add({
      name: 'Personal Vehicles',
      created_at: daysAgo(150),
      updated_at: daysAgo(150),
    });
    console.log(`  ✅ Created team: Personal Vehicles (${team2Ref.id})`);

    console.log('\nCreating vehicles...');

    // Team 1 - Vehicle 1: Race Car
    const vehicle1Ref = await db.collection('vehicles').add({
      team_id: team1Ref.id,
      name: 'Race Car #42',
      type: 'car',
      year: 2023,
      make: 'Honda',
      model: 'Civic Type R',
      race_number: '42',
      usage_unit: 'km',
      current_usage: 15750,
      created_at: daysAgo(180),
      updated_at: daysAgo(2),
    });
    console.log(`  ✅ Created vehicle: Race Car #42 (${vehicle1Ref.id})`);

    // Team 1 - Vehicle 2: Race Motorcycle
    const vehicle2Ref = await db.collection('vehicles').add({
      team_id: team1Ref.id,
      name: 'Race Bike #7',
      type: 'motorcycle',
      year: 2024,
      make: 'Yamaha',
      model: 'R6',
      race_number: '7',
      usage_unit: 'km',
      current_usage: 8200,
      created_at: daysAgo(120),
      updated_at: daysAgo(1),
    });
    console.log(`  ✅ Created vehicle: Race Bike #7 (${vehicle2Ref.id})`);

    // Team 2 - Vehicle 3: Daily Car
    const vehicle3Ref = await db.collection('vehicles').add({
      team_id: team2Ref.id,
      name: 'Daily Driver',
      type: 'car',
      year: 2020,
      make: 'Toyota',
      model: 'Camry',
      vin: '1HGBH41JXMN109186',
      usage_unit: 'km',
      current_usage: 82450,
      created_at: daysAgo(150),
      updated_at: daysAgo(3),
    });
    console.log(`  ✅ Created vehicle: Daily Driver (${vehicle3Ref.id})`);

    // Team 2 - Vehicle 4: Lawn Tractor
    const vehicle4Ref = await db.collection('vehicles').add({
      team_id: team2Ref.id,
      name: 'John Deere Tractor',
      type: 'other',
      year: 2019,
      make: 'John Deere',
      model: 'X380',
      usage_unit: 'hours',
      current_usage: 245.5,
      created_at: daysAgo(90),
      updated_at: daysAgo(7),
    });
    console.log(`  ✅ Created vehicle: John Deere Tractor (${vehicle4Ref.id})`);

    console.log('\nCreating maintenance items...');

    // Vehicle 1 maintenance items
    const item1Ref = await db.collection('maintenance_items').add({
      vehicle_id: vehicle1Ref.id,
      name: 'Oil Change',
      usage_interval: 5000,
      time_interval_days: 90,
      last_service_usage: 15000,
      last_service_date: daysAgo(30),
      created_at: daysAgo(180),
      updated_at: daysAgo(30),
    });
    console.log(`  ✅ Created: Oil Change for Race Car #42`);

    const item2Ref = await db.collection('maintenance_items').add({
      vehicle_id: vehicle1Ref.id,
      name: 'Brake Pads',
      usage_interval: 10000,
      time_interval_days: null,
      last_service_usage: 10000,
      last_service_date: daysAgo(90),
      created_at: daysAgo(180),
      updated_at: daysAgo(90),
    });
    console.log(`  ✅ Created: Brake Pads for Race Car #42`);

    const item3Ref = await db.collection('maintenance_items').add({
      vehicle_id: vehicle1Ref.id,
      name: 'Tire Rotation',
      usage_interval: 8000,
      time_interval_days: 180,
      last_service_usage: 12000,
      last_service_date: daysAgo(60),
      created_at: daysAgo(180),
      updated_at: daysAgo(60),
    });
    console.log(`  ✅ Created: Tire Rotation for Race Car #42`);

    // Vehicle 2 maintenance items
    const item4Ref = await db.collection('maintenance_items').add({
      vehicle_id: vehicle2Ref.id,
      name: 'Oil Change',
      usage_interval: 3000,
      time_interval_days: 60,
      last_service_usage: 6000,
      last_service_date: daysAgo(45),
      created_at: daysAgo(120),
      updated_at: daysAgo(45),
    });
    console.log(`  ✅ Created: Oil Change for Race Bike #7`);

    const item5Ref = await db.collection('maintenance_items').add({
      vehicle_id: vehicle2Ref.id,
      name: 'Chain & Sprockets',
      usage_interval: 5000,
      time_interval_days: null,
      last_service_usage: 5000,
      last_service_date: daysAgo(60),
      created_at: daysAgo(120),
      updated_at: daysAgo(60),
    });
    console.log(`  ✅ Created: Chain & Sprockets for Race Bike #7`);

    // Vehicle 3 maintenance items
    const item6Ref = await db.collection('maintenance_items').add({
      vehicle_id: vehicle3Ref.id,
      name: 'Oil Change',
      usage_interval: 8000,
      time_interval_days: 180,
      last_service_usage: 80000,
      last_service_date: daysAgo(15),
      created_at: daysAgo(150),
      updated_at: daysAgo(15),
    });
    console.log(`  ✅ Created: Oil Change for Daily Driver`);

    const item7Ref = await db.collection('maintenance_items').add({
      vehicle_id: vehicle3Ref.id,
      name: 'Air Filter',
      usage_interval: 20000,
      time_interval_days: 365,
      last_service_usage: 70000,
      last_service_date: daysAgo(180),
      created_at: daysAgo(150),
      updated_at: daysAgo(180),
    });
    console.log(`  ✅ Created: Air Filter for Daily Driver`);

    // Vehicle 4 maintenance items
    const item8Ref = await db.collection('maintenance_items').add({
      vehicle_id: vehicle4Ref.id,
      name: 'Oil Change',
      usage_interval: 50,
      time_interval_days: 365,
      last_service_usage: 200,
      last_service_date: daysAgo(90),
      created_at: daysAgo(90),
      updated_at: daysAgo(90),
    });
    console.log(`  ✅ Created: Oil Change for John Deere Tractor`);

    const item9Ref = await db.collection('maintenance_items').add({
      vehicle_id: vehicle4Ref.id,
      name: 'Blade Sharpening',
      usage_interval: 25,
      time_interval_days: null,
      last_service_usage: 225,
      last_service_date: daysAgo(30),
      created_at: daysAgo(90),
      updated_at: daysAgo(30),
    });
    console.log(`  ✅ Created: Blade Sharpening for John Deere Tractor`);

    console.log('\nCreating service history...');

    // Service history for vehicle 1
    await db.collection('service_history').add({
      maintenance_item_id: item1Ref.id,
      vehicle_id: vehicle1Ref.id,
      item_name: 'Oil Change',
      service_usage: 15000,
      service_date: daysAgo(30),
      created_at: daysAgo(30),
    });

    await db.collection('service_history').add({
      maintenance_item_id: item1Ref.id,
      vehicle_id: vehicle1Ref.id,
      item_name: 'Oil Change',
      service_usage: 10000,
      service_date: daysAgo(120),
      created_at: daysAgo(120),
    });

    await db.collection('service_history').add({
      maintenance_item_id: item2Ref.id,
      vehicle_id: vehicle1Ref.id,
      item_name: 'Brake Pads',
      service_usage: 10000,
      service_date: daysAgo(90),
      created_at: daysAgo(90),
    });

    await db.collection('service_history').add({
      maintenance_item_id: item3Ref.id,
      vehicle_id: vehicle1Ref.id,
      item_name: 'Tire Rotation',
      service_usage: 12000,
      service_date: daysAgo(60),
      created_at: daysAgo(60),
    });

    console.log(`  ✅ Created 4 service history entries for Race Car #42`);

    // Service history for vehicle 2
    await db.collection('service_history').add({
      maintenance_item_id: item4Ref.id,
      vehicle_id: vehicle2Ref.id,
      item_name: 'Oil Change',
      service_usage: 6000,
      service_date: daysAgo(45),
      created_at: daysAgo(45),
    });

    await db.collection('service_history').add({
      maintenance_item_id: item4Ref.id,
      vehicle_id: vehicle2Ref.id,
      item_name: 'Oil Change',
      service_usage: 3000,
      service_date: daysAgo(90),
      created_at: daysAgo(90),
    });

    await db.collection('service_history').add({
      maintenance_item_id: item5Ref.id,
      vehicle_id: vehicle2Ref.id,
      item_name: 'Chain & Sprockets',
      service_usage: 5000,
      service_date: daysAgo(60),
      created_at: daysAgo(60),
    });

    console.log(`  ✅ Created 3 service history entries for Race Bike #7`);

    // Service history for vehicle 3
    await db.collection('service_history').add({
      maintenance_item_id: item6Ref.id,
      vehicle_id: vehicle3Ref.id,
      item_name: 'Oil Change',
      service_usage: 80000,
      service_date: daysAgo(15),
      created_at: daysAgo(15),
    });

    await db.collection('service_history').add({
      maintenance_item_id: item6Ref.id,
      vehicle_id: vehicle3Ref.id,
      item_name: 'Oil Change',
      service_usage: 72000,
      service_date: daysAgo(200),
      created_at: daysAgo(200),
    });

    await db.collection('service_history').add({
      maintenance_item_id: item7Ref.id,
      vehicle_id: vehicle3Ref.id,
      item_name: 'Air Filter',
      service_usage: 70000,
      service_date: daysAgo(180),
      created_at: daysAgo(180),
    });

    console.log(`  ✅ Created 3 service history entries for Daily Driver`);

    // Service history for vehicle 4
    await db.collection('service_history').add({
      maintenance_item_id: item8Ref.id,
      vehicle_id: vehicle4Ref.id,
      item_name: 'Oil Change',
      service_usage: 200,
      service_date: daysAgo(90),
      created_at: daysAgo(90),
    });

    await db.collection('service_history').add({
      maintenance_item_id: item9Ref.id,
      vehicle_id: vehicle4Ref.id,
      item_name: 'Blade Sharpening',
      service_usage: 225,
      service_date: daysAgo(30),
      created_at: daysAgo(30),
    });

    await db.collection('service_history').add({
      maintenance_item_id: item9Ref.id,
      vehicle_id: vehicle4Ref.id,
      item_name: 'Blade Sharpening',
      service_usage: 200,
      service_date: daysAgo(60),
      created_at: daysAgo(60),
    });

    console.log(`  ✅ Created 3 service history entries for John Deere Tractor`);

    console.log('\n✅ Database seeded successfully!\n');
    console.log('Summary:');
    console.log('  - 2 teams');
    console.log('  - 4 vehicles');
    console.log('  - 9 maintenance items');
    console.log('  - 13 service history entries\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during seeding:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
seedDatabase();
