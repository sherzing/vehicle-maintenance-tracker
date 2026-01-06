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
  runTransaction,
} from 'firebase/firestore';
import { db } from './config';
import { updateVehicle } from './vehicles';

/**
 * Validate vehicleId format to prevent NoSQL injection
 * @param {string} vehicleId - Vehicle ID to validate
 * @throws {Error} If vehicleId is invalid
 * @private
 */
function validateVehicleId(vehicleId) {
  if (!vehicleId || typeof vehicleId !== 'string') {
    throw new Error('Invalid vehicle ID: must be a non-empty string');
  }

  // Firestore document IDs must be 1-1500 characters and can only contain certain characters
  if (vehicleId.length === 0 || vehicleId.length > 1500) {
    throw new Error('Invalid vehicle ID: length must be between 1 and 1500 characters');
  }

  // Prevent path traversal and injection attempts
  if (vehicleId.includes('/') || vehicleId.includes('..')) {
    throw new Error('Invalid vehicle ID: contains illegal characters');
  }
}

/**
 * Validate historyId format to prevent NoSQL injection
 * @param {string} historyId - History entry ID to validate
 * @throws {Error} If historyId is invalid
 * @private
 */
function validateHistoryId(historyId) {
  if (!historyId || typeof historyId !== 'string') {
    throw new Error('Invalid history ID: must be a non-empty string');
  }

  if (historyId.length === 0 || historyId.length > 1500) {
    throw new Error('Invalid history ID: length must be between 1 and 1500 characters');
  }

  if (historyId.includes('/') || historyId.includes('..')) {
    throw new Error('Invalid history ID: contains illegal characters');
  }
}

/**
 * Validate usage value to prevent invalid data
 * @param {number} usage - Usage value to validate
 * @throws {Error} If usage is invalid
 * @private
 */
function validateUsage(usage) {
  if (typeof usage !== 'number') {
    throw new Error('Invalid usage: must be a number');
  }

  if (isNaN(usage) || !isFinite(usage)) {
    throw new Error('Invalid usage: cannot be NaN or Infinity');
  }

  if (usage < 0) {
    throw new Error('Invalid usage: cannot be negative');
  }

  // Reasonable upper limit (10 million km or hours)
  if (usage >= 10000000) {
    throw new Error('Invalid usage: exceeds maximum allowed value (10,000,000)');
  }
}

/**
 * Validate date to prevent invalid data
 * @param {Date} date - Date to validate
 * @throws {Error} If date is invalid
 * @private
 */
function validateDate(date) {
  if (!(date instanceof Date)) {
    throw new Error('Invalid date: must be a Date object');
  }

  if (isNaN(date.getTime())) {
    throw new Error('Invalid date: date is invalid');
  }

  // Date cannot be in the future
  const now = new Date();
  if (date > now) {
    throw new Error('Invalid date: cannot be in the future');
  }

  // Reasonable lower limit (year 1900)
  const minDate = new Date('1900-01-01');
  if (date < minDate) {
    throw new Error('Invalid date: cannot be before 1900');
  }
}

/**
 * Validate and sanitize text input
 * @param {string|null} text - Text to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {string|null} Validated text or null
 * @throws {Error} If text is invalid
 * @private
 */
function validateTextInput(text, fieldName) {
  if (text === null || text === undefined || text === '') {
    return null;
  }

  if (typeof text !== 'string') {
    throw new Error(`Invalid ${fieldName}: must be a string or null`);
  }

  // Limit length to prevent DoS
  if (text.length > 500) {
    throw new Error(`Invalid ${fieldName}: exceeds maximum length (500 characters)`);
  }

  return text.trim() || null;
}

/**
 * Validate userId format
 * @param {string} userId - User ID to validate
 * @throws {Error} If userId is invalid
 * @private
 */
function validateUserId(userId) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid user ID: must be a non-empty string');
  }

  if (userId.length === 0 || userId.length > 128) {
    throw new Error('Invalid user ID: invalid length');
  }
}

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
  // Validate all inputs
  validateVehicleId(vehicleId);
  validateUsage(usage);
  validateDate(date);
  validateUserId(userId);

  const validatedUsageType = validateTextInput(usageType, 'usage type');
  const validatedLocation = validateTextInput(location, 'location');

  const usageEntry = {
    vehicle_id: vehicleId,
    usage: usage,
    date: date,
    usage_type: validatedUsageType,
    location: validatedLocation,
    created_by: userId,
    created_at: serverTimestamp(),
    updated_at: null,
    version: 1,
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
  // Validate input
  validateVehicleId(vehicleId);

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
 * Uses optimistic locking with version field to prevent race conditions
 * @param {string} historyId - Usage history entry ID
 * @param {number} usage - Updated usage value
 * @param {Date} date - Updated date
 * @param {string} usageType - Optional usage type
 * @param {string} location - Optional location
 * @param {string} userId - User ID who is updating this entry
 * @param {number} expectedVersion - Optional expected version for optimistic locking
 * @throws {Error} If version conflict detected (concurrent modification)
 */
export async function updateUsageHistory(historyId, usage, date, usageType = null, location = null, userId, expectedVersion = null) {
  // Validate all inputs
  validateHistoryId(historyId);
  validateUsage(usage);
  validateDate(date);
  validateUserId(userId);

  const validatedUsageType = validateTextInput(usageType, 'usage type');
  const validatedLocation = validateTextInput(location, 'location');

  const historyRef = doc(db, 'usage_history', historyId);

  // Use transaction for atomic read-check-write with version checking
  const vehicleId = await runTransaction(db, async (transaction) => {
    const historySnap = await transaction.get(historyRef);

    if (!historySnap.exists()) {
      throw new Error('Usage history entry not found');
    }

    const historyData = historySnap.data();
    const currentVersion = historyData.version || 1;

    // Check for version conflict if expectedVersion was provided
    if (expectedVersion !== null && currentVersion !== expectedVersion) {
      throw new Error('Version conflict: This entry was modified by another user. Please refresh and try again.');
    }

    const vehicleId = historyData.vehicle_id;
    validateVehicleId(vehicleId);

    // Update with incremented version
    transaction.update(historyRef, {
      usage: usage,
      date: date,
      usage_type: validatedUsageType,
      location: validatedLocation,
      updated_at: serverTimestamp(),
      updated_by: userId,
      version: currentVersion + 1,
    });

    return vehicleId;
  });

  // Recalculate current_usage to most recent by date
  await recalculateCurrentUsage(vehicleId);
}

/**
 * Delete a usage history entry and recalculate vehicle.current_usage
 * @param {string} historyId - Usage history entry ID
 */
export async function deleteUsageHistory(historyId) {
  // Validate input
  validateHistoryId(historyId);

  // Get the usage history entry to find the vehicle_id
  const historyRef = doc(db, 'usage_history', historyId);
  const historySnap = await getDoc(historyRef);

  if (!historySnap.exists()) {
    throw new Error('Usage history entry not found');
  }

  const historyData = historySnap.data();
  const vehicleId = historyData.vehicle_id;

  // Validate the vehicle_id from the database
  validateVehicleId(vehicleId);

  // Delete the usage history entry
  await deleteDoc(historyRef);

  // Recalculate current_usage to most recent by date
  await recalculateCurrentUsage(vehicleId);
}
