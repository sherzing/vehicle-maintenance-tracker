import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMaintenanceItem,
  getMaintenanceItem,
  getVehicleMaintenanceItems,
  updateMaintenanceItem,
  deleteMaintenanceItem,
  logService,
  logRepair,
  getVehicleServiceHistory,
  getMaintenanceItemServiceHistory,
  updateServiceHistory,
  deleteServiceHistory,
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
      // Mock getDoc for getMaintenanceItem call
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

      const serviceDate = new Date('2024-01-15');
      await logService('item123', 50000, serviceDate);

      // Check that updateDoc was called for the maintenance item
      const updateDocCall = firestore.updateDoc.mock.calls[0];
      expect(updateDocCall[1]).toMatchObject({
        last_service_usage: 50000,
        last_service_date: serviceDate,
      });

      // Check that addDoc was called for the service history entry
      const addDocCall = firestore.addDoc.mock.calls[0];
      expect(addDocCall[1]).toMatchObject({
        maintenance_item_id: 'item123',
        vehicle_id: 'vehicle123',
        item_name: 'Oil change',
        service_usage: 50000,
        service_date: serviceDate,
      });
    });

    it('should use current date if not provided', async () => {
      // Mock getDoc for getMaintenanceItem call
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

      await logService('item123', 50000);

      const updateDocCall = firestore.updateDoc.mock.calls[0];
      expect(updateDocCall[1].last_service_usage).toBe(50000);
      expect(updateDocCall[1].last_service_date).toBeInstanceOf(Date);

      // Check that addDoc was called for the service history entry
      const addDocCall = firestore.addDoc.mock.calls[0];
      expect(addDocCall[1].service_usage).toBe(50000);
      expect(addDocCall[1].service_date).toBeInstanceOf(Date);
    });

    it('should include cost and provider when provided', async () => {
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

      const serviceDate = new Date('2024-01-15');
      await logService('item123', 50000, serviceDate, 120.50, 'Quick Lube');

      // Check that addDoc was called for the service history entry with cost and provider
      const addDocCall = firestore.addDoc.mock.calls[0];
      expect(addDocCall[1]).toMatchObject({
        type: 'service',
        maintenance_item_id: 'item123',
        vehicle_id: 'vehicle123',
        item_name: 'Oil change',
        service_usage: 50000,
        service_date: serviceDate,
        cost: 120.50,
        provider: 'Quick Lube',
      });
    });

    it('should set cost and provider to null when not provided', async () => {
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

      const serviceDate = new Date('2024-01-15');
      await logService('item123', 50000, serviceDate);

      const addDocCall = firestore.addDoc.mock.calls[0];
      expect(addDocCall[1].cost).toBeNull();
      expect(addDocCall[1].provider).toBeNull();
    });
  });

  describe('logRepair', () => {
    it('should create a repair history entry with required fields', async () => {
      const serviceDate = new Date('2024-01-20');
      await logRepair('vehicle123', 'Fixed broken mirror', serviceDate);

      const addDocCall = firestore.addDoc.mock.calls[0];
      expect(addDocCall[1]).toMatchObject({
        type: 'repair',
        maintenance_item_id: null,
        vehicle_id: 'vehicle123',
        item_name: 'Fixed broken mirror',
        service_usage: null,
        service_date: serviceDate,
        cost: null,
        provider: null,
      });
    });

    it('should include cost and provider when provided', async () => {
      const serviceDate = new Date('2024-01-20');
      await logRepair('vehicle123', 'Fixed broken mirror', serviceDate, 85.00, 'Joe\'s Garage');

      const addDocCall = firestore.addDoc.mock.calls[0];
      expect(addDocCall[1]).toMatchObject({
        type: 'repair',
        maintenance_item_id: null,
        vehicle_id: 'vehicle123',
        item_name: 'Fixed broken mirror',
        service_usage: null,
        service_date: serviceDate,
        cost: 85.00,
        provider: 'Joe\'s Garage',
      });
    });

    it('should use current date if not provided', async () => {
      await logRepair('vehicle123', 'Fixed headlight');

      const addDocCall = firestore.addDoc.mock.calls[0];
      expect(addDocCall[1].service_date).toBeInstanceOf(Date);
      expect(addDocCall[1].item_name).toBe('Fixed headlight');
    });
  });

  describe('getVehicleServiceHistory', () => {
    it('should return service history sorted by date (most recent first)', async () => {
      const mockDocs = [
        {
          id: 'history1',
          data: () => ({
            type: 'service',
            service_date: new Date('2024-01-10'),
            item_name: 'Oil change',
          }),
        },
        {
          id: 'history2',
          data: () => ({
            type: 'repair',
            service_date: new Date('2024-01-20'),
            item_name: 'Fixed mirror',
          }),
        },
        {
          id: 'history3',
          data: () => ({
            type: 'service',
            service_date: new Date('2024-01-05'),
            item_name: 'Tire rotation',
          }),
        },
      ];

      firestore.getDocs.mockResolvedValue({
        docs: mockDocs,
      });

      const history = await getVehicleServiceHistory('vehicle123');

      expect(history).toHaveLength(3);
      expect(history[0].item_name).toBe('Fixed mirror'); // Most recent
      expect(history[1].item_name).toBe('Oil change');
      expect(history[2].item_name).toBe('Tire rotation'); // Oldest
    });

    it('should handle Firestore Timestamp objects', async () => {
      const mockDocs = [
        {
          id: 'history1',
          data: () => ({
            type: 'service',
            service_date: { toDate: () => new Date('2024-01-15') },
            item_name: 'Oil change',
          }),
        },
        {
          id: 'history2',
          data: () => ({
            type: 'service',
            service_date: { toDate: () => new Date('2024-01-10') },
            item_name: 'Tire rotation',
          }),
        },
      ];

      firestore.getDocs.mockResolvedValue({
        docs: mockDocs,
      });

      const history = await getVehicleServiceHistory('vehicle123');

      expect(history[0].item_name).toBe('Oil change'); // More recent
      expect(history[1].item_name).toBe('Tire rotation');
    });

    it('should return empty array when no history exists', async () => {
      firestore.getDocs.mockResolvedValue({
        docs: [],
      });

      const history = await getVehicleServiceHistory('vehicle123');

      expect(history).toEqual([]);
    });
  });

  describe('getMaintenanceItemServiceHistory', () => {
    it('should return service history sorted by date (most recent first)', async () => {
      const mockDocs = [
        {
          id: 'history1',
          data: () => ({
            service_date: new Date('2024-01-10'),
            service_usage: 45000,
          }),
        },
        {
          id: 'history2',
          data: () => ({
            service_date: new Date('2024-01-20'),
            service_usage: 50000,
          }),
        },
        {
          id: 'history3',
          data: () => ({
            service_date: new Date('2024-01-05'),
            service_usage: 40000,
          }),
        },
      ];

      firestore.getDocs.mockResolvedValue({
        docs: mockDocs,
      });

      const history = await getMaintenanceItemServiceHistory('item123');

      expect(history).toHaveLength(3);
      expect(history[0].service_usage).toBe(50000); // Most recent
      expect(history[1].service_usage).toBe(45000);
      expect(history[2].service_usage).toBe(40000); // Oldest
    });

    it('should handle Firestore Timestamp objects', async () => {
      const mockDocs = [
        {
          id: 'history1',
          data: () => ({
            service_date: { toDate: () => new Date('2024-01-15') },
            service_usage: 45000,
          }),
        },
        {
          id: 'history2',
          data: () => ({
            service_date: { toDate: () => new Date('2024-01-10') },
            service_usage: 40000,
          }),
        },
      ];

      firestore.getDocs.mockResolvedValue({
        docs: mockDocs,
      });

      const history = await getMaintenanceItemServiceHistory('item123');

      expect(history[0].service_usage).toBe(45000); // More recent
      expect(history[1].service_usage).toBe(40000);
    });

    it('should return empty array when no history exists', async () => {
      firestore.getDocs.mockResolvedValue({
        docs: [],
      });

      const history = await getMaintenanceItemServiceHistory('item123');

      expect(history).toEqual([]);
    });
  });

  describe('updateServiceHistory', () => {
    it('should update service history entry and recalculate maintenance item last service', async () => {
      // Mock getDoc for the history entry
      firestore.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          type: 'service',
          maintenance_item_id: 'item123',
          service_usage: 45000,
          service_date: new Date('2024-01-10'),
        }),
      });

      // Mock getDocs for getMaintenanceItemServiceHistory
      firestore.getDocs.mockResolvedValue({
        docs: [
          {
            id: 'history1',
            data: () => ({
              service_date: new Date('2024-01-20'),
              service_usage: 50000,
            }),
          },
          {
            id: 'history2',
            data: () => ({
              service_date: new Date('2024-01-10'),
              service_usage: 45000,
            }),
          },
        ],
      });

      const newDate = new Date('2024-01-25');
      await updateServiceHistory('history1', 52000, newDate, 100, 'Shop A');

      // Check that updateDoc was called for the history entry
      const updateDocCalls = firestore.updateDoc.mock.calls;
      expect(updateDocCalls[0][1]).toMatchObject({
        service_usage: 52000,
        service_date: newDate,
        cost: 100,
        provider: 'Shop A',
      });

      // Check that updateDoc was called for the maintenance item
      expect(updateDocCalls[1][1]).toMatchObject({
        last_service_usage: 50000,
        last_service_date: new Date('2024-01-20'),
      });
    });

    it('should throw error when history entry does not exist', async () => {
      firestore.getDoc.mockResolvedValue({
        exists: () => false,
      });

      await expect(updateServiceHistory('nonexistent', 50000, new Date())).rejects.toThrow(
        'Service history entry not found'
      );
    });

    it('should not update maintenance item for repair entries', async () => {
      // Mock getDoc for the history entry (repair type)
      firestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          type: 'repair',
          maintenance_item_id: null,
          service_date: new Date('2024-01-10'),
        }),
      });

      const newDate = new Date('2024-01-25');
      await updateServiceHistory('history1', null, newDate, 100, 'Shop A');

      // updateDoc should only be called once (for the history entry, not the maintenance item)
      expect(firestore.updateDoc).toHaveBeenCalledTimes(1);
    });

    it('should update description for repair entries', async () => {
      // Mock getDoc for the history entry (repair type)
      firestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          type: 'repair',
          maintenance_item_id: null,
          item_name: 'Old description',
          service_date: new Date('2024-01-10'),
        }),
      });

      const newDate = new Date('2024-01-25');
      await updateServiceHistory('history1', null, newDate, 100, 'Shop A', 'New description');

      const updateDocCall = firestore.updateDoc.mock.calls[0];
      expect(updateDocCall[1]).toMatchObject({
        item_name: 'New description',
        service_usage: null,
        service_date: newDate,
        cost: 100,
        provider: 'Shop A',
      });
    });

    it('should handle backward compatibility when type is missing', async () => {
      // Mock getDoc for the history entry (no type field)
      firestore.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          maintenance_item_id: 'item123',
          service_usage: 45000,
          service_date: new Date('2024-01-10'),
        }),
      });

      // Mock getDocs for getMaintenanceItemServiceHistory
      firestore.getDocs.mockResolvedValue({
        docs: [
          {
            id: 'history1',
            data: () => ({
              service_date: new Date('2024-01-20'),
              service_usage: 50000,
            }),
          },
        ],
      });

      const newDate = new Date('2024-01-25');
      await updateServiceHistory('history1', 52000, newDate);

      // Should update both history and maintenance item (default to 'service' type)
      expect(firestore.updateDoc).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteServiceHistory', () => {
    it('should delete service history and update maintenance item with most recent remaining service', async () => {
      // Mock getDoc for the history entry
      firestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          type: 'service',
          maintenance_item_id: 'item123',
        }),
      });

      // Mock getDocs for getMaintenanceItemServiceHistory (remaining services after deletion)
      firestore.getDocs.mockResolvedValue({
        docs: [
          {
            id: 'history2',
            data: () => ({
              service_date: new Date('2024-01-10'),
              service_usage: 45000,
            }),
          },
          {
            id: 'history3',
            data: () => ({
              service_date: new Date('2024-01-05'),
              service_usage: 40000,
            }),
          },
        ],
      });

      await deleteServiceHistory('history1');

      // Check that deleteDoc was called
      expect(firestore.deleteDoc).toHaveBeenCalledTimes(1);

      // Check that updateDoc was called for the maintenance item with the most recent remaining service
      const updateDocCall = firestore.updateDoc.mock.calls[0];
      expect(updateDocCall[1]).toMatchObject({
        last_service_usage: 45000,
        last_service_date: new Date('2024-01-10'),
      });
    });

    it('should clear last service fields when no services remain', async () => {
      // Mock getDoc for the history entry
      firestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          type: 'service',
          maintenance_item_id: 'item123',
        }),
      });

      // Mock getDocs for getMaintenanceItemServiceHistory (no remaining services)
      firestore.getDocs.mockResolvedValue({
        docs: [],
      });

      await deleteServiceHistory('history1');

      // Check that updateDoc was called to clear the fields
      const updateDocCall = firestore.updateDoc.mock.calls[0];
      expect(updateDocCall[1]).toMatchObject({
        last_service_usage: null,
        last_service_date: null,
      });
    });

    it('should throw error when history entry does not exist', async () => {
      firestore.getDoc.mockResolvedValue({
        exists: () => false,
      });

      await expect(deleteServiceHistory('nonexistent')).rejects.toThrow(
        'Service history entry not found'
      );
    });

    it('should not update maintenance item for repair entries', async () => {
      // Mock getDoc for the history entry (repair type)
      firestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          type: 'repair',
          maintenance_item_id: null,
        }),
      });

      await deleteServiceHistory('history1');

      // deleteDoc should be called, but updateDoc should not
      expect(firestore.deleteDoc).toHaveBeenCalledTimes(1);
      expect(firestore.updateDoc).not.toHaveBeenCalled();
    });

    it('should handle backward compatibility when type is missing', async () => {
      // Mock getDoc for the history entry (no type field)
      firestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          maintenance_item_id: 'item123',
        }),
      });

      // Mock getDocs for getMaintenanceItemServiceHistory
      firestore.getDocs.mockResolvedValue({
        docs: [
          {
            id: 'history2',
            data: () => ({
              service_date: new Date('2024-01-10'),
              service_usage: 45000,
            }),
          },
        ],
      });

      await deleteServiceHistory('history1');

      // Should delete and update maintenance item (default to 'service' type)
      expect(firestore.deleteDoc).toHaveBeenCalledTimes(1);
      expect(firestore.updateDoc).toHaveBeenCalledTimes(1);
    });
  });
});
