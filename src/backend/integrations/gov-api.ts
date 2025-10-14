/**
 * Government API Integration
 * 
 * Feature-flag aware integration with Odisha Health API.
 * Provides vaccination schedules and outbreak alerts with safe fallbacks.
 * 
 * @module backend/integrations/gov-api
 */

export interface VaccineSchedule {
  age_months: number;
  vaccines: string[];
}

export interface OutbreakAlert {
  district: string;
  disease: string;
  cases: number;
  last_updated: string;
}

// Curated fallback data for when API is unavailable
const CURATED_VACCINATION_SCHEDULE: VaccineSchedule[] = [
  { age_months: 0, vaccines: ['BCG', 'Hepatitis B (Birth dose)', 'OPV (Birth dose)'] },
  { age_months: 6, vaccines: ['OPV', 'IPV', 'Pentavalent', 'Rotavirus', 'Pneumococcal Conjugate'] },
  { age_months: 10, vaccines: ['Measles-Rubella', 'JE (if in endemic area)'] },
  { age_months: 14, vaccines: ['DPT', 'Measles-Rubella', 'JE (if in endemic area)'] },
  { age_months: 16, vaccines: ['OPV', 'IPV', 'Pentavalent', 'Rotavirus', 'Pneumococcal Conjugate'] },
  { age_months: 18, vaccines: ['DPT', 'Measles-Rubella', 'JE (if in endemic area)', 'Hepatitis A'] },
  { age_months: 24, vaccines: ['JE (if not given earlier)'] },
  { age_months: 60, vaccines: ['DPT Booster', 'OPV Booster'] },
  { age_months: 120, vaccines: ['Tdap', 'HPV (for girls)', 'TT'] }
];

const CURATED_OUTBREAK_DATA: OutbreakAlert[] = [
  { district: 'Cuttack', disease: 'Malaria', cases: 12, last_updated: '2025-01-10' },
  { district: 'Bhubaneswar', disease: 'Dengue', cases: 8, last_updated: '2025-01-09' },
  { district: 'Puri', disease: 'Chikungunya', cases: 3, last_updated: '2025-01-08' },
  { district: 'Balasore', disease: 'Malaria', cases: 15, last_updated: '2025-01-10' },
  { district: 'Sambalpur', disease: 'Dengue', cases: 5, last_updated: '2025-01-09' }
];

/**
 * Get vaccination schedule by age
 * 
 * @param ageMonths - Age in months
 * @returns Promise with vaccination schedule
 */
export async function getVaccinesByAge(ageMonths: number): Promise<VaccineSchedule> {
  const isEnabled = Deno.env.get('FEATURE_VACCINATION_API') === 'true';
  const apiBase = Deno.env.get('ODISHA_HEALTH_API_BASE');
  const apiKey = Deno.env.get('ODISHA_HEALTH_API_KEY');

  // If feature disabled or no API config, return curated data
  if (!isEnabled || !apiBase || !apiKey) {
    return getCuratedVaccinationSchedule(ageMonths);
  }

  try {
    // Try to fetch from government API
    const response = await fetch(`${apiBase}/vaccination-schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ age_months: ageMonths })
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.warn(`Government API returned ${response.status}, using curated data`);
      return getCuratedVaccinationSchedule(ageMonths);
    }
  } catch (error) {
    console.warn('Government API unavailable, using curated data:', error);
    return getCuratedVaccinationSchedule(ageMonths);
  }
}

/**
 * Get outbreak alerts by district
 * 
 * @param district - District name
 * @returns Promise with outbreak alerts array
 */
export async function getOutbreaksByDistrict(district: string): Promise<OutbreakAlert[]> {
  const isEnabled = Deno.env.get('FEATURE_OUTBREAK_API') === 'true';
  const apiBase = Deno.env.get('ODISHA_HEALTH_API_BASE');
  const apiKey = Deno.env.get('ODISHA_HEALTH_API_KEY');

  // If feature disabled or no API config, return curated data
  if (!isEnabled || !apiBase || !apiKey) {
    return getCuratedOutbreakData(district);
  }

  try {
    // Try to fetch from government API
    const response = await fetch(`${apiBase}/outbreak-alerts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      // Add district as query parameter
      url: `${apiBase}/outbreak-alerts?district=${encodeURIComponent(district)}`
    });

    if (response.ok) {
      const data = await response.json();
      return data.outbreaks || [];
    } else {
      console.warn(`Government API returned ${response.status}, using curated data`);
      return getCuratedOutbreakData(district);
    }
  } catch (error) {
    console.warn('Government API unavailable, using curated data:', error);
    return getCuratedOutbreakData(district);
  }
}

/**
 * Get curated vaccination schedule for age
 */
function getCuratedVaccinationSchedule(ageMonths: number): VaccineSchedule {
  // Find exact match first
  const exactMatch = CURATED_VACCINATION_SCHEDULE.find(v => v.age_months === ageMonths);
  if (exactMatch) {
    return exactMatch;
  }

  // Find closest age
  const sorted = CURATED_VACCINATION_SCHEDULE.sort((a, b) => 
    Math.abs(a.age_months - ageMonths) - Math.abs(b.age_months - ageMonths)
  );

  return sorted[0] || { age_months, vaccines: ['Consult your pediatrician for age-appropriate vaccines'] };
}

/**
 * Get curated outbreak data for district
 */
function getCuratedOutbreakData(district: string): OutbreakAlert[] {
  return CURATED_OUTBREAK_DATA.filter(outbreak => 
    outbreak.district.toLowerCase() === district.toLowerCase()
  );
}

/**
 * Get all available districts (for UI dropdowns)
 */
export function getAvailableDistricts(): string[] {
  return [
    'Cuttack', 'Bhubaneswar', 'Puri', 'Balasore', 'Sambalpur',
    'Rourkela', 'Berhampur', 'Koraput', 'Bhadrak', 'Baripada'
  ];
}

/**
 * Validate age in months
 */
export function validateAgeMonths(ageMonths: number): boolean {
  return ageMonths >= 0 && ageMonths <= 216; // 0 to 18 years
}

/**
 * Get age group description
 */
export function getAgeGroupDescription(ageMonths: number): string {
  if (ageMonths < 12) return `${ageMonths} months`;
  if (ageMonths < 60) return `${Math.floor(ageMonths / 12)} years ${ageMonths % 12} months`;
  return `${Math.floor(ageMonths / 12)} years`;
}

