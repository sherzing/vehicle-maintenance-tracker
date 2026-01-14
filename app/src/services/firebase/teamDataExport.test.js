import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportTeamData, importTeamData, validateImportData } from './teamDataExport';
import * as firestore from 'firebase/firestore';

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: {
    fromDate: vi.fn((date) => ({ toDate: () => date, seconds: date.getTime() / 1000 })),
    now: vi.fn(() => ({ toDate: () => new Date(), seconds: Date.now() / 1000 })),
  },
}));

vi.mock('./config', () => ({
  db: {},
}));

describe('teamDataExport service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportTeamData', () => {
    it('should export team data with all vehicles and their history', async () => {
      const mockVehicles = [
        {
          id: 'vehicle1',
          data: () => ({
            name: 'Car 1',
            type: 'car',
            make: 'Toyota',
            model: 'Camry',
            year: 2020,
            current_usage: 50000,
            team_id: 'team123',
          }),
        },
        {
          id: 'vehicle2',
          data: () => ({
            name: 'Bike 1',
            type: 'motorcycle',
            make: 'Honda',
            model: 'CBR',
            year: 2021,
            current_usage: 5000,
            team_id: 'team123',
          }),
        },
      ];

      const mockMaintenanceItems = [
        {
          id: 'item1',
          data: () => ({
            name: 'Oil Change',
            primary_interval: 5000,
            secondary_interval: 6,
          }),
        },
      ];

      const mockServiceHistory = [
        {
          id: 'service1',
          data: () => ({
            type: 'service',
            service_date: { toDate: () => new Date('2024-01-01') },
            usage_at_service: 45000,
          }),
        },
      ];

      const mockUsageHistory = [
        {
          id: 'usage1',
          data: () => ({
            usage: 50000,
            date: { toDate: () => new Date('2024-01-15') },
          }),
        },
      ];

      // Mock getDocs to return different data for each collection
      firestore.getDocs.mockImplementation((queryRef) => {
        // Determine which collection based on the query
        if (queryRef === 'vehicles-query') {
          return Promise.resolve({ docs: mockVehicles, empty: false });
        } else if (queryRef === 'maintenance-query') {
          return Promise.resolve({ docs: mockMaintenanceItems, empty: false });
        } else if (queryRef === 'service-query') {
          return Promise.resolve({ docs: mockServiceHistory, empty: false });
        } else if (queryRef === 'usage-query') {
          return Promise.resolve({ docs: mockUsageHistory, empty: false });
        }
        return Promise.resolve({ docs: [], empty: true });
      });

      firestore.query.mockImplementation(() => 'vehicles-query');
      firestore.collection.mockReturnValue('mock-collection');

      const result = await exportTeamData('team123');

      expect(result).toHaveProperty('exportDate');
      expect(result).toHaveProperty('teamId', 'team123');
      expect(result).toHaveProperty('vehicles');
      expect(result.vehicles).toHaveLength(2);
      expect(result.vehicles[0]).toHaveProperty('vehicleData');
      expect(result.vehicles[0]).toHaveProperty('maintenanceItems');
      expect(result.vehicles[0]).toHaveProperty('serviceHistory');
      expect(result.vehicles[0]).toHaveProperty('usageHistory');
    });

    it('should handle teams with no vehicles', async () => {
      firestore.getDocs.mockResolvedValue({ docs: [], empty: true });
      firestore.query.mockReturnValue('empty-query');

      const result = await exportTeamData('team123');

      expect(result.vehicles).toHaveLength(0);
      expect(result.teamId).toBe('team123');
    });

    it('should convert Firestore timestamps to ISO strings', async () => {
      const mockDate = new Date('2024-01-01T12:00:00Z');
      const mockVehicles = [
        {
          id: 'vehicle1',
          data: () => ({
            name: 'Car 1',
            created_at: { toDate: () => mockDate },
            team_id: 'team123',
          }),
        },
      ];

      firestore.getDocs.mockImplementation((queryRef) => {
        if (queryRef === 'vehicles-query') {
          return Promise.resolve({ docs: mockVehicles, empty: false });
        }
        return Promise.resolve({ docs: [], empty: true });
      });

      firestore.query.mockReturnValue('vehicles-query');

      const result = await exportTeamData('team123');

      expect(result.vehicles[0].vehicleData.created_at).toBe(mockDate.toISOString());
    });
  });

  describe('validateImportData', () => {
    const validData = {
      teamId: 'team123',
      exportDate: new Date().toISOString(),
      vehicles: [
        {
          vehicleData: {
            name: 'Car 1',
            type: 'car',
            make: 'Toyota',
            model: 'Camry',
            year: 2020,
          },
          maintenanceItems: [],
          serviceHistory: [],
          usageHistory: [],
        },
      ],
    };

    it('should validate correct import data structure', () => {
      const result = validateImportData(validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject data without teamId', () => {
      const invalidData = { ...validData };
      delete invalidData.teamId;

      const result = validateImportData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing teamId');
    });

    it('should reject data without vehicles array', () => {
      const invalidData = { ...validData };
      delete invalidData.vehicles;

      const result = validateImportData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid vehicles array');
    });

    it('should reject vehicles without required fields', () => {
      const invalidData = {
        ...validData,
        vehicles: [
          {
            vehicleData: { type: 'car' }, // missing name, make, model, year
            maintenanceItems: [],
            serviceHistory: [],
            usageHistory: [],
          },
        ],
      };

      const result = validateImportData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate vehicle type is valid', () => {
      const invalidData = {
        ...validData,
        vehicles: [
          {
            ...validData.vehicles[0],
            vehicleData: {
              ...validData.vehicles[0].vehicleData,
              type: 'invalid-type',
            },
          },
        ],
      };

      const result = validateImportData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('type'))).toBe(true);
    });
  });

  describe('importTeamData', () => {
    const validImportData = {
      teamId: 'team123',
      exportDate: new Date().toISOString(),
      vehicles: [
        {
          vehicleData: {
            name: 'Imported Car',
            type: 'car',
            make: 'Toyota',
            model: 'Camry',
            year: 2020,
            current_usage: 50000,
            unit: 'km',
          },
          maintenanceItems: [
            {
              name: 'Oil Change',
              primary_interval: 5000,
              secondary_interval: 6,
            },
          ],
          serviceHistory: [],
          usageHistory: [],
        },
      ],
    };

    it('should import vehicles with new mode', async () => {
      firestore.addDoc.mockResolvedValue({ id: 'new-vehicle-id' });
      firestore.setDoc.mockResolvedValue();

      const result = await importTeamData('team123', validImportData, 'new', 'user123');

      expect(firestore.addDoc).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.vehiclesImported).toBe(1);
    });

    it('should validate data before import', async () => {
      const invalidData = { teamId: 'team123' }; // missing vehicles

      await expect(importTeamData('team123', invalidData, 'new', 'user123')).rejects.toThrow();
    });

    it('should handle import errors gracefully', async () => {
      firestore.addDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(
        importTeamData('team123', validImportData, 'new', 'user123')
      ).rejects.toThrow('Firestore error');
    });

    it('should import all vehicle data including maintenance items', async () => {
      const vehicleId = 'new-vehicle-id';
      firestore.addDoc.mockResolvedValue({ id: vehicleId });
      firestore.setDoc.mockResolvedValue();

      await importTeamData('team123', validImportData, 'new', 'user123');

      // Should create vehicle
      const addDocCall = firestore.addDoc.mock.calls[0];
      expect(addDocCall[1]).toMatchObject({
        name: 'Imported Car',
        type: 'car',
        team_id: 'team123',
      });

      // Should create maintenance items
      const setDocCall = firestore.setDoc.mock.calls[0];
      expect(setDocCall[1]).toMatchObject({
        name: 'Oil Change',
        primary_interval: 5000,
        vehicle_id: vehicleId,
      });
    });

    it('should preserve service history with correct dates', async () => {
      const dataWithHistory = {
        ...validImportData,
        vehicles: [
          {
            ...validImportData.vehicles[0],
            serviceHistory: [
              {
                type: 'service',
                service_date: '2024-01-01T00:00:00.000Z',
                usage_at_service: 45000,
              },
            ],
          },
        ],
      };

      firestore.addDoc.mockResolvedValue({ id: 'vehicle-id' });
      firestore.setDoc.mockResolvedValue();
      firestore.Timestamp.fromDate.mockImplementation((date) => ({
        toDate: () => date,
      }));

      await importTeamData('team123', dataWithHistory, 'new', 'user123');

      // Check that setDoc was called with service history (2nd call after maintenance item)
      const serviceHistoryCall = firestore.setDoc.mock.calls[1];
      expect(serviceHistoryCall[1]).toMatchObject({
        type: 'service',
        usage_at_service: 45000,
        vehicle_id: 'vehicle-id',
      });
      expect(serviceHistoryCall[1].service_date).toBeDefined();
    });

    describe('Partial Import Modes', () => {
      const completeData = {
        teamId: 'team123',
        exportDate: new Date().toISOString(),
        vehicles: [
          {
            vehicleData: {
              name: 'Test Car',
              type: 'car',
              make: 'Toyota',
              model: 'Camry',
              year: 2020,
              current_usage: 50000,
              unit: 'km',
            },
            maintenanceItems: [
              { name: 'Oil Change', primary_interval: 5000 },
              { name: 'Tire Rotation', primary_interval: 10000 },
            ],
            serviceHistory: [
              { type: 'service', service_date: '2024-01-01T00:00:00.000Z', usage_at_service: 45000 },
            ],
            usageHistory: [
              { usage: 50000, date: '2024-01-15T00:00:00.000Z' },
            ],
          },
        ],
      };

      beforeEach(() => {
        firestore.addDoc.mockResolvedValue({ id: 'new-vehicle-id' });
        firestore.setDoc.mockResolvedValue();
        vi.clearAllMocks();
      });

      it('should import vehicle-only (no maintenance, no history) when mode is vehicle-only', async () => {
        const result = await importTeamData('team123', completeData, 'vehicle-only', 'user123');

        expect(result.success).toBe(true);
        expect(result.vehiclesImported).toBe(1);
        expect(result.maintenanceItemsImported).toBe(0);
        expect(result.serviceHistoryImported).toBe(0);
        expect(result.usageHistoryImported).toBe(0);

        // Should only create vehicle
        expect(firestore.addDoc).toHaveBeenCalledTimes(1);
        expect(firestore.setDoc).not.toHaveBeenCalled();
      });

      it('should import vehicle + maintenance items only when mode is vehicle-maintenance-items', async () => {
        const result = await importTeamData('team123', completeData, 'vehicle-maintenance-items', 'user123');

        expect(result.success).toBe(true);
        expect(result.vehiclesImported).toBe(1);
        expect(result.maintenanceItemsImported).toBe(2);
        expect(result.serviceHistoryImported).toBe(0);
        expect(result.usageHistoryImported).toBe(0);

        // Should create vehicle + maintenance items
        expect(firestore.addDoc).toHaveBeenCalledTimes(1); // vehicle
        expect(firestore.setDoc).toHaveBeenCalledTimes(2); // 2 maintenance items
      });

      it('should import vehicle + maintenance (no usage) when mode is vehicle-maintenance', async () => {
        const result = await importTeamData('team123', completeData, 'vehicle-maintenance', 'user123');

        expect(result.success).toBe(true);
        expect(result.vehiclesImported).toBe(1);
        expect(result.maintenanceItemsImported).toBe(2);
        expect(result.serviceHistoryImported).toBe(1);
        expect(result.usageHistoryImported).toBe(0);

        // Should create vehicle + maintenance items + service history
        expect(firestore.addDoc).toHaveBeenCalledTimes(1); // vehicle
        expect(firestore.setDoc).toHaveBeenCalledTimes(3); // 2 maintenance items + 1 service
      });

      it('should import everything when mode is full (default)', async () => {
        const result = await importTeamData('team123', completeData, 'full', 'user123');

        expect(result.success).toBe(true);
        expect(result.vehiclesImported).toBe(1);
        expect(result.maintenanceItemsImported).toBe(2);
        expect(result.serviceHistoryImported).toBe(1);
        expect(result.usageHistoryImported).toBe(1);

        // Should create everything
        expect(firestore.addDoc).toHaveBeenCalledTimes(1); // vehicle
        expect(firestore.setDoc).toHaveBeenCalledTimes(4); // 2 maintenance + 1 service + 1 usage
      });

      it('should default to full import when mode is not specified', async () => {
        const result = await importTeamData('team123', completeData, undefined, 'user123');

        expect(result.vehiclesImported).toBe(1);
        expect(result.maintenanceItemsImported).toBe(2);
        expect(result.serviceHistoryImported).toBe(1);
        expect(result.usageHistoryImported).toBe(1);
      });
    });

    describe('Overwrite Existing Vehicles', () => {
      const importData = {
        teamId: 'team123',
        vehicles: [
          {
            vehicleData: {
              name: 'Updated Car',
              type: 'car',
              make: 'Toyota',
              model: 'Camry',
              year: 2021,
              vin: 'VIN12345',
              current_usage: 60000,
              unit: 'km',
            },
            maintenanceItems: [{ name: 'New Oil Change', primary_interval: 7500 }],
            serviceHistory: [],
            usageHistory: [],
          },
        ],
      };

      beforeEach(() => {
        vi.clearAllMocks();
      });

      it('should skip existing vehicle when overwrite is false', async () => {
        // Mock getDocs to return existing vehicle with same VIN
        firestore.getDocs.mockResolvedValue({
          docs: [
            {
              id: 'existing-vehicle-id',
              data: () => ({ vin: 'VIN12345', name: 'Old Car' }),
            },
          ],
        });

        const options = { overwriteExisting: false };
        const result = await importTeamData('team123', importData, 'full', 'user123', options);

        expect(result.vehiclesImported).toBe(0);
        expect(result.vehiclesSkipped).toBe(1);
        expect(firestore.addDoc).not.toHaveBeenCalled();
      });

      it('should replace existing vehicle when overwrite is true', async () => {
        // Mock getDocs to return existing vehicle
        firestore.getDocs.mockResolvedValueOnce({
          docs: [
            {
              id: 'existing-vehicle-id',
              ref: 'existing-vehicle-ref',
              data: () => ({ vin: 'VIN12345', name: 'Old Car' }),
            },
          ],
        });

        // Mock deleteDoc
        firestore.deleteDoc = vi.fn().mockResolvedValue();

        // Mock addDoc for new vehicle
        firestore.addDoc.mockResolvedValue({ id: 'new-vehicle-id' });
        firestore.setDoc.mockResolvedValue();

        const options = { overwriteExisting: true };
        const result = await importTeamData('team123', importData, 'full', 'user123', options);

        expect(result.vehiclesImported).toBe(1);
        expect(result.vehiclesReplaced).toBe(1);
        expect(firestore.deleteDoc).toHaveBeenCalled();
        expect(firestore.addDoc).toHaveBeenCalled();
      });

      it('should create new vehicle when VIN does not exist', async () => {
        // Mock getDocs to return no existing vehicles
        firestore.getDocs.mockResolvedValue({ docs: [] });
        firestore.addDoc.mockResolvedValue({ id: 'new-vehicle-id' });
        firestore.setDoc.mockResolvedValue();

        const options = { overwriteExisting: true };
        const result = await importTeamData('team123', importData, 'full', 'user123', options);

        expect(result.vehiclesImported).toBe(1);
        expect(result.vehiclesReplaced).toBe(0);
        expect(firestore.addDoc).toHaveBeenCalled();
      });

      it('should handle vehicles without VIN (always create new)', async () => {
        const dataWithoutVIN = {
          ...importData,
          vehicles: [
            {
              ...importData.vehicles[0],
              vehicleData: {
                ...importData.vehicles[0].vehicleData,
                vin: undefined,
              },
            },
          ],
        };

        firestore.addDoc.mockResolvedValue({ id: 'new-vehicle-id' });
        firestore.setDoc.mockResolvedValue();

        const options = { overwriteExisting: true };
        const result = await importTeamData('team123', dataWithoutVIN, 'full', 'user123', options);

        expect(result.vehiclesImported).toBe(1);
        expect(result.vehiclesReplaced).toBe(0);
        // Should not check for existing vehicles when no VIN
        expect(firestore.getDocs).not.toHaveBeenCalled();
      });
    });
  });
});
