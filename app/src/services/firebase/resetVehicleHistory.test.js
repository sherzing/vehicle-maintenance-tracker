import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetVehicleHistory } from './resetVehicleHistory';
import * as firestore from 'firebase/firestore';

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date(), seconds: Date.now() / 1000 })),
  },
}));

vi.mock('./config', () => ({
  db: {},
}));

describe('resetVehicleHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reset vehicle current_usage to 0', async () => {
    // Mock empty collections
    firestore.getDocs.mockResolvedValue({ docs: [], empty: true });
    firestore.updateDoc.mockResolvedValue();
    firestore.doc.mockReturnValue('vehicle-doc-ref');

    await resetVehicleHistory('vehicle123');

    expect(firestore.updateDoc).toHaveBeenCalledWith(
      'vehicle-doc-ref',
      expect.objectContaining({
        current_usage: 0,
      })
    );
  });

  it('should delete all service history records', async () => {
    const mockServiceHistory = [
      { id: 'service1', ref: 'service1-ref' },
      { id: 'service2', ref: 'service2-ref' },
    ];

    firestore.getDocs.mockImplementation((queryRef) => {
      if (queryRef === 'service-history-query') {
        return Promise.resolve({
          docs: mockServiceHistory,
          empty: false,
        });
      }
      return Promise.resolve({ docs: [], empty: true });
    });

    firestore.query.mockImplementation((collection) => {
      if (collection === 'service_history-collection') {
        return 'service-history-query';
      }
      return 'other-query';
    });

    firestore.collection.mockImplementation((db, name) => {
      if (name === 'service_history') return 'service_history-collection';
      return 'other-collection';
    });

    firestore.deleteDoc.mockResolvedValue();
    firestore.updateDoc.mockResolvedValue();
    firestore.doc.mockReturnValue('vehicle-doc-ref');

    await resetVehicleHistory('vehicle123');

    expect(firestore.deleteDoc).toHaveBeenCalledTimes(2);
    expect(firestore.deleteDoc).toHaveBeenCalledWith('service1-ref');
    expect(firestore.deleteDoc).toHaveBeenCalledWith('service2-ref');
  });

  it('should delete all usage history records', async () => {
    const mockUsageHistory = [
      { id: 'usage1', ref: 'usage1-ref' },
      { id: 'usage2', ref: 'usage2-ref' },
      { id: 'usage3', ref: 'usage3-ref' },
    ];

    firestore.getDocs.mockImplementation((queryRef) => {
      if (queryRef === 'usage-history-query') {
        return Promise.resolve({
          docs: mockUsageHistory,
          empty: false,
        });
      }
      return Promise.resolve({ docs: [], empty: true });
    });

    firestore.query.mockImplementation((collection) => {
      if (collection === 'usage_history-collection') {
        return 'usage-history-query';
      }
      return 'other-query';
    });

    firestore.collection.mockImplementation((db, name) => {
      if (name === 'usage_history') return 'usage_history-collection';
      return 'other-collection';
    });

    firestore.deleteDoc.mockResolvedValue();
    firestore.updateDoc.mockResolvedValue();
    firestore.doc.mockReturnValue('vehicle-doc-ref');

    await resetVehicleHistory('vehicle123');

    expect(firestore.deleteDoc).toHaveBeenCalledTimes(3);
    expect(firestore.deleteDoc).toHaveBeenCalledWith('usage1-ref');
    expect(firestore.deleteDoc).toHaveBeenCalledWith('usage2-ref');
    expect(firestore.deleteDoc).toHaveBeenCalledWith('usage3-ref');
  });

  it('should reset all maintenance items to null last serviced values', async () => {
    const mockMaintenanceItems = [
      {
        id: 'item1',
        ref: 'item1-ref',
        data: () => ({
          name: 'Oil Change',
          last_serviced_date: { toDate: () => new Date() },
          last_serviced_usage: 50000,
        }),
      },
      {
        id: 'item2',
        ref: 'item2-ref',
        data: () => ({
          name: 'Tire Rotation',
          last_serviced_date: { toDate: () => new Date() },
          last_serviced_usage: 45000,
        }),
      },
    ];

    firestore.getDocs.mockImplementation((queryRef) => {
      if (queryRef === 'maintenance-items-query') {
        return Promise.resolve({
          docs: mockMaintenanceItems,
          empty: false,
        });
      }
      return Promise.resolve({ docs: [], empty: true });
    });

    firestore.query.mockImplementation((collection) => {
      if (collection === 'maintenance_items-collection') {
        return 'maintenance-items-query';
      }
      return 'other-query';
    });

    firestore.collection.mockImplementation((db, name) => {
      if (name === 'maintenance_items') return 'maintenance_items-collection';
      return 'other-collection';
    });

    firestore.updateDoc.mockResolvedValue();
    firestore.doc.mockReturnValue('vehicle-doc-ref');

    await resetVehicleHistory('vehicle123');

    // Should update each maintenance item
    expect(firestore.updateDoc).toHaveBeenCalledWith(
      'item1-ref',
      expect.objectContaining({
        last_serviced_date: null,
        last_serviced_usage: null,
      })
    );

    expect(firestore.updateDoc).toHaveBeenCalledWith(
      'item2-ref',
      expect.objectContaining({
        last_serviced_date: null,
        last_serviced_usage: null,
      })
    );
  });

  it('should handle vehicles with no history records', async () => {
    firestore.getDocs.mockResolvedValue({ docs: [], empty: true });
    firestore.updateDoc.mockResolvedValue();
    firestore.doc.mockReturnValue('vehicle-doc-ref');

    await resetVehicleHistory('vehicle123');

    // Should still update vehicle
    expect(firestore.updateDoc).toHaveBeenCalledWith(
      'vehicle-doc-ref',
      expect.objectContaining({
        current_usage: 0,
      })
    );

    // Should not call deleteDoc
    expect(firestore.deleteDoc).not.toHaveBeenCalled();
  });

  it('should update vehicle updated_at timestamp', async () => {
    firestore.getDocs.mockResolvedValue({ docs: [], empty: true });
    firestore.updateDoc.mockResolvedValue();
    firestore.doc.mockReturnValue('vehicle-doc-ref');

    await resetVehicleHistory('vehicle123');

    expect(firestore.updateDoc).toHaveBeenCalledWith(
      'vehicle-doc-ref',
      expect.objectContaining({
        current_usage: 0,
        updated_at: expect.anything(),
      })
    );
  });

  it('should throw error if vehicle update fails', async () => {
    firestore.getDocs.mockResolvedValue({ docs: [], empty: true });
    firestore.updateDoc.mockRejectedValue(new Error('Permission denied'));
    firestore.doc.mockReturnValue('vehicle-doc-ref');

    await expect(resetVehicleHistory('vehicle123')).rejects.toThrow('Permission denied');
  });

  it('should throw error if service history deletion fails', async () => {
    const mockServiceHistory = [
      { id: 'service1', ref: 'service1-ref' },
    ];

    firestore.getDocs.mockImplementation((queryRef) => {
      if (queryRef === 'service-history-query') {
        return Promise.resolve({
          docs: mockServiceHistory,
          empty: false,
        });
      }
      return Promise.resolve({ docs: [], empty: true });
    });

    firestore.query.mockImplementation((collection) => {
      if (collection === 'service_history-collection') {
        return 'service-history-query';
      }
      return 'other-query';
    });

    firestore.collection.mockImplementation((db, name) => {
      if (name === 'service_history') return 'service_history-collection';
      return 'other-collection';
    });

    firestore.deleteDoc.mockRejectedValue(new Error('Delete failed'));
    firestore.doc.mockReturnValue('vehicle-doc-ref');

    await expect(resetVehicleHistory('vehicle123')).rejects.toThrow('Delete failed');
  });

  it('should complete all operations in correct order', async () => {
    const mockServiceHistory = [{ id: 'service1', ref: 'service1-ref' }];
    const mockUsageHistory = [{ id: 'usage1', ref: 'usage1-ref' }];
    const mockMaintenanceItems = [
      {
        id: 'item1',
        ref: 'item1-ref',
        data: () => ({ name: 'Oil Change' }),
      },
    ];

    let queryCallCount = 0;
    firestore.getDocs.mockImplementation(() => {
      queryCallCount++;
      if (queryCallCount === 1) {
        // First call: service history
        return Promise.resolve({ docs: mockServiceHistory, empty: false });
      } else if (queryCallCount === 2) {
        // Second call: usage history
        return Promise.resolve({ docs: mockUsageHistory, empty: false });
      } else if (queryCallCount === 3) {
        // Third call: maintenance items
        return Promise.resolve({ docs: mockMaintenanceItems, empty: false });
      }
      return Promise.resolve({ docs: [], empty: true });
    });

    firestore.deleteDoc.mockResolvedValue();
    firestore.updateDoc.mockResolvedValue();
    firestore.doc.mockReturnValue('vehicle-doc-ref');
    firestore.collection.mockReturnValue('collection');
    firestore.query.mockReturnValue('query');

    await resetVehicleHistory('vehicle123');

    // Should delete service history (1), usage history (1), update maintenance items (1), update vehicle (1)
    expect(firestore.deleteDoc).toHaveBeenCalledTimes(2);
    expect(firestore.updateDoc).toHaveBeenCalledTimes(2);
  });

  it('should return success result with counts', async () => {
    const mockServiceHistory = [
      { id: 'service1', ref: 'ref1' },
      { id: 'service2', ref: 'ref2' },
    ];
    const mockUsageHistory = [{ id: 'usage1', ref: 'ref3' }];
    const mockMaintenanceItems = [
      { id: 'item1', ref: 'ref4', data: () => ({ name: 'Item 1' }) },
      { id: 'item2', ref: 'ref5', data: () => ({ name: 'Item 2' }) },
      { id: 'item3', ref: 'ref6', data: () => ({ name: 'Item 3' }) },
    ];

    let queryCallCount = 0;
    firestore.getDocs.mockImplementation(() => {
      queryCallCount++;
      if (queryCallCount === 1) return Promise.resolve({ docs: mockServiceHistory, empty: false });
      if (queryCallCount === 2) return Promise.resolve({ docs: mockUsageHistory, empty: false });
      if (queryCallCount === 3) return Promise.resolve({ docs: mockMaintenanceItems, empty: false });
      return Promise.resolve({ docs: [], empty: true });
    });

    firestore.deleteDoc.mockResolvedValue();
    firestore.updateDoc.mockResolvedValue();
    firestore.doc.mockReturnValue('vehicle-doc-ref');
    firestore.collection.mockReturnValue('collection');
    firestore.query.mockReturnValue('query');

    const result = await resetVehicleHistory('vehicle123');

    expect(result).toEqual({
      success: true,
      serviceHistoryDeleted: 2,
      usageHistoryDeleted: 1,
      maintenanceItemsReset: 3,
    });
  });

  describe('Keep Maintenance Items Option', () => {
    it('should keep and reset maintenance items by default', async () => {
      const mockMaintenanceItems = [
        {
          id: 'item1',
          ref: 'item1-ref',
          data: () => ({
            name: 'Oil Change',
            primary_interval: 5000,
            last_serviced_date: { toDate: () => new Date() },
            last_serviced_usage: 50000,
          }),
        },
      ];

      let queryCallCount = 0;
      firestore.getDocs.mockImplementation(() => {
        queryCallCount++;
        if (queryCallCount === 1 || queryCallCount === 2) {
          // Service and usage history queries
          return Promise.resolve({ docs: [], empty: true });
        } else if (queryCallCount === 3) {
          // Maintenance items query
          return Promise.resolve({ docs: mockMaintenanceItems, empty: false });
        }
        return Promise.resolve({ docs: [], empty: true });
      });

      firestore.updateDoc.mockResolvedValue();
      firestore.doc.mockReturnValue('vehicle-ref');
      firestore.collection.mockReturnValue('collection');
      firestore.query.mockReturnValue('query');

      const options = { keepMaintenanceItems: true };
      const result = await resetVehicleHistory('vehicle123', options);

      // Should reset last_serviced fields to null
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        'item1-ref',
        expect.objectContaining({
          last_serviced_date: null,
          last_serviced_usage: null,
        })
      );

      expect(result.maintenanceItemsReset).toBe(1);
    });

    it('should delete service and usage history even when keeping maintenance items', async () => {
      const mockServiceHistory = [{ id: 'service1', ref: 'service1-ref' }];
      const mockUsageHistory = [{ id: 'usage1', ref: 'usage1-ref' }];

      let queryCallCount = 0;
      firestore.getDocs.mockImplementation(() => {
        queryCallCount++;
        if (queryCallCount === 1) {
          return Promise.resolve({ docs: mockServiceHistory, empty: false });
        } else if (queryCallCount === 2) {
          return Promise.resolve({ docs: mockUsageHistory, empty: false });
        } else if (queryCallCount === 3) {
          return Promise.resolve({ docs: [], empty: true });
        }
        return Promise.resolve({ docs: [], empty: true });
      });

      firestore.deleteDoc.mockResolvedValue();
      firestore.updateDoc.mockResolvedValue();
      firestore.doc.mockReturnValue('vehicle-ref');
      firestore.collection.mockReturnValue('collection');
      firestore.query.mockReturnValue('query');

      const options = { keepMaintenanceItems: true };
      const result = await resetVehicleHistory('vehicle123', options);

      expect(result.serviceHistoryDeleted).toBe(1);
      expect(result.usageHistoryDeleted).toBe(1);
      expect(firestore.deleteDoc).toHaveBeenCalledTimes(2);
    });

    it('should work with default options (keepMaintenanceItems undefined)', async () => {
      const mockMaintenanceItems = [
        {
          id: 'item1',
          ref: 'item1-ref',
          data: () => ({ name: 'Oil Change' }),
        },
      ];

      let queryCallCount = 0;
      firestore.getDocs.mockImplementation(() => {
        queryCallCount++;
        if (queryCallCount === 1 || queryCallCount === 2) {
          return Promise.resolve({ docs: [], empty: true });
        } else if (queryCallCount === 3) {
          return Promise.resolve({ docs: mockMaintenanceItems, empty: false });
        }
        return Promise.resolve({ docs: [], empty: true });
      });

      firestore.updateDoc.mockResolvedValue();
      firestore.doc.mockReturnValue('vehicle-ref');
      firestore.collection.mockReturnValue('collection');
      firestore.query.mockReturnValue('query');

      // Call without options - should behave the same (reset maintenance items)
      const result = await resetVehicleHistory('vehicle123');

      expect(result.maintenanceItemsReset).toBe(1);
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        'item1-ref',
        expect.objectContaining({
          last_serviced_date: null,
          last_serviced_usage: null,
        })
      );
    });
  });
});
