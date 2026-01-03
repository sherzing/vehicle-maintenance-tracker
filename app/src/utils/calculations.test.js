import { describe, it, expect } from 'vitest';
import {
  calculateRemainingUsage,
  calculateRemainingTime,
  getServiceStatus,
  getMaintenanceItemStatus,
  getStatusColor,
} from './calculations';

describe('calculateRemainingUsage', () => {
  it('should calculate remaining usage correctly', () => {
    const result = calculateRemainingUsage(45000, 10000, 50000);
    expect(result).toBe(5000);
  });

  it('should return negative when overdue', () => {
    const result = calculateRemainingUsage(40000, 10000, 52000);
    expect(result).toBe(-2000);
  });

  it('should return -1 when never serviced (null)', () => {
    const result = calculateRemainingUsage(null, 10000, 50000);
    expect(result).toBe(-1);
  });

  it('should return -1 when never serviced (undefined)', () => {
    const result = calculateRemainingUsage(undefined, 10000, 50000);
    expect(result).toBe(-1);
  });
});

describe('calculateRemainingTime', () => {
  it('should calculate remaining time in months', () => {
    const lastServiced = new Date('2024-01-01');
    const currentDate = new Date('2024-04-01'); // 3 months later
    const result = calculateRemainingTime(lastServiced, 6, currentDate);

    // Should have ~3 months remaining
    expect(result).toBeGreaterThan(2.5);
    expect(result).toBeLessThan(3.5);
  });

  it('should return negative when overdue', () => {
    const lastServiced = new Date('2024-01-01');
    const currentDate = new Date('2024-08-01'); // 7 months later
    const result = calculateRemainingTime(lastServiced, 6, currentDate);

    expect(result).toBeLessThan(0);
  });

  it('should return -1 when never serviced', () => {
    const result = calculateRemainingTime(null, 6, new Date());
    expect(result).toBe(-1);
  });
});

describe('getServiceStatus', () => {
  it('should return "overdue" when remaining is 0 or negative', () => {
    expect(getServiceStatus(0, 10000)).toBe('overdue');
    expect(getServiceStatus(-500, 10000)).toBe('overdue');
  });

  it('should return "warning" when remaining < 10% of interval', () => {
    expect(getServiceStatus(500, 10000)).toBe('warning'); // 5%
    expect(getServiceStatus(999, 10000)).toBe('warning'); // 9.99%
  });

  it('should return "good" when remaining >= 10% of interval', () => {
    expect(getServiceStatus(1000, 10000)).toBe('good'); // 10%
    expect(getServiceStatus(5000, 10000)).toBe('good'); // 50%
  });
});

describe('getMaintenanceItemStatus', () => {
  it('should return correct status for usage-only item', () => {
    const item = {
      primary_interval: 10000,
      last_serviced_usage: 45000,
      secondary_interval: null,
    };

    const result = getMaintenanceItemStatus(item, 50000);

    expect(result.status).toBe('good');
    expect(result.remainingUsage).toBe(5000);
    expect(result.remainingTime).toBeNull();
  });

  it('should return "warning" status when usage is low', () => {
    const item = {
      primary_interval: 10000,
      last_serviced_usage: 45000,
      secondary_interval: null,
    };

    const result = getMaintenanceItemStatus(item, 54500); // 500km remaining

    expect(result.status).toBe('warning');
    expect(result.remainingUsage).toBe(500);
  });

  it('should return "overdue" when usage exceeded', () => {
    const item = {
      primary_interval: 10000,
      last_serviced_usage: 45000,
      secondary_interval: null,
    };

    const result = getMaintenanceItemStatus(item, 56000);

    expect(result.status).toBe('overdue');
    expect(result.remainingUsage).toBe(-1000);
  });

  it('should use most urgent status when both usage and time are tracked', () => {
    const item = {
      primary_interval: 10000,
      last_serviced_usage: 45000,
      last_serviced_date: new Date('2024-01-01'),
      secondary_interval: 6,
    };

    // Usage is good (5000km left), but time is overdue (8 months passed)
    const currentDate = new Date('2024-09-01');
    const result = getMaintenanceItemStatus(item, 50000, currentDate);

    expect(result.status).toBe('overdue'); // Time is more urgent
    expect(result.remainingUsage).toBe(5000);
    expect(result.remainingTime).toBeLessThan(0);
  });

  it('should handle never-serviced items', () => {
    const item = {
      primary_interval: 10000,
      last_serviced_usage: null,
      last_serviced_date: null,
      secondary_interval: 6,
    };

    const result = getMaintenanceItemStatus(item, 5000);

    expect(result.status).toBe('overdue');
    expect(result.remainingUsage).toBe(-1);
    expect(result.remainingTime).toBe(-1);
  });
});

describe('getStatusColor', () => {
  it('should return correct Bootstrap color variants', () => {
    expect(getStatusColor('overdue')).toBe('danger');
    expect(getStatusColor('warning')).toBe('warning');
    expect(getStatusColor('good')).toBe('success');
  });

  it('should return secondary for unknown status', () => {
    expect(getStatusColor('unknown')).toBe('secondary');
  });
});
