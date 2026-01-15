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
 * Detect usage conflicts when logging a new entry
 * A conflict occurs when the new usage is higher than current, but there are
 * later entries with lower usage values (impossible scenario - odometer can't go backward)
 * @param {string} vehicleId - Vehicle ID
 * @param {number} newUsage - New usage value being logged
 * @param {Date} newDate - Date of the new entry
 * @param {number} currentUsage - Current vehicle usage
 * @returns {Promise<object|null>} Conflict info or null if no conflict
 * @private
 */
async function detectUsageConflict(vehicleId, newUsage, newDate, currentUsage) {
  // Only check for conflicts if new usage is higher than current
  if (newUsage <= currentUsage) {
    return null;
  }

  // Get all usage history for this vehicle
  const allHistory = await getVehicleUsageHistory(vehicleId);

  // Find entries with dates after the new entry's date
  const laterEntries = allHistory.filter(entry => {
    const entryDate = entry.date?.toDate ? entry.date.toDate() : new Date(entry.date);
    return entryDate > newDate;
  });

  if (laterEntries.length === 0) {
    // No later entries - no conflict
    return null;
  }

  // Check if any later entry has usage less than new usage
  // This would be impossible (odometer went backward)
  const conflictingEntries = laterEntries.filter(entry => entry.usage < newUsage);

  if (conflictingEntries.length === 0) {
    // All later entries have higher usage - no conflict
    return null;
  }

  // Conflict detected
  const highestLaterUsage = Math.max(...laterEntries.map(e => e.usage));

  return {
    newUsage,
    currentUsage,
    highestLaterUsage,
    laterEntries,
    conflictingEntries,
  };
}

/**
 * Resolve a usage conflict by setting vehicle.current_usage to the chosen value
 * @param {string} vehicleId - Vehicle ID
 * @param {number} chosenUsage - The usage value chosen by the user
 * @returns {Promise<void>}
 */
export async function resolveUsageConflict(vehicleId, chosenUsage) {
  validateVehicleId(vehicleId);
  validateUsage(chosenUsage);

  await updateVehicle(vehicleId, {
    current_usage: chosenUsage,
  });
}

/**
 * Check if a date is today (same calendar day in local timezone)
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is today
 * @private
 */
function isToday(date) {
  const today = new Date();
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate();
}

/**
 * Log a usage update for a vehicle
 * Creates usage_history entry and updates vehicle.current_usage if usage is higher
 * @param {string} vehicleId - Vehicle ID
 * @param {number} usage - Usage reading (km or hours)
 * @param {Date} date - Date of the reading
 * @param {string} usageType - Optional usage type (e.g., "track day")
 * @param {string} location - Optional location
 * @param {string} userId - User ID who created this entry
 * @returns {Promise<object>} Result with entryId and optional conflict info
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
    updated_by: null,
    version: 1,
  };

  // Create the usage history entry
  const usageRef = await addDoc(collection(db, 'usage_history'), usageEntry);

  // Get current vehicle data
  const { getVehicle } = await import('./vehicles');
  const vehicle = await getVehicle(vehicleId);
  const currentUsage = vehicle?.current_usage || 0;

  // Check if we should update current_usage (only if new usage is higher)
  if (usage > currentUsage) {
    // Detect potential conflicts with later entries
    const conflict = await detectUsageConflict(vehicleId, usage, date, currentUsage);

    if (conflict) {
      // Conflict detected - return info for UI to show dialog
      return {
        entryId: usageRef.id,
        conflict: true,
        conflictInfo: conflict,
      };
    }

    // No conflict - update current_usage
    await updateVehicle(vehicleId, {
      current_usage: usage,
    });
  }

  // Successfully logged without conflict
  return {
    entryId: usageRef.id,
    conflict: false,
  };
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
 * Update a usage history entry and update vehicle.current_usage if usage is higher
 * Uses optimistic locking with version field to prevent race conditions
 * @param {string} historyId - Usage history entry ID
 * @param {number} usage - Updated usage value
 * @param {Date} date - Updated date
 * @param {string} usageType - Optional usage type
 * @param {string} location - Optional location
 * @param {string} userId - User ID who is updating this entry
 * @param {number} expectedVersion - Optional expected version for optimistic locking
 * @returns {Promise<object>} Result with optional conflict info
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

  // Get current vehicle data
  const { getVehicle } = await import('./vehicles');
  const vehicle = await getVehicle(vehicleId);
  const currentUsage = vehicle?.current_usage || 0;

  // Check if we should update current_usage (only if new usage is higher)
  if (usage > currentUsage) {
    // Detect potential conflicts with later entries
    const conflict = await detectUsageConflict(vehicleId, usage, date, currentUsage);

    if (conflict) {
      // Conflict detected - return info for UI to show dialog
      return {
        conflict: true,
        conflictInfo: conflict,
      };
    }

    // No conflict - update current_usage
    await updateVehicle(vehicleId, {
      current_usage: usage,
    });
  }

  // Successfully updated without conflict
  return {
    conflict: false,
  };
}

/**
 * Delete a usage history entry and recalculate vehicle.current_usage
 * Sets current_usage to the highest value from remaining entries
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

  // Recalculate current_usage from remaining entries
  const remainingEntries = await getVehicleUsageHistory(vehicleId);

  if (remainingEntries.length > 0) {
    // Find the highest usage value among remaining entries
    const highestUsage = Math.max(...remainingEntries.map(e => e.usage));

    // Update vehicle.current_usage to the highest value
    await updateVehicle(vehicleId, {
      current_usage: highestUsage,
    });
  } else {
    // No remaining entries - reset to 0
    await updateVehicle(vehicleId, {
      current_usage: 0,
    });
  }
}
