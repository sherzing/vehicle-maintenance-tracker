/**
 * VIN Decoder utility using NHTSA API
 * https://vpic.nhtsa.dot.gov/api/
 */

const NHTSA_API_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';

/**
 * Decode a VIN using the NHTSA API
 * @param {string} vin - The VIN to decode
 * @returns {Promise<object>} Decoded vehicle information
 */
export async function decodeVIN(vin) {
  if (!vin || vin.length !== 17) {
    throw new Error('VIN must be exactly 17 characters');
  }

  try {
    const response = await fetch(`${NHTSA_API_BASE}/DecodeVin/${vin}?format=json`);

    if (!response.ok) {
      throw new Error('Failed to decode VIN');
    }

    const data = await response.json();

    if (!data.Results || data.Results.length === 0) {
      throw new Error('No results found for this VIN');
    }

    // Extract relevant fields from the NHTSA response
    const results = data.Results;
    const getValue = (variableName) => {
      const item = results.find(r => r.Variable === variableName);
      return item?.Value || null;
    };

    // Map NHTSA response to our vehicle format
    const decodedData = {
      make: getValue('Make'),
      model: getValue('Model'),
      year: getValue('Model Year'),
      type: mapVehicleType(getValue('Vehicle Type')),
      bodyClass: getValue('Body Class'),
      manufacturer: getValue('Manufacturer Name'),
      plantCountry: getValue('Plant Country'),
      engineCylinders: getValue('Engine Number of Cylinders'),
      engineDisplacement: getValue('Displacement (L)'),
      driveType: getValue('Drive Type'),
      fuelType: getValue('Fuel Type Primary'),
    };

    return decodedData;
  } catch (error) {
    console.error('VIN decode error:', error);
    throw error;
  }
}

/**
 * Map NHTSA vehicle type to our vehicle types
 * @param {string} nhtsaType - NHTSA vehicle type
 * @returns {string} Our vehicle type (car, motorcycle, bicycle, other)
 */
function mapVehicleType(nhtsaType) {
  if (!nhtsaType) return 'other';

  const type = nhtsaType.toLowerCase();

  if (type.includes('passenger') || type.includes('car') || type.includes('sedan') ||
      type.includes('coupe') || type.includes('hatchback') || type.includes('wagon')) {
    return 'car';
  }

  if (type.includes('motorcycle') || type.includes('moped')) {
    return 'motorcycle';
  }

  if (type.includes('truck') || type.includes('suv') || type.includes('van')) {
    return 'car'; // Treat trucks/SUVs as cars for simplicity
  }

  return 'other';
}

/**
 * Validate if a VIN format is correct (basic validation)
 * @param {string} vin - The VIN to validate
 * @returns {boolean} True if VIN format appears valid
 */
export function isValidVINFormat(vin) {
  if (!vin || vin.length !== 17) {
    return false;
  }

  // VINs don't contain I, O, or Q to avoid confusion with 1 and 0
  const invalidChars = /[IOQ]/i;
  if (invalidChars.test(vin)) {
    return false;
  }

  // VIN should only contain alphanumeric characters
  const validChars = /^[A-HJ-NPR-Z0-9]{17}$/i;
  return validChars.test(vin);
}
