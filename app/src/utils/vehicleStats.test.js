import { describe, it, expect } from 'vitest';
import {
  calculateDaysInService,
  formatDate,
  formatTimelineDate,
  calculateTotalCost,
  calculateNextServiceDue,
} from './vehicleStats';

describe('vehicleStats', () => {
  describe('calculateDaysInService', () => {
    it('should calculate days between creation date and now', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const days = calculateDaysInService(thirtyDaysAgo);
      expect(days).toBe(30);
    });

    it('should handle Firestore Timestamp objects', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const firestoreTimestamp = {
        toDate: () => thirtyDaysAgo,
      };

      const days = calculateDaysInService(firestoreTimestamp);
      expect(days).toBe(30);
    });

    it('should return 0 when createdAt is null', () => {
      const days = calculateDaysInService(null);
      expect(days).toBe(0);
    });

    it('should return 0 when createdAt is undefined', () => {
      const days = calculateDaysInService(undefined);
      expect(days).toBe(0);
    });

    it('should calculate correct days for vehicle created today', () => {
      const today = new Date();
      const days = calculateDaysInService(today);
      expect(days).toBe(0);
    });

    it('should calculate correct days for vehicle created 365 days ago', () => {
      const oneYearAgo = new Date();
      oneYearAgo.setDate(oneYearAgo.getDate() - 365);

      const days = calculateDaysInService(oneYearAgo);
      expect(days).toBe(365);
    });
  });

  describe('formatDate', () => {
    it('should format date as "MMM YYYY"', () => {
      const date = new Date('2024-01-15');
      const formatted = formatDate(date);
      expect(formatted).toBe('Jan 2024');
    });

    it('should handle Firestore Timestamp objects', () => {
      const date = new Date('2024-06-20');
      const firestoreTimestamp = {
        toDate: () => date,
      };

      const formatted = formatDate(firestoreTimestamp);
      expect(formatted).toBe('Jun 2024');
    });

    it('should return "Unknown" when timestamp is null', () => {
      const formatted = formatDate(null);
      expect(formatted).toBe('Unknown');
    });

    it('should return "Unknown" when timestamp is undefined', () => {
      const formatted = formatDate(undefined);
      expect(formatted).toBe('Unknown');
    });

    it('should handle different months correctly', () => {
      expect(formatDate(new Date('2024-12-25'))).toBe('Dec 2024');
      expect(formatDate(new Date('2024-03-10'))).toBe('Mar 2024');
    });
  });

  describe('formatTimelineDate', () => {
    it('should return day and monthYear separately', () => {
      const date = new Date('2024-01-15');
      const result = formatTimelineDate(date);

      expect(result).toEqual({
        day: '15',
        monthYear: 'Jan 2024',
      });
    });

    it('should handle Firestore Timestamp objects', () => {
      const date = new Date('2024-06-05');
      const firestoreTimestamp = {
        toDate: () => date,
      };

      const result = formatTimelineDate(firestoreTimestamp);
      expect(result).toEqual({
        day: '5',
        monthYear: 'Jun 2024',
      });
    });

    it('should return default values when timestamp is null', () => {
      const result = formatTimelineDate(null);
      expect(result).toEqual({
        day: '--',
        monthYear: 'Unknown',
      });
    });

    it('should handle single-digit days', () => {
      const date = new Date('2024-01-05');
      const result = formatTimelineDate(date);
      expect(result.day).toBe('5');
    });

    it('should handle double-digit days', () => {
      const date = new Date('2024-01-25');
      const result = formatTimelineDate(date);
      expect(result.day).toBe('25');
    });
  });

  describe('calculateTotalCost', () => {
    it('should sum costs from service history within time range', () => {
      const now = new Date();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const serviceHistory = [
        { service_date: threeMonthsAgo, cost: 100 },
        { service_date: now, cost: 200 },
      ];

      const total = calculateTotalCost(serviceHistory, 12);
      expect(total).toBe(300);
    });

    it('should exclude entries outside time range', () => {
      const now = new Date();
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const fourteenMonthsAgo = new Date();
      fourteenMonthsAgo.setMonth(fourteenMonthsAgo.getMonth() - 14);

      const serviceHistory = [
        { service_date: twoMonthsAgo, cost: 100 },
        { service_date: sixMonthsAgo, cost: 200 },
        { service_date: fourteenMonthsAgo, cost: 500 }, // Outside 12-month range
      ];

      const total = calculateTotalCost(serviceHistory, 12);
      expect(total).toBe(300); // Only first two entries
    });

    it('should handle Firestore Timestamp objects', () => {
      const now = new Date();
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      const serviceHistory = [
        {
          service_date: { toDate: () => twoMonthsAgo },
          cost: 150,
        },
      ];

      const total = calculateTotalCost(serviceHistory, 12);
      expect(total).toBe(150);
    });

    it('should ignore entries with null cost', () => {
      const now = new Date();
      const serviceHistory = [
        { service_date: now, cost: 100 },
        { service_date: now, cost: null },
        { service_date: now, cost: 50 },
      ];

      const total = calculateTotalCost(serviceHistory, 12);
      expect(total).toBe(150);
    });

    it('should return null when service history is empty', () => {
      const total = calculateTotalCost([], 12);
      expect(total).toBeNull();
    });

    it('should return null when service history is null', () => {
      const total = calculateTotalCost(null, 12);
      expect(total).toBeNull();
    });

    it('should return null when service history is undefined', () => {
      const total = calculateTotalCost(undefined, 12);
      expect(total).toBeNull();
    });

    it('should return null when all costs are null', () => {
      const now = new Date();
      const serviceHistory = [
        { service_date: now, cost: null },
        { service_date: now, cost: null },
      ];

      const total = calculateTotalCost(serviceHistory, 12);
      expect(total).toBeNull();
    });

    it('should use custom time range when specified', () => {
      const now = new Date();
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      const fourMonthsAgo = new Date();
      fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

      const serviceHistory = [
        { service_date: twoMonthsAgo, cost: 100 },
        { service_date: fourMonthsAgo, cost: 200 }, // Outside 3-month range
      ];

      const total = calculateTotalCost(serviceHistory, 3);
      expect(total).toBe(100); // Only first entry within 3 months
    });

    it('should convert string costs to numbers', () => {
      const now = new Date();
      const serviceHistory = [
        { service_date: now, cost: '100' },
        { service_date: now, cost: '50.50' },
      ];

      const total = calculateTotalCost(serviceHistory, 12);
      expect(total).toBe(150.5);
    });
  });

  describe('calculateNextServiceDue', () => {
    it('should return null when no maintenance items exist', () => {
      const result = calculateNextServiceDue([], 50000, 'km');
      expect(result).toBeNull();
    });

    it('should return null when maintenanceItems is null', () => {
      const result = calculateNextServiceDue(null, 50000, 'km');
      expect(result).toBeNull();
    });

    it('should calculate next service for single item', () => {
      const items = [
        {
          name: 'Oil Change',
          usage_interval: 10000,
          last_service_usage: 40000,
        },
      ];

      const result = calculateNextServiceDue(items, 45000, 'km');
      expect(result).toEqual({
        name: 'Oil Change',
        dueUsage: 50000,
        remaining: 'in 5,000 km',
      });
    });

    it('should return item closest to due (highest percentage)', () => {
      const items = [
        {
          name: 'Oil Change',
          usage_interval: 10000,
          last_service_usage: 40000, // Due at 50000, currently 45000 = 50% done
        },
        {
          name: 'Tire Rotation',
          usage_interval: 5000,
          last_service_usage: 44000, // Due at 49000, currently 45000 = 20% done
        },
      ];

      const result = calculateNextServiceDue(items, 45000, 'km');
      expect(result.name).toBe('Oil Change'); // Higher percentage (50% vs 20%)
    });

    it('should return "Due now" when usage exceeds due usage', () => {
      const items = [
        {
          name: 'Oil Change',
          usage_interval: 10000,
          last_service_usage: 40000,
        },
      ];

      const result = calculateNextServiceDue(items, 52000, 'km');
      expect(result).toEqual({
        name: 'Oil Change',
        dueUsage: 50000,
        remaining: 'Due now',
      });
    });

    it('should handle items with no last service (last_service_usage = 0)', () => {
      const items = [
        {
          name: 'First Service',
          usage_interval: 1000,
          last_service_usage: null, // Will default to 0
        },
      ];

      const result = calculateNextServiceDue(items, 500, 'km');
      expect(result).toEqual({
        name: 'First Service',
        dueUsage: 1000,
        remaining: 'in 500 km',
      });
    });

    it('should use "hours" unit when specified', () => {
      const items = [
        {
          name: 'Engine Service',
          usage_interval: 100,
          last_service_usage: 50,
        },
      ];

      const result = calculateNextServiceDue(items, 75, 'hours');
      expect(result).toEqual({
        name: 'Engine Service',
        dueUsage: 150,
        remaining: 'in 75 hours',
      });
    });

    it('should ignore items without usage_interval', () => {
      const items = [
        {
          name: 'Time-based Only',
          // No usage_interval
        },
        {
          name: 'Oil Change',
          usage_interval: 10000,
          last_service_usage: 40000,
        },
      ];

      const result = calculateNextServiceDue(items, 45000, 'km');
      expect(result.name).toBe('Oil Change');
    });

    it('should round remaining usage to whole number', () => {
      const items = [
        {
          name: 'Oil Change',
          usage_interval: 10000,
          last_service_usage: 40000,
        },
      ];

      const result = calculateNextServiceDue(items, 45123.456, 'km');
      expect(result.remaining).toBe('in 4,877 km'); // 50000 - 45123.456 = 4876.544 rounded to 4877
    });

    it('should always pick at least one item even if all at 0%', () => {
      const items = [
        {
          name: 'Fresh Service',
          usage_interval: 10000,
          last_service_usage: 10000, // Just serviced
        },
      ];

      const result = calculateNextServiceDue(items, 10000, 'km');
      expect(result).not.toBeNull();
      expect(result.name).toBe('Fresh Service');
      expect(result.remaining).toBe('in 10,000 km');
    });

    it('should format large numbers with commas', () => {
      const items = [
        {
          name: 'Major Service',
          usage_interval: 100000,
          last_service_usage: 0,
        },
      ];

      const result = calculateNextServiceDue(items, 25000, 'km');
      expect(result.remaining).toBe('in 75,000 km');
    });
  });
});
