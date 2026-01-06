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
 * @param {number} cost - Optional cost of service
 * @param {string} provider - Optional service provider name
 */
export async function logService(itemId, currentUsage, serviceDate = new Date(), cost = null, provider = null) {
  // Get the maintenance item to get vehicle_id and name
  const item = await getMaintenanceItem(itemId);

  // Update the maintenance item with last service info
  const itemRef = doc(db, 'maintenance_items', itemId);
  await updateDoc(itemRef, {
    last_service_usage: currentUsage,
    last_service_date: serviceDate,
    updated_at: serverTimestamp(),
  });

  // Create a service history entry
  const historyEntry = {
    type: 'service',
    maintenance_item_id: itemId,
    vehicle_id: item.vehicle_id,
    item_name: item.name,
    service_usage: currentUsage,
    service_date: serviceDate,
    cost: cost,
    provider: provider,
    created_at: serverTimestamp(),
  };

  await addDoc(collection(db, 'service_history'), historyEntry);
}

/**
 * Log a repair for a vehicle
 * @param {string} vehicleId - Vehicle ID
 * @param {string} description - Repair description
 * @param {Date} serviceDate - Date of repair (defaults to now)
 * @param {number} cost - Optional cost of repair
 * @param {string} provider - Optional repair provider name
 */
export async function logRepair(vehicleId, description, serviceDate = new Date(), cost = null, provider = null) {
  // Create a repair history entry
  const repairEntry = {
    type: 'repair',
    maintenance_item_id: null,
    vehicle_id: vehicleId,
    item_name: description,
    service_usage: null,
    service_date: serviceDate,
    cost: cost,
    provider: provider,
    created_at: serverTimestamp(),
  };

  await addDoc(collection(db, 'service_history'), repairEntry);
}

/**
 * Get service history for a vehicle
 * @param {string} vehicleId - Vehicle ID
 * @returns {Promise<Array>} List of service history entries
 */
export async function getVehicleServiceHistory(vehicleId) {
  const historyQuery = query(
    collection(db, 'service_history'),
    where('vehicle_id', '==', vehicleId)
  );

  const snapshot = await getDocs(historyQuery);
  const history = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Sort by service date, most recent first
  return history.sort((a, b) => {
    const dateA = a.service_date?.toDate ? a.service_date.toDate() : new Date(a.service_date);
    const dateB = b.service_date?.toDate ? b.service_date.toDate() : new Date(b.service_date);
    return dateB - dateA;
  });
}

/**
 * Get service history for a maintenance item
 * @param {string} itemId - Maintenance item ID
 * @returns {Promise<Array>} List of service history entries
 */
export async function getMaintenanceItemServiceHistory(itemId) {
  const historyQuery = query(
    collection(db, 'service_history'),
    where('maintenance_item_id', '==', itemId)
  );

  const snapshot = await getDocs(historyQuery);
  const history = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Sort by service date, most recent first
  return history.sort((a, b) => {
    const dateA = a.service_date?.toDate ? a.service_date.toDate() : new Date(a.service_date);
    const dateB = b.service_date?.toDate ? b.service_date.toDate() : new Date(b.service_date);
    return dateB - dateA;
  });
}

/**
 * Update a service history entry and recalculate maintenance item's last service
 * @param {string} historyId - Service history entry ID
 * @param {number} serviceUsage - Updated service usage
 * @param {Date} serviceDate - Updated service date
 * @param {number} cost - Optional cost of service
 * @param {string} provider - Optional service provider name
 */
export async function updateServiceHistory(historyId, serviceUsage, serviceDate, cost = null, provider = null, description = null) {
  // Get the service history entry to find the maintenance item ID
  const historyRef = doc(db, 'service_history', historyId);
  const historySnap = await getDoc(historyRef);

  if (!historySnap.exists()) {
    throw new Error('Service history entry not found');
  }

  const historyData = historySnap.data();
  const maintenanceItemId = historyData.maintenance_item_id;
  const entryType = historyData.type || 'service'; // Default to 'service' for backward compatibility

  // Update the service history entry
  const updates = {
    service_usage: serviceUsage,
    service_date: serviceDate,
    cost: cost,
    provider: provider,
    updated_at: serverTimestamp(),
  };

  // Update description for repairs
  if (description !== null && entryType === 'repair') {
    updates.item_name = description;
  }

  await updateDoc(historyRef, updates);

  // Only update maintenance item if this is a service (not a repair)
  if (entryType === 'service' && maintenanceItemId) {
    // Get all service history entries for this maintenance item
    const allHistory = await getMaintenanceItemServiceHistory(maintenanceItemId);

    // Find the most recent service (by date)
    if (allHistory.length > 0) {
      const mostRecentService = allHistory[0]; // Already sorted by date, most recent first

      // Update the maintenance item's last service info to match the most recent service
      const itemRef = doc(db, 'maintenance_items', maintenanceItemId);
      await updateDoc(itemRef, {
        last_service_usage: mostRecentService.service_usage,
        last_service_date: mostRecentService.service_date,
        updated_at: serverTimestamp(),
      });
    }
  }
}

/**
 * Delete a service history entry and recalculate maintenance item's last service
 * @param {string} historyId - Service history entry ID
 */
export async function deleteServiceHistory(historyId) {
  // Get the service history entry to find the maintenance item ID
  const historyRef = doc(db, 'service_history', historyId);
  const historySnap = await getDoc(historyRef);

  if (!historySnap.exists()) {
    throw new Error('Service history entry not found');
  }

  const historyData = historySnap.data();
  const maintenanceItemId = historyData.maintenance_item_id;
  const entryType = historyData.type || 'service'; // Default to 'service' for backward compatibility

  // Delete the service history entry
  await deleteDoc(historyRef);

  // Only update maintenance item if this is a service (not a repair)
  if (entryType === 'service' && maintenanceItemId) {
    // Get remaining service history entries for this maintenance item
    const allHistory = await getMaintenanceItemServiceHistory(maintenanceItemId);

    // Update the maintenance item's last service info
    const itemRef = doc(db, 'maintenance_items', maintenanceItemId);
    if (allHistory.length > 0) {
      // Set to the most recent remaining service
      const mostRecentService = allHistory[0];
      await updateDoc(itemRef, {
        last_service_usage: mostRecentService.service_usage,
        last_service_date: mostRecentService.service_date,
        updated_at: serverTimestamp(),
      });
    } else {
      // No services left - clear the last service fields
      await updateDoc(itemRef, {
        last_service_usage: null,
        last_service_date: null,
        updated_at: serverTimestamp(),
      });
    }
  }
}
