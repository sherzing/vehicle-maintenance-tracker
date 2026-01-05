#!/usr/bin/env node

/**
 * Database Reset Script for Development Environment
 *
 * This script deletes all documents from the development Firestore database.
 * WARNING: This action cannot be undone!
 *
 * Usage:
 *   npm run reset-db
 *
 * The script will delete all documents from these collections:
 *   - teams
 *   - vehicles
 *   - maintenance_items
 *   - service_history
 *   - users
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Collections to reset
const COLLECTIONS = [
  'teams',
  'vehicles',
  'maintenance_items',
  'service_history',
  'users',
];

// Initialize Firebase Admin
const projectId = 'maintainer-dev';

console.log('\n🔥 Firebase Development Database Reset Tool\n');
console.log(`Project: ${projectId}`);
console.log(`Collections to reset: ${COLLECTIONS.join(', ')}\n`);

// Check for service account credentials
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  join(__dirname, '..', 'service-account-dev.json');

if (!existsSync(credentialsPath)) {
  console.error('❌ Error: Service account credentials not found.');
  console.error('\nPlease either:');
  console.error('1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable to your service account key path');
  console.error('2. Place service-account-dev.json in the project root directory\n');
  console.error('To get a service account key:');
  console.error('1. Go to Firebase Console > Project Settings > Service Accounts');
  console.error('2. Click "Generate New Private Key"');
  console.error('3. Save the file as service-account-dev.json in the project root\n');
  process.exit(1);
}

// Initialize Firebase Admin with credentials
initializeApp({
  credential: cert(credentialsPath),
  projectId: projectId,
});

const db = getFirestore();

/**
 * Delete all documents in a collection
 */
async function deleteCollection(collectionName) {
  const collectionRef = db.collection(collectionName);
  const batchSize = 100;
  let totalDeleted = 0;

  try {
    let query = collectionRef.limit(batchSize);

    return new Promise((resolve, reject) => {
      deleteQueryBatch(query, batchSize, totalDeleted, resolve, reject);
    });
  } catch (error) {
    console.error(`❌ Error deleting collection ${collectionName}:`, error.message);
    throw error;
  }
}

function deleteQueryBatch(query, batchSize, totalDeleted, resolve, reject) {
  query.get()
    .then((snapshot) => {
      // When there are no documents left, we are done
      if (snapshot.size === 0) {
        return 0;
      }

      // Delete documents in a batch
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      return batch.commit().then(() => {
        return snapshot.size;
      });
    })
    .then((numDeleted) => {
      totalDeleted += numDeleted;

      if (numDeleted === 0) {
        resolve(totalDeleted);
        return;
      }

      // Recurse on the next process tick to avoid
      // exploding the stack.
      process.nextTick(() => {
        deleteQueryBatch(query, batchSize, totalDeleted, resolve, reject);
      });
    })
    .catch(reject);
}

/**
 * Prompt user for confirmation
 */
function confirmReset() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log('⚠️  WARNING: This will delete ALL data from the development database!');
    console.log('⚠️  This action CANNOT be undone!\n');

    rl.question('Type "DELETE ALL DATA" to confirm: ', (answer) => {
      rl.close();
      resolve(answer === 'DELETE ALL DATA');
    });
  });
}

/**
 * Main function
 */
async function main() {
  try {
    // Ask for confirmation
    const confirmed = await confirmReset();

    if (!confirmed) {
      console.log('\n❌ Reset cancelled. No data was deleted.\n');
      process.exit(0);
    }

    console.log('\n🗑️  Starting database reset...\n');

    // Delete each collection
    for (const collectionName of COLLECTIONS) {
      process.stdout.write(`  Deleting ${collectionName}... `);
      const count = await deleteCollection(collectionName);
      console.log(`✅ Deleted ${count} document(s)`);
    }

    console.log('\n✅ Database reset complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during reset:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main();
