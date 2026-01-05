import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createVehicle,
  getVehicle,
  getTeamVehicles,
  updateVehicle,
  deleteVehicle,
  updateVehicleUsage,
} from './vehicles';
import * as firestore from 'firebase/firestore';

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => 'TIMESTAMP'),
}));

vi.mock('./config', () => ({
  db: {},
}));

describe('vehicles service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createVehicle', () => {
    it('should create a vehicle with correct data', async () => {
      const mockVehicleRef = { id: 'vehicle123' };
      firestore.addDoc.mockResolvedValue(mockVehicleRef);

      const vehicleData = {
        team_id: 'team123',
        name: 'Test Vehicle',
        type: 'car',
        current_usage: 1000,
      };

      const vehicleId = await createVehicle(vehicleData);

      const addDocCall = firestore.addDoc.mock.calls[0];
      expect(addDocCall[1]).toMatchObject({
        team_id: 'team123',
        name: 'Test Vehicle',
        type: 'car',
        current_usage: 1000,
      });
      expect(vehicleId).toBe('vehicle123');
    });

    it('should default current_usage to 0 if not provided', async () => {
      const mockVehicleRef = { id: 'vehicle123' };
      firestore.addDoc.mockResolvedValue(mockVehicleRef);

      const vehicleData = {
        team_id: 'team123',
        name: 'Test Vehicle',
        type: 'bicycle',
      };

      await createVehicle(vehicleData);

      const addDocCall = firestore.addDoc.mock.calls[0];
      expect(addDocCall[1].current_usage).toBe(0);
    });
  });

  describe('getVehicle', () => {
    it('should return vehicle data when vehicle exists', async () => {
      const mockVehicleData = {
        team_id: 'team123',
        name: 'My Vehicle',
        type: 'car',
        current_usage: 5000,
      };

      firestore.getDoc.mockResolvedValue({
        exists: () => true,
        id: 'vehicle123',
        data: () => mockVehicleData,
      });

      const vehicle = await getVehicle('vehicle123');

      expect(vehicle).toEqual({
        id: 'vehicle123',
        ...mockVehicleData,
      });
    });

    it('should throw error when vehicle does not exist', async () => {
      firestore.getDoc.mockResolvedValue({
        exists: () => false,
      });

      await expect(getVehicle('nonexistent')).rejects.toThrow('Vehicle not found');
    });
  });

  describe('getTeamVehicles', () => {
    it('should return list of vehicles for team', async () => {
      const mockDocs = [
        {
          id: 'vehicle1',
          data: () => ({ name: 'Vehicle 1', type: 'car' }),
        },
        {
          id: 'vehicle2',
          data: () => ({ name: 'Vehicle 2', type: 'motorcycle' }),
        },
      ];

      firestore.getDocs.mockResolvedValue({
        docs: mockDocs,
      });

      const vehicles = await getTeamVehicles('team123');

      expect(vehicles).toHaveLength(2);
      expect(vehicles[0]).toEqual({
        id: 'vehicle1',
        name: 'Vehicle 1',
        type: 'car',
      });
    });
  });

  describe('updateVehicle', () => {
    it('should update vehicle with new data', async () => {
      await updateVehicle('vehicle123', { name: 'Updated Name' });

      const updateDocCall = firestore.updateDoc.mock.calls[0];
      expect(updateDocCall[1]).toMatchObject({
        name: 'Updated Name',
      });
    });
  });

  describe('deleteVehicle', () => {
    it('should delete vehicle', async () => {
      await deleteVehicle('vehicle123');

      expect(firestore.deleteDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateVehicleUsage', () => {
    it('should update vehicle usage', async () => {
      await updateVehicleUsage('vehicle123', 6000);

      const updateDocCall = firestore.updateDoc.mock.calls[0];
      expect(updateDocCall[1]).toMatchObject({
        current_usage: 6000,
      });
    });
  });
});
