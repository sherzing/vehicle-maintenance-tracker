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
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

/**
 * Create a new vehicle
 * @param {Object} vehicleData - Vehicle data
 * @returns {Promise<string>} Vehicle ID
 */
export async function createVehicle(vehicleData) {
  const vehicle = {
    ...vehicleData,
    current_usage: vehicleData.current_usage || 0,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  const vehicleRef = await addDoc(collection(db, 'vehicles'), vehicle);
  return vehicleRef.id;
}

/**
 * Get vehicle by ID
 * @param {string} vehicleId - Vehicle ID
 * @returns {Promise<Object>} Vehicle data
 */
export async function getVehicle(vehicleId) {
  const vehicleRef = doc(db, 'vehicles', vehicleId);
  const vehicleSnap = await getDoc(vehicleRef);

  if (!vehicleSnap.exists()) {
    throw new Error('Vehicle not found');
  }

  return {
    id: vehicleSnap.id,
    ...vehicleSnap.data(),
  };
}

/**
 * Get all vehicles for a team
 * @param {string} teamId - Team ID
 * @returns {Promise<Array>} List of vehicles
 */
export async function getTeamVehicles(teamId) {
  const vehiclesQuery = query(
    collection(db, 'vehicles'),
    where('team_id', '==', teamId),
    orderBy('created_at', 'desc')
  );

  const snapshot = await getDocs(vehiclesQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Update a vehicle
 * @param {string} vehicleId - Vehicle ID
 * @param {Object} updates - Fields to update
 */
export async function updateVehicle(vehicleId, updates) {
  const vehicleRef = doc(db, 'vehicles', vehicleId);
  await updateDoc(vehicleRef, {
    ...updates,
    updated_at: serverTimestamp(),
  });
}

/**
 * Delete a vehicle
 * @param {string} vehicleId - Vehicle ID
 */
export async function deleteVehicle(vehicleId) {
  const vehicleRef = doc(db, 'vehicles', vehicleId);
  await deleteDoc(vehicleRef);
}

/**
 * Update vehicle usage
 * @param {string} vehicleId - Vehicle ID
 * @param {number} newUsage - New usage value in km
 */
export async function updateVehicleUsage(vehicleId, newUsage) {
  const vehicleRef = doc(db, 'vehicles', vehicleId);
  await updateDoc(vehicleRef, {
    current_usage: newUsage,
    updated_at: serverTimestamp(),
  });
}
