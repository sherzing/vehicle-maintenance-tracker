import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { decodeVIN, isValidVINFormat } from './vinDecoder';

// Mock fetch globally
global.fetch = vi.fn();

describe('vinDecoder', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isValidVINFormat', () => {
    it('should return true for valid VIN format', () => {
      expect(isValidVINFormat('1HGBH41JXMN109186')).toBe(true);
      expect(isValidVINFormat('JH4KA8260MC000609')).toBe(true);
      expect(isValidVINFormat('1G1JC5444R7252367')).toBe(true);
    });

    it('should return false for VIN shorter than 17 characters', () => {
      expect(isValidVINFormat('1HGBH41')).toBe(false);
      expect(isValidVINFormat('1234567890')).toBe(false);
    });

    it('should return false for VIN longer than 17 characters', () => {
      expect(isValidVINFormat('1HGBH41JXMN1091866')).toBe(false);
      expect(isValidVINFormat('1HGBH41JXMN109186EXTRA')).toBe(false);
    });

    it('should return false for VIN containing I, O, or Q', () => {
      expect(isValidVINFormat('1HGBH41JXIN109186')).toBe(false); // Contains I
      expect(isValidVINFormat('1HGBH41JXON109186')).toBe(false); // Contains O
      expect(isValidVINFormat('1HGBH41JXQN109186')).toBe(false); // Contains Q
    });

    it('should return false for VIN with special characters', () => {
      expect(isValidVINFormat('1HGBH41-XMN109186')).toBe(false);
      expect(isValidVINFormat('1HGBH41 XMN109186')).toBe(false);
      expect(isValidVINFormat('1HGBH41.XMN109186')).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isValidVINFormat(null)).toBe(false);
      expect(isValidVINFormat(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidVINFormat('')).toBe(false);
    });

    it('should handle lowercase VINs', () => {
      expect(isValidVINFormat('1hgbh41jxmn109186')).toBe(true);
    });

    it('should handle mixed case VINs', () => {
      expect(isValidVINFormat('1HgBh41JxMn109186')).toBe(true);
    });

    it('should return false for VIN with lowercase i, o, q', () => {
      expect(isValidVINFormat('1hgbh41jxin109186')).toBe(false);
      expect(isValidVINFormat('1hgbh41jxon109186')).toBe(false);
      expect(isValidVINFormat('1hgbh41jxqn109186')).toBe(false);
    });

    it('should return false for non-alphanumeric characters', () => {
      expect(isValidVINFormat('1HGBH41!XMN109186')).toBe(false);
      expect(isValidVINFormat('1HGBH41@XMN109186')).toBe(false);
    });
  });

  describe('decodeVIN', () => {
    const mockNHTSAResponse = {
      Results: [
        { Variable: 'Make', Value: 'Toyota' },
        { Variable: 'Model', Value: 'Camry' },
        { Variable: 'Model Year', Value: '2020' },
        { Variable: 'Vehicle Type', Value: 'PASSENGER CAR' },
        { Variable: 'Body Class', Value: 'Sedan/Saloon' },
        { Variable: 'Manufacturer Name', Value: 'TOYOTA MOTOR CORPORATION' },
        { Variable: 'Plant Country', Value: 'UNITED STATES (USA)' },
        { Variable: 'Engine Number of Cylinders', Value: '4' },
        { Variable: 'Displacement (L)', Value: '2.5' },
        { Variable: 'Drive Type', Value: 'FWD' },
        { Variable: 'Fuel Type Primary', Value: 'Gasoline' },
      ],
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should successfully decode a valid VIN', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNHTSAResponse,
      });

      const result = await decodeVIN('1HGBH41JXMN109186');

      expect(result).toEqual({
        make: 'Toyota',
        model: 'Camry',
        year: '2020',
        type: 'car',
        bodyClass: 'Sedan/Saloon',
        manufacturer: 'TOYOTA MOTOR CORPORATION',
        plantCountry: 'UNITED STATES (USA)',
        engineCylinders: '4',
        engineDisplacement: '2.5',
        driveType: 'FWD',
        fuelType: 'Gasoline',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/1HGBH41JXMN109186?format=json'
      );
    });

    it('should throw error for VIN not equal to 17 characters', async () => {
      await expect(decodeVIN('123456')).rejects.toThrow('VIN must be exactly 17 characters');
      await expect(decodeVIN('12345678901234567890')).rejects.toThrow('VIN must be exactly 17 characters');
    });

    it('should throw error for null VIN', async () => {
      await expect(decodeVIN(null)).rejects.toThrow('VIN must be exactly 17 characters');
    });

    it('should throw error for undefined VIN', async () => {
      await expect(decodeVIN(undefined)).rejects.toThrow('VIN must be exactly 17 characters');
    });

    it('should throw error when API request fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(decodeVIN('1HGBH41JXMN109186')).rejects.toThrow('Failed to decode VIN');
    });

    it('should throw error when no results are returned', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Results: [] }),
      });

      await expect(decodeVIN('1HGBH41JXMN109186')).rejects.toThrow('No results found for this VIN');
    });

    it('should throw error when Results is missing', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await expect(decodeVIN('1HGBH41JXMN109186')).rejects.toThrow('No results found for this VIN');
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(decodeVIN('1HGBH41JXMN109186')).rejects.toThrow('Network error');
    });

    it('should map motorcycle type correctly', async () => {
      const motorcycleResponse = {
        Results: [
          { Variable: 'Make', Value: 'Harley-Davidson' },
          { Variable: 'Model', Value: 'Sportster' },
          { Variable: 'Model Year', Value: '2021' },
          { Variable: 'Vehicle Type', Value: 'MOTORCYCLE' },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => motorcycleResponse,
      });

      const result = await decodeVIN('1HD1KRM18LB650000');

      expect(result.type).toBe('motorcycle');
      expect(result.make).toBe('Harley-Davidson');
    });

    it('should map truck type as car', async () => {
      const truckResponse = {
        Results: [
          { Variable: 'Make', Value: 'Ford' },
          { Variable: 'Model', Value: 'F-150' },
          { Variable: 'Model Year', Value: '2022' },
          { Variable: 'Vehicle Type', Value: 'TRUCK' },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => truckResponse,
      });

      const result = await decodeVIN('1FTFW1E84MFA00000');

      expect(result.type).toBe('car');
    });

    it('should map SUV type as car', async () => {
      const suvResponse = {
        Results: [
          { Variable: 'Make', Value: 'Jeep' },
          { Variable: 'Model', Value: 'Wrangler' },
          { Variable: 'Model Year', Value: '2021' },
          { Variable: 'Vehicle Type', Value: 'Sport Utility Vehicle (SUV)' },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => suvResponse,
      });

      const result = await decodeVIN('1C4HJXDG0MW500000');

      // SUV maps to 'car' according to the mapVehicleType function
      expect(result.type).toBe('car');
    });

    it('should map unknown type as other', async () => {
      const unknownResponse = {
        Results: [
          { Variable: 'Make', Value: 'Custom' },
          { Variable: 'Model', Value: 'Vehicle' },
          { Variable: 'Model Year', Value: '2020' },
          { Variable: 'Vehicle Type', Value: 'CUSTOM VEHICLE' },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => unknownResponse,
      });

      const result = await decodeVIN('1HGBH41JXMN109186');

      expect(result.type).toBe('other');
    });

    it('should handle missing optional fields gracefully', async () => {
      const minimalResponse = {
        Results: [
          { Variable: 'Make', Value: 'Toyota' },
          { Variable: 'Model', Value: 'Camry' },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => minimalResponse,
      });

      const result = await decodeVIN('1HGBH41JXMN109186');

      expect(result.make).toBe('Toyota');
      expect(result.model).toBe('Camry');
      expect(result.year).toBeNull();
      expect(result.type).toBe('other');
      expect(result.bodyClass).toBeNull();
      expect(result.manufacturer).toBeNull();
    });

    it('should handle sedan vehicle type correctly', async () => {
      const sedanResponse = {
        Results: [
          { Variable: 'Vehicle Type', Value: 'SEDAN' },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sedanResponse,
      });

      const result = await decodeVIN('1HGBH41JXMN109186');
      expect(result.type).toBe('car');
    });

    it('should handle coupe vehicle type correctly', async () => {
      const coupeResponse = {
        Results: [
          { Variable: 'Vehicle Type', Value: 'COUPE' },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => coupeResponse,
      });

      const result = await decodeVIN('1HGBH41JXMN109186');
      expect(result.type).toBe('car');
    });

    it('should handle moped vehicle type correctly', async () => {
      const mopedResponse = {
        Results: [
          { Variable: 'Vehicle Type', Value: 'MOPED' },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mopedResponse,
      });

      const result = await decodeVIN('1HGBH41JXMN109186');
      expect(result.type).toBe('motorcycle');
    });

    it('should handle van vehicle type as car', async () => {
      const vanResponse = {
        Results: [
          { Variable: 'Vehicle Type', Value: 'VAN' },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => vanResponse,
      });

      const result = await decodeVIN('1HGBH41JXMN109186');
      expect(result.type).toBe('car');
    });

    it('should handle case-insensitive vehicle types', async () => {
      const mixedCaseResponse = {
        Results: [
          { Variable: 'Vehicle Type', Value: 'PaSsEnGeR CaR' },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mixedCaseResponse,
      });

      const result = await decodeVIN('1HGBH41JXMN109186');
      expect(result.type).toBe('car');
    });

    it('should return other for null vehicle type', async () => {
      const nullTypeResponse = {
        Results: [
          { Variable: 'Make', Value: 'Toyota' },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => nullTypeResponse,
      });

      const result = await decodeVIN('1HGBH41JXMN109186');
      expect(result.type).toBe('other');
    });
  });
});
