import {
  collection,
  doc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';

/**
 * Reset a vehicle's usage and service history
 * - Deletes all service_history records
 * - Deletes all usage_history records
 * - Sets vehicle current_usage to 0
 * - Optionally keeps and resets maintenance items' last_serviced_date and last_serviced_usage to null
 *
 * @param {string} vehicleId - Vehicle ID to reset
 * @param {Object} options - Options for reset { keepMaintenanceItems: boolean }
 * @returns {Promise<Object>} Result with counts of deleted/reset items
 */
export async function resetVehicleHistory(vehicleId, options = {}) {
  const { keepMaintenanceItems = true } = options;
  try {
    let serviceHistoryDeleted = 0;
    let usageHistoryDeleted = 0;
    let maintenanceItemsReset = 0;

    // 1. Delete all service history records
    const serviceHistoryQuery = query(
      collection(db, 'service_history'),
      where('vehicle_id', '==', vehicleId)
    );
    const serviceHistorySnapshot = await getDocs(serviceHistoryQuery);

    for (const serviceDoc of serviceHistorySnapshot.docs) {
      await deleteDoc(serviceDoc.ref);
      serviceHistoryDeleted++;
    }

    // 2. Delete all usage history records
    const usageHistoryQuery = query(
      collection(db, 'usage_history'),
      where('vehicle_id', '==', vehicleId)
    );
    const usageHistorySnapshot = await getDocs(usageHistoryQuery);

    for (const usageDoc of usageHistorySnapshot.docs) {
      await deleteDoc(usageDoc.ref);
      usageHistoryDeleted++;
    }

    // 3. Reset all maintenance items to null last serviced values (if keeping them)
    if (keepMaintenanceItems) {
      const maintenanceItemsQuery = query(
        collection(db, 'maintenance_items'),
        where('vehicle_id', '==', vehicleId)
      );
      const maintenanceItemsSnapshot = await getDocs(maintenanceItemsQuery);

      for (const itemDoc of maintenanceItemsSnapshot.docs) {
        await updateDoc(itemDoc.ref, {
          last_serviced_date: null,
          last_serviced_usage: null,
          updated_at: Timestamp.now(),
        });
        maintenanceItemsReset++;
      }
    }

    // 4. Reset vehicle current_usage to 0
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    await updateDoc(vehicleRef, {
      current_usage: 0,
      updated_at: Timestamp.now(),
    });

    return {
      success: true,
      serviceHistoryDeleted,
      usageHistoryDeleted,
      maintenanceItemsReset,
    };
  } catch (error) {
    console.error('Error resetting vehicle history:', error);
    throw error;
  }
}
