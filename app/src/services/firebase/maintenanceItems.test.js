import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMaintenanceItem,
  getMaintenanceItem,
  getVehicleMaintenanceItems,
  updateMaintenanceItem,
  deleteMaintenanceItem,
  logService,
} from './maintenanceItems';
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
  serverTimestamp: vi.fn(() => 'TIMESTAMP'),
}));

vi.mock('./config', () => ({
  db: {},
}));

describe('maintenanceItems service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMaintenanceItem', () => {
    it('should create a maintenance item with correct data', async () => {
      const mockItemRef = { id: 'item123' };
      firestore.addDoc.mockResolvedValue(mockItemRef);

      const itemData = {
        vehicle_id: 'vehicle123',
        name: 'Oil change',
        usage_interval: 5000,
        time_interval_days: 90,
      };

      const itemId = await createMaintenanceItem(itemData);

      const addDocCall = firestore.addDoc.mock.calls[0];
      expect(addDocCall[1]).toMatchObject({
        vehicle_id: 'vehicle123',
        name: 'Oil change',
        usage_interval: 5000,
        time_interval_days: 90,
      });
      expect(itemId).toBe('item123');
    });
  });

  describe('getMaintenanceItem', () => {
    it('should return item data when item exists', async () => {
      const mockItemData = {
        vehicle_id: 'vehicle123',
        name: 'Oil change',
        usage_interval: 5000,
      };

      firestore.getDoc.mockResolvedValue({
        exists: () => true,
        id: 'item123',
        data: () => mockItemData,
      });

      const item = await getMaintenanceItem('item123');

      expect(item).toEqual({
        id: 'item123',
        ...mockItemData,
      });
    });

    it('should throw error when item does not exist', async () => {
      firestore.getDoc.mockResolvedValue({
        exists: () => false,
      });

      await expect(getMaintenanceItem('nonexistent')).rejects.toThrow('Maintenance item not found');
    });
  });

  describe('getVehicleMaintenanceItems', () => {
    it('should return list of items for vehicle', async () => {
      const mockDocs = [
        {
          id: 'item1',
          data: () => ({ name: 'Oil change', usage_interval: 5000 }),
        },
        {
          id: 'item2',
          data: () => ({ name: 'Air filter', usage_interval: 10000 }),
        },
      ];

      firestore.getDocs.mockResolvedValue({
        docs: mockDocs,
      });

      const items = await getVehicleMaintenanceItems('vehicle123');

      expect(items).toHaveLength(2);
      expect(items[0].name).toBe('Air filter'); // Sorted alphabetically
      expect(items[1].name).toBe('Oil change');
    });
  });

  describe('updateMaintenanceItem', () => {
    it('should update item with new data', async () => {
      await updateMaintenanceItem('item123', { name: 'Updated Name' });

      const updateDocCall = firestore.updateDoc.mock.calls[0];
      expect(updateDocCall[1]).toMatchObject({
        name: 'Updated Name',
      });
    });
  });

  describe('deleteMaintenanceItem', () => {
    it('should delete item', async () => {
      await deleteMaintenanceItem('item123');

      expect(firestore.deleteDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('logService', () => {
    it('should log service with usage and date', async () => {
      const serviceDate = new Date('2024-01-15');
      await logService('item123', 50000, serviceDate);

      const updateDocCall = firestore.updateDoc.mock.calls[0];
      expect(updateDocCall[1]).toMatchObject({
        last_service_usage: 50000,
        last_service_date: serviceDate,
      });
    });

    it('should use current date if not provided', async () => {
      await logService('item123', 50000);

      const updateDocCall = firestore.updateDoc.mock.calls[0];
      expect(updateDocCall[1].last_service_usage).toBe(50000);
      expect(updateDocCall[1].last_service_date).toBeInstanceOf(Date);
    });
  });
});
