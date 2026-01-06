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
import { updateVehicle } from './vehicles';

/**
 * Recalculate vehicle.current_usage based on all usage history
 * Finds the most recent entry by date and sets current_usage to that value
 * @param {string} vehicleId - Vehicle ID
 * @private
 */
async function recalculateCurrentUsage(vehicleId) {
  // Get all usage history for this vehicle
  const allHistory = await getVehicleUsageHistory(vehicleId);

  if (allHistory.length === 0) {
    // No history - don't update current_usage
    // Vehicle might have been created with initial usage
    return;
  }

  // Most recent entry is already at index 0 (sorted by date desc)
  const mostRecentEntry = allHistory[0];

  // Update vehicle.current_usage to match most recent entry's usage
  await updateVehicle(vehicleId, {
    current_usage: mostRecentEntry.usage,
  });
}

/**
 * Log a usage update for a vehicle
 * Creates usage_history entry and recalculates vehicle.current_usage
 * @param {string} vehicleId - Vehicle ID
 * @param {number} usage - Usage reading (km or hours)
 * @param {Date} date - Date of the reading
 * @param {string} usageType - Optional usage type (e.g., "track day")
 * @param {string} location - Optional location
 * @param {string} userId - User ID who created this entry
 * @returns {Promise<string>} Usage history entry ID
 */
export async function logUsageUpdate(vehicleId, usage, date, usageType = null, location = null, userId) {
  const usageEntry = {
    vehicle_id: vehicleId,
    usage: usage,
    date: date,
    usage_type: usageType,
    location: location,
    created_by: userId,
    created_at: serverTimestamp(),
    updated_at: null,
  };

  const usageRef = await addDoc(collection(db, 'usage_history'), usageEntry);

  // Recalculate current_usage to most recent by date
  await recalculateCurrentUsage(vehicleId);

  return usageRef.id;
}

/**
 * Get all usage history for a vehicle
 * @param {string} vehicleId - Vehicle ID
 * @returns {Promise<Array>} List of usage history entries, sorted by date (most recent first)
 */
export async function getVehicleUsageHistory(vehicleId) {
  const historyQuery = query(
    collection(db, 'usage_history'),
    where('vehicle_id', '==', vehicleId)
  );

  const snapshot = await getDocs(historyQuery);
  const history = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Sort by date, most recent first
  return history.sort((a, b) => {
    const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
    const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
    return dateB - dateA;
  });
}

/**
 * Update a usage history entry and recalculate vehicle.current_usage
 * @param {string} historyId - Usage history entry ID
 * @param {number} usage - Updated usage value
 * @param {Date} date - Updated date
 * @param {string} usageType - Optional usage type
 * @param {string} location - Optional location
 */
export async function updateUsageHistory(historyId, usage, date, usageType = null, location = null) {
  // Get the usage history entry to find the vehicle_id
  const historyRef = doc(db, 'usage_history', historyId);
  const historySnap = await getDoc(historyRef);

  if (!historySnap.exists()) {
    throw new Error('Usage history entry not found');
  }

  const historyData = historySnap.data();
  const vehicleId = historyData.vehicle_id;

  // Update the usage history entry
  await updateDoc(historyRef, {
    usage: usage,
    date: date,
    usage_type: usageType,
    location: location,
    updated_at: serverTimestamp(),
  });

  // Recalculate current_usage to most recent by date
  await recalculateCurrentUsage(vehicleId);
}

/**
 * Delete a usage history entry and recalculate vehicle.current_usage
 * @param {string} historyId - Usage history entry ID
 */
export async function deleteUsageHistory(historyId) {
  // Get the usage history entry to find the vehicle_id
  const historyRef = doc(db, 'usage_history', historyId);
  const historySnap = await getDoc(historyRef);

  if (!historySnap.exists()) {
    throw new Error('Usage history entry not found');
  }

  const historyData = historySnap.data();
  const vehicleId = historyData.vehicle_id;

  // Delete the usage history entry
  await deleteDoc(historyRef);

  // Recalculate current_usage to most recent by date
  await recalculateCurrentUsage(vehicleId);
}
