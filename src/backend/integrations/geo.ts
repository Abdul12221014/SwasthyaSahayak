/**
 * Geo Location Utilities
 * 
 * Simple geo utilities for district inference and location services.
 * Ready for future GEOIP provider integration.
 * 
 * @module backend/integrations/geo
 */

const DEFAULT_DISTRICT = 'Cuttack';

// Simple phone number to district mapping (for Odisha)
const PHONE_DISTRICT_MAP: Record<string, string> = {
  '0671': 'Bhubaneswar',    // Bhubaneswar STD code
  '0674': 'Cuttack',        // Cuttack STD code
  '06752': 'Puri',          // Puri STD code
  '06782': 'Balasore',      // Balasore STD code
  '0663': 'Sambalpur',      // Sambalpur STD code
  '0661': 'Rourkela',       // Rourkela STD code
  '0680': 'Berhampur',      // Berhampur STD code
  '06852': 'Koraput',       // Koraput STD code
  '06784': 'Bhadrak',       // Bhadrak STD code
  '06792': 'Baripada'       // Baripada STD code
};

/**
 * Infer district from phone number
 * 
 * @param phone - Phone number (optional)
 * @returns District name or null if cannot determine
 */
export function inferDistrictFromPhone(phone?: string): string | null {
  if (!phone) {
    return null;
  }

  // Clean phone number (remove spaces, dashes, etc.)
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Check for Indian mobile numbers (+91)
  if (cleanPhone.startsWith('+91')) {
    const mobile = cleanPhone.substring(3);
    if (mobile.length === 10 && mobile.startsWith('6')) {
      // Odisha mobile numbers start with 6
      // For now, return default district for mobile numbers
      return DEFAULT_DISTRICT;
    }
  }
  
  // Check for landline numbers with STD codes
  for (const [stdCode, district] of Object.entries(PHONE_DISTRICT_MAP)) {
    if (cleanPhone.startsWith(stdCode)) {
      return district;
    }
  }
  
  return null;
}

/**
 * Get default district
 * 
 * @returns Default district name
 */
export function getDefaultDistrict(): string {
  return Deno.env.get('DEFAULT_DISTRICT') || DEFAULT_DISTRICT;
}

/**
 * Normalize district name
 * 
 * @param district - District name
 * @returns Normalized district name
 */
export function normalizeDistrictName(district: string): string {
  return district.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Check if district is valid (in Odisha)
 * 
 * @param district - District name
 * @returns True if valid Odisha district
 */
export function isValidDistrict(district: string): boolean {
  const validDistricts = [
    'cuttack', 'bhubaneswar', 'puri', 'balasore', 'sambalpur',
    'rourkela', 'berhampur', 'koraput', 'bhadrak', 'baripada',
    'angul', 'bargarh', 'boudh', 'deogarh', 'dhenkanal',
    'gajapati', 'ganjam', 'jagatsinghpur', 'jajpur', 'jharsuguda',
    'kalahandi', 'kandhamal', 'kendrapara', 'keonjhar', 'khordha',
    'malkangiri', 'mayurbhanj', 'nabarangpur', 'nuapada', 'rayagada',
    'subarnapur', 'sundargarh'
  ];
  
  const normalized = normalizeDistrictName(district);
  return validDistricts.includes(normalized);
}

/**
 * Get district from coordinates (future GEOIP integration)
 * 
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns District name or null
 */
export async function getDistrictFromCoordinates(lat: number, lon: number): Promise<string | null> {
  const provider = Deno.env.get('GEOIP_PROVIDER');
  
  if (provider === 'none' || !provider) {
    return null;
  }
  
  // Future: Implement GEOIP provider integration
  // For now, return null
  return null;
}

/**
 * Get user's district from request context
 * 
 * @param phone - Phone number from request
 * @param district - District from request body
 * @returns Resolved district name
 */
export function resolveDistrict(phone?: string, district?: string): string {
  // Priority: explicit district > phone inference > default
  if (district && isValidDistrict(district)) {
    return district;
  }
  
  const inferredDistrict = inferDistrictFromPhone(phone);
  if (inferredDistrict) {
    return inferredDistrict;
  }
  
  return getDefaultDistrict();
}

/**
 * Get all valid Odisha districts
 * 
 * @returns Array of district names
 */
export function getAllDistricts(): string[] {
  return [
    'Cuttack', 'Bhubaneswar', 'Puri', 'Balasore', 'Sambalpur',
    'Rourkela', 'Berhampur', 'Koraput', 'Bhadrak', 'Baripada',
    'Angul', 'Bargarh', 'Boudh', 'Deogarh', 'Dhenkanal',
    'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda',
    'Kalahandi', 'Kandhamal', 'Kendrapara', 'Keonjhar', 'Khordha',
    'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nuapada', 'Rayagada',
    'Subarnapur', 'Sundargarh'
  ];
}

