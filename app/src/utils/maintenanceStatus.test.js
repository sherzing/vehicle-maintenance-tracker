import { describe, it, expect } from 'vitest';
import {
  getMaintenanceStatus,
  getStatusBadgeVariant,
  getStatusText,
  formatRemaining,
} from './maintenanceStatus';

describe('maintenanceStatus', () => {
  describe('getMaintenanceStatus', () => {
    it('should return ok status when well below threshold', () => {
      const item = {
        usage_interval: 5000,
        last_service_usage: 0,
        time_interval_days: null,
        last_service_date: null,
      };

      const status = getMaintenanceStatus(item, 2000);

      expect(status.status).toBe('ok');
      expect(status.percentage).toBe(0.4); // 2000/5000
      expect(status.primaryReason).toBe(null);
    });

    it('should return due_soon when usage is at 90%', () => {
      const item = {
        usage_interval: 5000,
        last_service_usage: 0,
        time_interval_days: null,
        last_service_date: null,
      };

      const status = getMaintenanceStatus(item, 4500);

      expect(status.status).toBe('due_soon');
      expect(status.percentage).toBe(0.9);
      expect(status.primaryReason).toBe('usage');
    });

    it('should return overdue when usage exceeds interval', () => {
      const item = {
        usage_interval: 5000,
        last_service_usage: 1000,
        time_interval_days: null,
        last_service_date: null,
      };

      const status = getMaintenanceStatus(item, 7000);

      expect(status.status).toBe('overdue');
      expect(status.percentage).toBeGreaterThanOrEqual(1);
      expect(status.primaryReason).toBe('usage');
    });

    it('should return due_soon when time is at 95%', () => {
      const now = new Date();
      const lastService = new Date(now.getTime() - 95 * 24 * 60 * 60 * 1000); // 95 days ago

      const item = {
        usage_interval: null,
        last_service_usage: null,
        time_interval_days: 100,
        last_service_date: lastService,
      };

      const status = getMaintenanceStatus(item, 0);

      expect(status.status).toBe('due_soon');
      expect(status.percentage).toBeGreaterThan(0.9);
      expect(status.primaryReason).toBe('time');
    });

    it('should return overdue when time exceeds interval', () => {
      const now = new Date();
      const lastService = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000); // 120 days ago

      const item = {
        usage_interval: null,
        last_service_usage: null,
        time_interval_days: 90,
        last_service_date: lastService,
      };

      const status = getMaintenanceStatus(item, 0);

      expect(status.status).toBe('overdue');
      expect(status.percentage).toBeGreaterThanOrEqual(1);
      expect(status.primaryReason).toBe('time');
    });

    it('should use whichever interval is closer to due when both exist', () => {
      const now = new Date();
      const lastService = new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000); // 50 days ago

      const item = {
        usage_interval: 5000,
        last_service_usage: 0,
        time_interval_days: 100, // 50% complete
        last_service_date: lastService,
      };

      // Usage is 95% complete, time is 50% complete
      const status = getMaintenanceStatus(item, 4750);

      expect(status.status).toBe('due_soon');
      expect(status.primaryReason).toBe('usage'); // Usage is closer
    });

    it('should return overdue if either interval is overdue', () => {
      const now = new Date();
      const lastService = new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000); // 200 days ago

      const item = {
        usage_interval: 10000,
        last_service_usage: 0,
        time_interval_days: 90,
        last_service_date: lastService,
      };

      // Usage is 20% complete, time is overdue
      const status = getMaintenanceStatus(item, 2000);

      expect(status.status).toBe('overdue');
      expect(status.primaryReason).toBe('time');
    });

    it('should handle never-serviced items correctly', () => {
      const item = {
        usage_interval: 5000,
        last_service_usage: null,
        time_interval_days: 90,
        last_service_date: null,
      };

      const status = getMaintenanceStatus(item, 4500);

      // Should be overdue because time interval is severely overdue (never serviced)
      expect(status.status).toBe('overdue');
      expect(status.usageStatus.percentage).toBe(0.9); // 4500/5000
      expect(status.timeStatus.percentage).toBeGreaterThan(100); // Never serviced = very overdue
      expect(status.primaryReason).toBe('time'); // Time is the critical factor
    });

    it('should cap percentage at 1 (100%)', () => {
      const item = {
        usage_interval: 1000,
        last_service_usage: 0,
        time_interval_days: null,
        last_service_date: null,
      };

      const status = getMaintenanceStatus(item, 5000); // 500% over

      expect(status.percentage).toBe(1); // Capped at 100%
    });

    it('should use 80% threshold for small km intervals (<= 1500km)', () => {
      const item = {
        usage_interval: 1000, // Small interval
        last_service_usage: 0,
        time_interval_days: null,
        last_service_date: null,
      };

      // At 80% for small interval should trigger due_soon
      const status = getMaintenanceStatus(item, 800, 'km');

      expect(status.status).toBe('due_soon');
      expect(status.percentage).toBe(0.8);
      expect(status.primaryReason).toBe('usage');
    });

    it('should use 80% threshold for small hour intervals (<= 20 hours)', () => {
      const item = {
        usage_interval: 15, // Small interval (15 hours)
        last_service_usage: 0,
        time_interval_days: null,
        last_service_date: null,
      };

      // At 80% for small interval should trigger due_soon
      const status = getMaintenanceStatus(item, 12, 'hours');

      expect(status.status).toBe('due_soon');
      expect(status.percentage).toBe(0.8);
      expect(status.primaryReason).toBe('usage');
    });

    it('should use 90% threshold for large km intervals (> 1500km)', () => {
      const item = {
        usage_interval: 5000, // Large interval
        last_service_usage: 0,
        time_interval_days: null,
        last_service_date: null,
      };

      // At 80% for large interval should still be ok
      const status80 = getMaintenanceStatus(item, 4000, 'km');
      expect(status80.status).toBe('ok');

      // At 90% for large interval should trigger due_soon
      const status90 = getMaintenanceStatus(item, 4500, 'km');
      expect(status90.status).toBe('due_soon');
    });

    it('should use 80% threshold for small time intervals (<= 30 days)', () => {
      const now = new Date();
      const lastService = new Date(now.getTime() - 24 * 24 * 60 * 60 * 1000); // 24 days ago

      const item = {
        usage_interval: null,
        last_service_usage: null,
        time_interval_days: 30, // Small time interval
        last_service_date: lastService,
      };

      const status = getMaintenanceStatus(item, 0);

      expect(status.status).toBe('due_soon');
      expect(status.percentage).toBeCloseTo(0.8, 1);
      expect(status.primaryReason).toBe('time');
    });

    it('should use 90% threshold for large time intervals (> 30 days)', () => {
      const now = new Date();
      const lastService80 = new Date(now.getTime() - 80 * 24 * 60 * 60 * 1000); // 80 days ago
      const lastService90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

      const item = {
        usage_interval: null,
        last_service_usage: null,
        time_interval_days: 100, // Large time interval
        last_service_date: lastService80,
      };

      // At 80% for large interval should still be ok
      const status80 = getMaintenanceStatus(item, 0);
      expect(status80.status).toBe('ok');

      // At 90% for large interval should trigger due_soon
      item.last_service_date = lastService90;
      const status90 = getMaintenanceStatus(item, 0);
      expect(status90.status).toBe('due_soon');
    });
  });

  describe('getStatusBadgeVariant', () => {
    it('should return correct variants', () => {
      expect(getStatusBadgeVariant('overdue')).toBe('danger');
      expect(getStatusBadgeVariant('due_soon')).toBe('warning');
      expect(getStatusBadgeVariant('ok')).toBe('success');
      expect(getStatusBadgeVariant('unknown')).toBe('secondary');
    });
  });

  describe('getStatusText', () => {
    it('should return human-readable text', () => {
      expect(getStatusText('overdue')).toBe('Overdue');
      expect(getStatusText('due_soon')).toBe('Due Soon');
      expect(getStatusText('ok')).toBe('OK');
      expect(getStatusText('unknown')).toBe('Unknown');
    });
  });

  describe('formatRemaining', () => {
    it('should format remaining usage for km', () => {
      const statusInfo = {
        usageStatus: { remaining: 1500 },
        timeStatus: null,
      };

      const result = formatRemaining(statusInfo, 'km');
      expect(result).toBe('1500 km');
    });

    it('should format remaining usage for hours', () => {
      const statusInfo = {
        usageStatus: { remaining: 25.5 },
        timeStatus: null,
      };

      const result = formatRemaining(statusInfo, 'hours');
      expect(result).toBe('26 hours');
    });

    it('should format remaining time', () => {
      const statusInfo = {
        usageStatus: null,
        timeStatus: { remaining: 45 },
      };

      const result = formatRemaining(statusInfo);
      expect(result).toBe('45 days');
    });

    it('should format both usage and time with "or"', () => {
      const statusInfo = {
        usageStatus: { remaining: 1000 },
        timeStatus: { remaining: 30 },
      };

      const result = formatRemaining(statusInfo, 'km');
      expect(result).toBe('1000 km or 30 days');
    });

    it('should return null if no remaining values', () => {
      const statusInfo = {
        usageStatus: { remaining: 0 },
        timeStatus: { remaining: 0 },
      };

      const result = formatRemaining(statusInfo);
      expect(result).toBe(null);
    });

    it('should handle singular day', () => {
      const statusInfo = {
        usageStatus: null,
        timeStatus: { remaining: 1 },
      };

      const result = formatRemaining(statusInfo);
      expect(result).toBe('1 day');
    });
  });
});
