import {
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';

/**
 * Convert Firestore timestamp to ISO string
 */
function timestampToISO(timestamp) {
  if (!timestamp) return null;
  if (timestamp.toDate) {
    return timestamp.toDate().toISOString();
  }
  return timestamp;
}

/**
 * Convert data object with timestamps to ISO strings
 */
function convertTimestampsToISO(data) {
  const converted = { ...data };
  Object.keys(converted).forEach(key => {
    if (converted[key] && typeof converted[key] === 'object' && converted[key].toDate) {
      converted[key] = timestampToISO(converted[key]);
    }
  });
  return converted;
}

/**
 * Export all vehicles and their history for a team
 * @param {string} teamId - Team ID
 * @returns {Promise<Object>} Export data object
 */
export async function exportTeamData(teamId) {
  try {
    const exportData = {
      teamId,
      exportDate: new Date().toISOString(),
      version: '1.0',
      vehicles: [],
    };

    // Get all vehicles for the team
    const vehiclesQuery = query(
      collection(db, 'vehicles'),
      where('team_id', '==', teamId)
    );
    const vehiclesSnapshot = await getDocs(vehiclesQuery);

    // For each vehicle, get all related data
    for (const vehicleDoc of vehiclesSnapshot.docs) {
      const vehicleData = convertTimestampsToISO(vehicleDoc.data());

      // Get maintenance items
      const maintenanceQuery = query(
        collection(db, 'maintenance_items'),
        where('vehicle_id', '==', vehicleDoc.id)
      );
      const maintenanceSnapshot = await getDocs(maintenanceQuery);
      const maintenanceItems = maintenanceSnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestampsToISO(doc.data()),
      }));

      // Get service history
      const serviceQuery = query(
        collection(db, 'service_history'),
        where('vehicle_id', '==', vehicleDoc.id),
        orderBy('service_date', 'desc')
      );
      const serviceSnapshot = await getDocs(serviceQuery);
      const serviceHistory = serviceSnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestampsToISO(doc.data()),
      }));

      // Get usage history
      const usageQuery = query(
        collection(db, 'usage_history'),
        where('vehicle_id', '==', vehicleDoc.id),
        orderBy('date', 'desc')
      );
      const usageSnapshot = await getDocs(usageQuery);
      const usageHistory = usageSnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestampsToISO(doc.data()),
      }));

      exportData.vehicles.push({
        originalId: vehicleDoc.id,
        vehicleData,
        maintenanceItems,
        serviceHistory,
        usageHistory,
      });
    }

    return exportData;
  } catch (error) {
    console.error('Error exporting team data:', error);
    throw new Error('Failed to export team data: ' + error.message);
  }
}

/**
 * Validate import data structure
 * @param {Object} data - Import data
 * @returns {Object} Validation result with valid flag and errors array
 */
