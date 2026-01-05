import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

/**
 * Create a new maintenance item
 * @param {Object} itemData - Maintenance item data
 * @returns {Promise<string>} Maintenance item ID
 */
export async function createMaintenanceItem(itemData) {
  const item = {
    ...itemData,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  const itemRef = await addDoc(collection(db, 'maintenance_items'), item);
  return itemRef.id;
}

/**
 * Get maintenance item by ID
 * @param {string} itemId - Maintenance item ID
 * @returns {Promise<Object>} Maintenance item data
 */
export async function getMaintenanceItem(itemId) {
  const itemRef = doc(db, 'maintenance_items', itemId);
  const itemSnap = await getDoc(itemRef);

  if (!itemSnap.exists()) {
    throw new Error('Maintenance item not found');
  }

  return {
    id: itemSnap.id,
    ...itemSnap.data(),
  };
}

/**
 * Get all maintenance items for a vehicle
 * @param {string} vehicleId - Vehicle ID
 * @returns {Promise<Array>} List of maintenance items
 */
export async function getVehicleMaintenanceItems(vehicleId) {
  const itemsQuery = query(
    collection(db, 'maintenance_items'),
    where('vehicle_id', '==', vehicleId)
  );

  const snapshot = await getDocs(itemsQuery);
  const items = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Sort by name client-side
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Update a maintenance item
 * @param {string} itemId - Maintenance item ID
 * @param {Object} updates - Fields to update
 */
export async function updateMaintenanceItem(itemId, updates) {
  const itemRef = doc(db, 'maintenance_items', itemId);
  await updateDoc(itemRef, {
    ...updates,
    updated_at: serverTimestamp(),
  });
}

/**
 * Delete a maintenance item
 * @param {string} itemId - Maintenance item ID
 */
export async function deleteMaintenanceItem(itemId) {
  const itemRef = doc(db, 'maintenance_items', itemId);
  await deleteDoc(itemRef);
}

/**
 * Log a service for a maintenance item
 * @param {string} itemId - Maintenance item ID
 * @param {number} currentUsage - Current vehicle usage
 * @param {Date} serviceDate - Date of service (defaults to now)
 */
export async function logService(itemId, currentUsage, serviceDate = new Date()) {
  const itemRef = doc(db, 'maintenance_items', itemId);
  await updateDoc(itemRef, {
    last_service_usage: currentUsage,
    last_service_date: serviceDate,
    updated_at: serverTimestamp(),
  });
}
