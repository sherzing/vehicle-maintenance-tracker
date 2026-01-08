import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  logUsageUpdate,
  getVehicleUsageHistory,
  updateUsageHistory,
  deleteUsageHistory,
} from './usageHistory';
import * as firestore from 'firebase/firestore';
import * as vehicles from './vehicles';

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
  runTransaction: vi.fn(),
}));

vi.mock('./config', () => ({
  db: {},
}));

// Mock vehicles service
vi.mock('./vehicles', () => ({
  updateVehicle: vi.fn(),
  getVehicle: vi.fn(),
}));

describe('usageHistory service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logUsageUpdate', () => {
    it('should create usage history entry with all fields', async () => {
      const mockUsageRef = { id: 'usage123' };
      firestore.addDoc.mockResolvedValue(mockUsageRef);

      // Mock getVehicleUsageHistory to return this as most recent
      firestore.getDocs.mockResolvedValue({
        docs: [{
          id: 'usage123',
          data: () => ({
            usage: 55000,
            date: new Date('2024-01-20'),
          }),
        }],
      });

      const date = new Date('2024-01-20');
      await logUsageUpdate('vehicle123', 55000, date, 'track day', 'Laguna Seca', 'user123');

      // Check that addDoc was called with correct data including version
      const addDocCall = firestore.addDoc.mock.calls[0];
      expect(addDocCall[1]).toMatchObject({
        vehicle_id: 'vehicle123',
        usage: 55000,
        date: date,
        usage_type: 'track day',
        location: 'Laguna Seca',
        created_by: 'user123',
        version: 1,
        updated_at: null,
        updated_by: null,
      });

      // Check that vehicle.current_usage was updated
      expect(vehicles.updateVehicle).toHaveBeenCalledWith('vehicle123', {
        current_usage: 55000,
      });
    });

    it('should handle null optional fields and update vehicle current_usage', async () => {
      const mockUsageRef = { id: 'usage123' };
      firestore.addDoc.mockResolvedValue(mockUsageRef);

      firestore.getDocs.mockResolvedValue({
        docs: [{
          id: 'usage123',
          data: () => ({
            usage: 50000,
            date: new Date('2024-01-15'),
          }),
        }],
      });

      const date = new Date('2024-01-15');
      await logUsageUpdate('vehicle123', 50000, date, null, null, 'user123');

      // Verify all required fields are included (including updated_by and version)
      const addDocCall = firestore.addDoc.mock.calls[0];
      expect(addDocCall[1]).toMatchObject({
        vehicle_id: 'vehicle123',
        usage: 50000,
        date: date,
        usage_type: null,
        location: null,
        created_by: 'user123',
        updated_at: null,
        updated_by: null,
        version: 1,
      });

      // Verify vehicle.current_usage is updated even with null optionals
      expect(vehicles.updateVehicle).toHaveBeenCalledWith('vehicle123', {
        current_usage: 50000,
      });
    });

    it('should recalculate current_usage to most recent by date', async () => {
      const mockUsageRef = { id: 'usage456' };
      firestore.addDoc.mockResolvedValue(mockUsageRef);

      // Mock existing history - most recent is 60000 on Jan 25
      firestore.getDocs.mockResolvedValue({
        docs: [
          {
            id: 'usage789',
            data: () => ({
              usage: 60000,
              date: new Date('2024-01-25'),
            }),
          },
          {
            id: 'usage456',
            data: () => ({
              usage: 45000,
              date: new Date('2024-01-10'),
            }),
          },
        ],
      });

      // Log a past usage (Jan 10 with 45000)
      const date = new Date('2024-01-10');
      await logUsageUpdate('vehicle123', 45000, date, null, null, 'user123');

      // Should update to most recent (60000 from Jan 25)
      expect(vehicles.updateVehicle).toHaveBeenCalledWith('vehicle123', {
        current_usage: 60000,
      });
    });
  });

  describe('getVehicleUsageHistory', () => {
    it('should return usage history sorted by date (most recent first)', async () => {
      const mockDocs = [
        {
          id: 'usage1',
          data: () => ({
            usage: 45000,
            date: new Date('2024-01-10'),
            usage_type: 'commute',
          }),
        },
        {
          id: 'usage2',
          data: () => ({
            usage: 50000,
            date: new Date('2024-01-20'),
            usage_type: 'road trip',
          }),
        },
        {
          id: 'usage3',
          data: () => ({
            usage: 40000,
            date: new Date('2024-01-05'),
            usage_type: null,
          }),
        },
      ];

      firestore.getDocs.mockResolvedValue({
        docs: mockDocs,
      });

      const history = await getVehicleUsageHistory('vehicle123');

      expect(history).toHaveLength(3);
      expect(history[0].usage).toBe(50000); // Most recent (Jan 20)
      expect(history[1].usage).toBe(45000); // Jan 10
      expect(history[2].usage).toBe(40000); // Oldest (Jan 5)
    });

    it('should handle Firestore Timestamp objects', async () => {
      const mockDocs = [
        {
          id: 'usage1',
          data: () => ({
            usage: 45000,
            date: { toDate: () => new Date('2024-01-15') },
          }),
        },
        {
          id: 'usage2',
          data: () => ({
            usage: 40000,
            date: { toDate: () => new Date('2024-01-10') },
          }),
        },
      ];

      firestore.getDocs.mockResolvedValue({
        docs: mockDocs,
      });

      const history = await getVehicleUsageHistory('vehicle123');

      expect(history[0].usage).toBe(45000); // More recent
      expect(history[1].usage).toBe(40000);
    });

    it('should return empty array when no history exists', async () => {
      firestore.getDocs.mockResolvedValue({
        docs: [],
      });

      const history = await getVehicleUsageHistory('vehicle123');

      expect(history).toEqual([]);
    });
  });

  describe('updateUsageHistory', () => {
    it('should update usage history entry and recalculate current_usage', async () => {
      // Mock runTransaction to execute the callback
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            vehicle_id: 'vehicle123',
            usage: 45000,
            date: new Date('2024-01-10'),
            version: 1,
          }),
        }),
        update: vi.fn(),
      };

      firestore.runTransaction.mockImplementation(async (db, callback) => {
        return await callback(mockTransaction);
      });

      // Mock getDocs for recalculation - most recent becomes 52000 on Jan 25
      firestore.getDocs.mockResolvedValue({
        docs: [
          {
            id: 'usage1',
            data: () => ({
              usage: 52000,
              date: new Date('2024-01-25'),
            }),
          },
          {
            id: 'usage2',
            data: () => ({
              usage: 48000,
              date: new Date('2024-01-15'),
            }),
          },
        ],
      });

      const newDate = new Date('2024-01-25');
      await updateUsageHistory('usage1', 52000, newDate, 'track day', 'Sonoma', 'user123');

      // Check that transaction.update was called with incremented version
      expect(mockTransaction.update).toHaveBeenCalled();
      const updateCall = mockTransaction.update.mock.calls[0];
      expect(updateCall[1]).toMatchObject({
        usage: 52000,
        date: newDate,
        usage_type: 'track day',
        location: 'Sonoma',
        version: 2, // Version should be incremented
      });

      // Check that current_usage was recalculated
      expect(vehicles.updateVehicle).toHaveBeenCalledWith('vehicle123', {
        current_usage: 52000,
      });
    });

    it('should throw error when usage history entry does not exist', async () => {
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => false,
        }),
        update: vi.fn(),
      };

      firestore.runTransaction.mockImplementation(async (db, callback) => {
        return await callback(mockTransaction);
      });

      await expect(
        updateUsageHistory('nonexistent', 50000, new Date(), null, null, 'user123')
      ).rejects.toThrow('Usage history entry not found');
    });

    it('should recalculate to different entry when date changes', async () => {
      // Mock runTransaction for the entry being updated
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            vehicle_id: 'vehicle123',
            usage: 55000,
            date: new Date('2024-01-25'),
            version: 1,
          }),
        }),
        update: vi.fn(),
      };

      firestore.runTransaction.mockImplementation(async (db, callback) => {
        return await callback(mockTransaction);
      });

      // After update, a different entry is most recent
      firestore.getDocs.mockResolvedValue({
        docs: [
          {
            id: 'usage2',
            data: () => ({
              usage: 48000,
              date: new Date('2024-01-20'),
            }),
          },
          {
            id: 'usage1',
            data: () => ({
              usage: 50000,
              date: new Date('2024-01-15'),
            }),
          },
        ],
      });

      // Change date from Jan 25 to Jan 15 (makes it no longer most recent)
      const newDate = new Date('2024-01-15');
      await updateUsageHistory('usage1', 50000, newDate, null, null, 'user123');

      // Should recalculate to 48000 (new most recent on Jan 20)
      expect(vehicles.updateVehicle).toHaveBeenCalledWith('vehicle123', {
        current_usage: 48000,
      });
    });

    it('should throw version conflict error when expectedVersion does not match', async () => {
      // Mock runTransaction with version 3 in database
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            vehicle_id: 'vehicle123',
            usage: 45000,
            date: new Date('2024-01-10'),
            version: 3, // Current version is 3
          }),
        }),
        update: vi.fn(),
      };

      firestore.runTransaction.mockImplementation(async (db, callback) => {
        return await callback(mockTransaction);
      });

      // Try to update with expectedVersion = 1 (conflict!)
      await expect(
        updateUsageHistory('usage1', 50000, new Date('2024-01-15'), null, null, 'user123', 1)
      ).rejects.toThrow('Version conflict: This entry was modified by another user. Please refresh and try again.');
    });

    it('should increment version without conflict when expectedVersion is null', async () => {
      // Mock runTransaction with version 5 in database
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            vehicle_id: 'vehicle123',
            usage: 45000,
            date: new Date('2024-01-10'),
            version: 5,
          }),
        }),
        update: vi.fn(),
      };

      firestore.runTransaction.mockImplementation(async (db, callback) => {
        return await callback(mockTransaction);
      });

      // Mock getDocs for recalculation
      firestore.getDocs.mockResolvedValue({
        docs: [{
          id: 'usage1',
          data: () => ({
            usage: 50000,
            date: new Date('2024-01-15'),
          }),
        }],
      });

      const newDate = new Date('2024-01-15');
      // Not passing expectedVersion (null) - should succeed regardless of current version
      await updateUsageHistory('usage1', 50000, newDate, null, null, 'user123');

      // Should increment version from 5 to 6
      const updateCall = mockTransaction.update.mock.calls[0];
      expect(updateCall[1]).toMatchObject({
        version: 6,
      });
    });

    it('should handle entries without version field (legacy data)', async () => {
      // Mock runTransaction with no version field (legacy entry)
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            vehicle_id: 'vehicle123',
            usage: 45000,
            date: new Date('2024-01-10'),
            // No version field
          }),
        }),
        update: vi.fn(),
      };

      firestore.runTransaction.mockImplementation(async (db, callback) => {
        return await callback(mockTransaction);
      });

      // Mock getDocs for recalculation
      firestore.getDocs.mockResolvedValue({
        docs: [{
          id: 'usage1',
          data: () => ({
            usage: 50000,
            date: new Date('2024-01-15'),
          }),
        }],
      });

      const newDate = new Date('2024-01-15');
      await updateUsageHistory('usage1', 50000, newDate, null, null, 'user123');

      // Should default to version 1 and increment to 2
      const updateCall = mockTransaction.update.mock.calls[0];
      expect(updateCall[1]).toMatchObject({
        version: 2, // 1 (default) + 1
      });
    });
  });

  describe('deleteUsageHistory', () => {
    it('should delete usage history and update current_usage to next most recent', async () => {
      // Mock getDoc for the entry being deleted
      firestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          vehicle_id: 'vehicle123',
        }),
      });

      // After deletion, remaining entries
      firestore.getDocs.mockResolvedValue({
        docs: [
          {
            id: 'usage2',
            data: () => ({
              usage: 45000,
              date: new Date('2024-01-10'),
            }),
          },
          {
            id: 'usage3',
            data: () => ({
              usage: 40000,
              date: new Date('2024-01-05'),
            }),
          },
        ],
      });

      await deleteUsageHistory('usage1');

      // Check that deleteDoc was called
      expect(firestore.deleteDoc).toHaveBeenCalledTimes(1);

      // Check that current_usage was updated to most recent remaining
      expect(vehicles.updateVehicle).toHaveBeenCalledWith('vehicle123', {
        current_usage: 45000,
      });
    });

    it('should not update current_usage when no history remains', async () => {
      // Mock getDoc for the entry being deleted
      firestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          vehicle_id: 'vehicle123',
        }),
      });

      // No remaining entries after deletion
      firestore.getDocs.mockResolvedValue({
        docs: [],
      });

      await deleteUsageHistory('usage1');

      // Delete should still be called
      expect(firestore.deleteDoc).toHaveBeenCalledTimes(1);

      // But updateVehicle should NOT be called (no history to base it on)
      expect(vehicles.updateVehicle).not.toHaveBeenCalled();
    });

    it('should throw error when usage history entry does not exist', async () => {
      firestore.getDoc.mockResolvedValue({
        exists: () => false,
      });

      await expect(deleteUsageHistory('nonexistent')).rejects.toThrow(
        'Usage history entry not found'
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle multiple entries on same date', async () => {
      const mockUsageRef = { id: 'usage3' };
      firestore.addDoc.mockResolvedValue(mockUsageRef);

      // Multiple entries on Jan 15
      firestore.getDocs.mockResolvedValue({
        docs: [
          {
            id: 'usage1',
            data: () => ({
              usage: 50000,
              date: new Date('2024-01-15'),
            }),
          },
          {
            id: 'usage2',
            data: () => ({
              usage: 50500,
              date: new Date('2024-01-15'),
            }),
          },
        ],
      });

      const date = new Date('2024-01-15');
      await logUsageUpdate('vehicle123', 50000, date, null, null, 'user123');

      // Should use first entry (deterministic but arbitrary)
      expect(vehicles.updateVehicle).toHaveBeenCalledWith('vehicle123', {
        current_usage: 50000,
      });
    });

    it('should handle decimal usage values', async () => {
      const mockUsageRef = { id: 'usage123' };
      firestore.addDoc.mockResolvedValue(mockUsageRef);

      firestore.getDocs.mockResolvedValue({
        docs: [{
          id: 'usage123',
          data: () => ({
            usage: 123.5,
            date: new Date('2024-01-15'),
          }),
        }],
      });

      const date = new Date('2024-01-15');
      await logUsageUpdate('vehicle123', 123.5, date, null, null, 'user123');

      const addDocCall = firestore.addDoc.mock.calls[0];
      expect(addDocCall[1].usage).toBe(123.5);
    });

    it('should handle zero usage value', async () => {
      const mockUsageRef = { id: 'usage123' };
      firestore.addDoc.mockResolvedValue(mockUsageRef);

      firestore.getDocs.mockResolvedValue({
        docs: [{
          id: 'usage123',
          data: () => ({
            usage: 0,
            date: new Date('2024-01-01'),
          }),
        }],
      });

      const date = new Date('2024-01-01');
      await logUsageUpdate('vehicle123', 0, date, 'initial', null, 'user123');

      const addDocCall = firestore.addDoc.mock.calls[0];
      expect(addDocCall[1].usage).toBe(0);
    });
  });
});
