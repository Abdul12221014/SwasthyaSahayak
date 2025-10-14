/**
 * Citation Validation & Safety Guardrails
 * 
 * Validates citations against trusted health sources.
 * Implements safety checks for medical advice.
 * 
 * @module backend/utils/citation-validate
 */

// Trusted health domains (allowlist)
const TRUSTED_DOMAINS = [
  // International Organizations
  'who.int',
  'unicef.org',
  'cdc.gov',
  'nih.gov',
  
  // Indian Government
  'mohfw.gov.in',
  'icmr.gov.in',
  'nvbdcp.gov.in',
  'tbcindia.gov.in',
  'nhp.gov.in',
  'nhm.gov.in',
  
  // State Government (Odisha example)
  'health.odisha.gov.in',
  'nrhmorissa.gov.in',
  
  // Medical Institutions
  'aiims.edu',
  'pgimer.edu.in',
  
  // Verified Health Portals
  'nhp.gov.in',
  'esanjeevani.in'
];

// Dangerous medical patterns (dosage/prescription indicators)
const DANGEROUS_PATTERNS = [
  // Dosage units
  /\d+\s*(mg|ml|mcg|µg|g|cc|iu|units?)/gi,
  
  // Prescription language
  /\b(take|prescribe[d]?|administer|inject)\s+\d+/gi,
  /\b\d+\s+(times?|daily|per day|hourly)/gi,
  
  // Specific drug classes (common antibiotics, etc.)
  /\b(amoxicillin|azithromycin|ciprofloxacin|doxycycline|metronidazole)\b/gi,
  /\b(paracetamol|ibuprofen|aspirin)\s+\d+/gi, // Allow mention but not dosage
  
  // Injection/surgical terms
  /\b(inject|iv|intravenous|intramuscular|subcutaneous|surgical)\b/gi
];

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

/**
 * Check if URL is from trusted source
 */
function isTrustedSource(url: string): boolean {
  const domain = extractDomain(url);
  if (!domain) return false;
  
  return TRUSTED_DOMAINS.some(trusted => 
    domain === trusted || domain.endsWith(`.${trusted}`)
  );
}

/**
 * Validate citations against trusted sources
 * 
 * @param urls - Array of citation URLs
 * @returns Object with valid and invalid URLs
 */
export function validateCitations(urls: string[]): {
  valid: string[];
  invalid: string[];
  allTrusted: boolean;
} {
  const valid: string[] = [];
  const invalid: string[] = [];
  
  for (const url of urls) {
    if (isTrustedSource(url)) {
      valid.push(url);
    } else {
      invalid.push(url);
    }
  }
  
  return {
    valid,
    invalid,
    allTrusted: invalid.length === 0
  };
}

/**
 * Check response for dangerous medical content
 * 
 * @param response - Generated AI response
 * @returns Safety check result
 */
export function checkMedicalSafety(response: string): {
  isSafe: boolean;
  issues: string[];
  sanitizedResponse?: string;
} {
  const issues: string[] = [];
  
  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    const matches = response.match(pattern);
    if (matches) {
      issues.push(`Contains dosage/prescription information: ${matches[0]}`);
    }
  }
  
  // If issues found, provide safe alternative
  if (issues.length > 0) {
    const sanitizedResponse = `⚠️ Medical Safety Notice:

I cannot provide specific dosage or prescription information. This requires a qualified healthcare professional.

General Guidance:
- For any medication, consult a doctor or visit your nearest Primary Health Centre (PHC)
- Call 104 (National Health Helpline) for guidance
- In emergencies, call 108 for ambulance services

${response.split('\n\n')[0]}  

**Always consult a healthcare professional before taking any medication.**`;
    
    return {
      isSafe: false,
      issues,
      sanitizedResponse
    };
  }
  
  return {
    isSafe: true,
    issues: []
  };
}

/**
 * Validate and sanitize complete health response
 * 
 * @param response - AI generated response
 * @param citations - Array of citation URLs
 * @returns Validated and safe response
 */
export function validateHealthResponse(
  response: string,
  citations: string[]
): {
  response: string;
  citations: string[];
  warnings: string[];
} {
  const warnings: string[] = [];
  
  // 1. Validate citations
  const citationCheck = validateCitations(citations);
  
  if (!citationCheck.allTrusted) {
    warnings.push(`${citationCheck.invalid.length} untrusted citation(s) removed`);
  }
  
  if (citationCheck.valid.length === 0 && citations.length > 0) {
    warnings.push('No valid citations from trusted sources');
    response += '\n\n⚠️ No official sources found for this answer. Please consult a healthcare professional.';
  }
  
  // 2. Check medical safety
  const safetyCheck = checkMedicalSafety(response);
  
  if (!safetyCheck.isSafe) {
    warnings.push(...safetyCheck.issues);
    response = safetyCheck.sanitizedResponse || response;
  }
  
  return {
    response,
    citations: citationCheck.valid,
    warnings
  };
}

/**
 * Check if query is out of scope (non-medical)
 */
export function isOutOfScope(query: string): boolean {
  const outOfScopePatterns = [
    /\b(recipe|cooking|politics|sports|entertainment|weather)\b/i,
    /\b(movie|song|game|cricket|football)\b/i,
  ];
  
  return outOfScopePatterns.some(pattern => pattern.test(query));
}