export function validateImportData(data) {
  const errors = [];

  // Check required top-level fields
  if (!data.teamId) {
    errors.push('Missing teamId');
  }

  if (!data.vehicles || !Array.isArray(data.vehicles)) {
    errors.push('Missing or invalid vehicles array');
    return { valid: false, errors };
  }

  // Validate each vehicle
  data.vehicles.forEach((vehicle, index) => {
    if (!vehicle.vehicleData) {
      errors.push(`Vehicle ${index}: Missing vehicleData`);
      return;
    }

    const v = vehicle.vehicleData;

    // Required fields
    if (!v.name) errors.push(`Vehicle ${index}: Missing name`);
    if (!v.type) errors.push(`Vehicle ${index}: Missing type`);
    if (!v.make) errors.push(`Vehicle ${index}: Missing make`);
    if (!v.model) errors.push(`Vehicle ${index}: Missing model`);
    if (v.year === undefined) errors.push(`Vehicle ${index}: Missing year`);

    // Validate type
    if (v.type && !['car', 'motorcycle'].includes(v.type)) {
      errors.push(`Vehicle ${index}: Invalid type "${v.type}". Must be "car" or "motorcycle"`);
    }

    // Validate unit
    if (v.unit && !['km', 'hours'].includes(v.unit)) {
      errors.push(`Vehicle ${index}: Invalid unit "${v.unit}". Must be "km" or "hours"`);
    }

    // Cars must use km
    if (v.type === 'car' && v.unit && v.unit !== 'km') {
      errors.push(`Vehicle ${index}: Cars must use "km" as unit`);
    }

    // Validate arrays
    if (!Array.isArray(vehicle.maintenanceItems)) {
      errors.push(`Vehicle ${index}: maintenanceItems must be an array`);
    }
    if (!Array.isArray(vehicle.serviceHistory)) {
      errors.push(`Vehicle ${index}: serviceHistory must be an array`);
    }
    if (!Array.isArray(vehicle.usageHistory)) {
      errors.push(`Vehicle ${index}: usageHistory must be an array`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Import team data
 * @param {string} teamId - Team ID to import into
 * @param {Object} data - Import data
 * @param {string} mode - Import mode: 'new' (create new vehicles), 'replace' (replace existing)
 * @returns {Promise<Object>} Import result
 */
export async function importTeamData(teamId, data, mode = 'new') {
  // Validate data
  const validation = validateImportData(data);
  if (!validation.valid) {
    throw new Error('Invalid import data: ' + validation.errors.join(', '));
  }

  const result = {
    success: true,
    vehiclesImported: 0,
    maintenanceItemsImported: 0,
    serviceHistoryImported: 0,
    usageHistoryImported: 0,
    errors: [],
  };

  try {
    for (const vehicleExport of data.vehicles) {
      // Prepare vehicle data
      const vehicleData = {
        ...vehicleExport.vehicleData,
        team_id: teamId,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      // Remove old IDs and vehicle_id references
      delete vehicleData.vehicle_id;
      if (vehicleExport.originalId) {
        delete vehicleData.originalId;
      }

      // Create new vehicle
      const vehicleRef = await addDoc(collection(db, 'vehicles'), vehicleData);
      const newVehicleId = vehicleRef.id;
      result.vehiclesImported++;

      // Import maintenance items
      for (const item of vehicleExport.maintenanceItems) {
        const itemData = {
          ...item,
          vehicle_id: newVehicleId,
          created_at: Timestamp.now(),
          updated_at: Timestamp.now(),
        };
        delete itemData.id;

        // Convert date strings back to Timestamps
        if (itemData.last_serviced_date && typeof itemData.last_serviced_date === 'string') {
          itemData.last_serviced_date = Timestamp.fromDate(new Date(itemData.last_serviced_date));
        }

        const itemRef = doc(collection(db, 'maintenance_items'));
        await setDoc(itemRef, itemData);
        result.maintenanceItemsImported++;
      }

      // Import service history
      for (const service of vehicleExport.serviceHistory) {
        const serviceData = {
          ...service,
          vehicle_id: newVehicleId,
          logged_at: Timestamp.now(),
        };
        delete serviceData.id;

        // Convert date strings to Timestamps
        if (serviceData.service_date && typeof serviceData.service_date === 'string') {
          serviceData.service_date = Timestamp.fromDate(new Date(serviceData.service_date));
        }

        const serviceRef = doc(collection(db, 'service_history'));
        await setDoc(serviceRef, serviceData);
        result.serviceHistoryImported++;
      }

      // Import usage history
      for (const usage of vehicleExport.usageHistory) {
        const usageData = {
          ...usage,
          vehicle_id: newVehicleId,
          created_at: Timestamp.now(),
          version: 1,
        };
        delete usageData.id;

        // Convert date strings to Timestamps
        if (usageData.date && typeof usageData.date === 'string') {
          usageData.date = Timestamp.fromDate(new Date(usageData.date));
        }

        const usageRef = doc(collection(db, 'usage_history'));
        await setDoc(usageRef, usageData);
        result.usageHistoryImported++;
      }
    }

    return result;
  } catch (error) {
    console.error('Error importing team data:', error);
    throw error;
  }
}

/**
 * Download export data as JSON file
 * @param {Object} data - Export data
 * @param {string} filename - Filename for download
 */
export function downloadExportData(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `team-export-${data.teamId}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Read import file
 * @param {File} file - File to read
 * @returns {Promise<Object>} Parsed JSON data
 */
export async function readImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
