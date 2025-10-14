/**
 * PHC Directory Integration
 * 
 * Manages Primary Health Centre (PHC) directory with CSV loading and caching.
 * Provides nearest facility lookup with distance calculation.
 * 
 * @module backend/integrations/phc-directory
 */

import { LRUCache } from './cache.ts';

export interface PHCFacility {
  name: string;
  type: string;
  address: string;
  phone?: string;
  lat?: number;
  lon?: number;
  distance_km?: number;
}

interface CSVRow {
  name: string;
  type: string;
  address: string;
  phone?: string;
  district: string;
  pincode?: string;
  lat?: string;
  lon?: string;
}

// Cache for parsed CSV data
const csvCache = new LRUCache<PHCFacility[]>({ maxSize: 1, ttlMs: 30 * 60 * 1000 }); // 30 min

/**
 * Load PHC facilities from CSV file
 * 
 * @returns Promise with array of PHC facilities
 */
async function loadPHCFacilities(): Promise<PHCFacility[]> {
  const cacheKey = 'phc_facilities';
  const cached = csvCache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  try {
    const csvPath = Deno.env.get('PHC_FACILITIES_CSV') || 'src/ml/data/processed/odisha_phc_directory.csv';
    const csvContent = await Deno.readTextFile(csvPath);
    
    const facilities = parseCSV(csvContent);
    csvCache.set(cacheKey, facilities);
    
    console.log(`✅ Loaded ${facilities.length} PHC facilities from CSV`);
    return facilities;
  } catch (error) {
    console.warn('Failed to load PHC CSV, using curated data:', error);
    return getCuratedPHCFacilities();
  }
}

/**
 * Parse CSV content into PHC facilities
 */
function parseCSV(csvContent: string): PHCFacility[] {
  const lines = csvContent.trim().split('\n');
  const facilities: PHCFacility[] = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
      const row = parseCSVRow(line);
      if (row) {
        facilities.push({
          name: row.name,
          type: row.type,
          address: row.address,
          phone: row.phone,
          lat: row.lat ? parseFloat(row.lat) : undefined,
          lon: row.lon ? parseFloat(row.lon) : undefined
        });
      }
    } catch (error) {
      console.warn(`Failed to parse CSV row ${i}:`, error);
    }
  }
  
  return facilities;
}

/**
 * Parse a single CSV row
 */
function parseCSVRow(line: string): CSVRow | null {
  // Simple CSV parser (handles quoted fields)
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }
  fields.push(currentField.trim());
  
  // Expected columns: name,type,address,phone,district,pincode,lat,lon
  if (fields.length >= 6) {
    return {
      name: fields[0],
      type: fields[1],
      address: fields[2],
      phone: fields[3] || undefined,
      district: fields[4],
      pincode: fields[5] || undefined,
      lat: fields[6] || undefined,
      lon: fields[7] || undefined
    };
  }
  
  return null;
}

/**
 * Find nearest PHC facilities
 * 
 * @param params - Search parameters
 * @returns Array of nearest facilities
 */
export async function findNearestFacilities(params: {
  district: string;
  pincode?: string;
  lat?: number;
  lon?: number;
  limit?: number;
}): Promise<PHCFacility[]> {
  const { district, pincode, lat, lon, limit = 3 } = params;
  
  const facilities = await loadPHCFacilities();
  
  // Filter by district
  let filtered = facilities.filter(facility => 
    facility.address.toLowerCase().includes(district.toLowerCase())
  );
  
  // If no facilities found for district, return top facilities
  if (filtered.length === 0) {
    filtered = facilities.slice(0, limit);
  }
  
  // Filter by pincode if provided
  if (pincode) {
    const pincodeFiltered = filtered.filter(facility =>
      facility.address.includes(pincode)
    );
    if (pincodeFiltered.length > 0) {
      filtered = pincodeFiltered;
    }
  }
  
  // Calculate distances if coordinates provided
  if (lat && lon) {
    filtered = filtered.map(facility => ({
      ...facility,
      distance_km: facility.lat && facility.lon ? 
        calculateDistance(lat, lon, facility.lat, facility.lon) : undefined
    }));
    
    // Sort by distance
    filtered.sort((a, b) => {
      if (!a.distance_km && !b.distance_km) return 0;
      if (!a.distance_km) return 1;
      if (!b.distance_km) return -1;
      return a.distance_km - b.distance_km;
    });
  }
  
  return filtered.slice(0, limit);
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * 
 * @param lat1 - Latitude 1
 * @param lon1 - Longitude 1
 * @param lat2 - Latitude 2
 * @param lon2 - Longitude 2
 * @returns Distance in kilometers
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get curated PHC facilities (fallback data)
 */
function getCuratedPHCFacilities(): PHCFacility[] {
  return [
    {
      name: 'Cuttack District Hospital',
      type: 'District Hospital',
      address: 'Cuttack, Odisha 753001',
      phone: '0671-2301234',
      lat: 20.4625,
      lon: 85.8830
    },
    {
      name: 'Bhubaneswar Capital Hospital',
      type: 'Medical College',
      address: 'Bhubaneswar, Odisha 751019',
      phone: '0674-2305678',
      lat: 20.2961,
      lon: 85.8245
    },
    {
      name: 'Puri District Hospital',
      type: 'District Hospital',
      address: 'Puri, Odisha 752001',
      phone: '06752-223456',
      lat: 19.8138,
      lon: 85.8315
    },
    {
      name: 'Balasore Medical College',
      type: 'Medical College',
      address: 'Balasore, Odisha 756019',
      phone: '06782-262456',
      lat: 21.4944,
      lon: 86.9336
    },
    {
      name: 'Sambalpur Medical College',
      type: 'Medical College',
      address: 'Sambalpur, Odisha 768017',
      phone: '0663-2434567',
      lat: 21.4707,
      lon: 83.9704
    }
  ];
}

/**
 * Get facilities by type
 * 
 * @param type - Facility type (PHC, CHC, District Hospital, etc.)
 * @returns Array of facilities of specified type
 */
export async function getFacilitiesByType(type: string): Promise<PHCFacility[]> {
  const facilities = await loadPHCFacilities();
  return facilities.filter(facility => 
    facility.type.toLowerCase().includes(type.toLowerCase())
  );
}

/**
 * Search facilities by name
 * 
 * @param query - Search query
 * @returns Array of matching facilities
 */
export async function searchFacilities(query: string): Promise<PHCFacility[]> {
  const facilities = await loadPHCFacilities();
  const searchTerm = query.toLowerCase();
  
  return facilities.filter(facility =>
    facility.name.toLowerCase().includes(searchTerm) ||
    facility.address.toLowerCase().includes(searchTerm)
  );
}

