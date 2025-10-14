/**
 * Input Validation
 * 
 * Zod schemas for all API inputs with proper validation and sanitization.
 * 
 * @module backend/utils/validate
 */

// Note: In a real implementation, you would import Zod
// For now, we'll create a simple validation system

interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

interface HealthQueryInput {
  query: string;
  language?: string;
  phone_number?: string;
  channel?: 'web' | 'whatsapp' | 'sms';
}

interface VaccinationInput {
  age_months: number;
  phone_number?: string;
  channel?: 'web' | 'whatsapp' | 'sms';
}

interface OutbreakInput {
  district?: string;
  phone_number?: string;
  channel?: 'web' | 'whatsapp' | 'sms';
}

interface ConsentInput {
  phone_number: string;
  consent: boolean;
  channel: 'whatsapp' | 'sms';
}

interface SurveyInput {
  phone_number: string;
  survey_type: 'pre' | 'post';
  responses: Record<string, any>;
  channel: 'whatsapp' | 'sms';
}

interface BroadcastInput {
  message: string;
  target_district?: string;
  target_language?: string;
  consent_required: boolean;
  max_users?: number;
}

class Validator {
  /**
   * Validate health query input
   */
  validateHealthQuery(input: any): ValidationResult<HealthQueryInput> {
    const errors: string[] = [];

    if (!input.query || typeof input.query !== 'string') {
      errors.push('Query is required and must be a string');
    } else if (input.query.length > 1000) {
      errors.push('Query must be less than 1000 characters');
    }

    if (input.language && typeof input.language !== 'string') {
      errors.push('Language must be a string');
    }

    if (input.phone_number && !this.validatePhoneNumber(input.phone_number)) {
      errors.push('Invalid phone number format');
    }

    if (input.channel && !['web', 'whatsapp', 'sms'].includes(input.channel)) {
      errors.push('Channel must be web, whatsapp, or sms');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return {
      success: true,
      data: {
        query: input.query.trim(),
        language: input.language?.trim(),
        phone_number: input.phone_number?.trim(),
        channel: input.channel || 'web'
      }
    };
  }

  /**
   * Validate vaccination schedule input
   */
  validateVaccination(input: any): ValidationResult<VaccinationInput> {
    const errors: string[] = [];

    if (typeof input.age_months !== 'number' || input.age_months < 0 || input.age_months > 216) {
      errors.push('Age in months must be between 0 and 216');
    }

    if (input.phone_number && !this.validatePhoneNumber(input.phone_number)) {
      errors.push('Invalid phone number format');
    }

    if (input.channel && !['web', 'whatsapp', 'sms'].includes(input.channel)) {
      errors.push('Channel must be web, whatsapp, or sms');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return {
      success: true,
      data: {
        age_months: Math.floor(input.age_months),
        phone_number: input.phone_number?.trim(),
        channel: input.channel || 'web'
      }
    };
  }

  /**
   * Validate outbreak alerts input
   */
  validateOutbreak(input: any): ValidationResult<OutbreakInput> {
    const errors: string[] = [];

    if (input.district && typeof input.district !== 'string') {
      errors.push('District must be a string');
    } else if (input.district && input.district.length > 100) {
      errors.push('District name must be less than 100 characters');
    }

    if (input.phone_number && !this.validatePhoneNumber(input.phone_number)) {
      errors.push('Invalid phone number format');
    }

    if (input.channel && !['web', 'whatsapp', 'sms'].includes(input.channel)) {
      errors.push('Channel must be web, whatsapp, or sms');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return {
      success: true,
      data: {
        district: input.district?.trim(),
        phone_number: input.phone_number?.trim(),
        channel: input.channel || 'web'
      }
    };
  }

  /**
   * Validate consent input
   */
  validateConsent(input: any): ValidationResult<ConsentInput> {
    const errors: string[] = [];

    if (!input.phone_number || !this.validatePhoneNumber(input.phone_number)) {
      errors.push('Valid phone number is required');
    }

    if (typeof input.consent !== 'boolean') {
      errors.push('Consent must be a boolean');
    }

    if (!['whatsapp', 'sms'].includes(input.channel)) {
      errors.push('Channel must be whatsapp or sms');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return {
      success: true,
      data: {
        phone_number: input.phone_number.trim(),
        consent: input.consent,
        channel: input.channel
      }
    };
  }

  /**
   * Validate survey input
   */
  validateSurvey(input: any): ValidationResult<SurveyInput> {
    const errors: string[] = [];

    if (!input.phone_number || !this.validatePhoneNumber(input.phone_number)) {
      errors.push('Valid phone number is required');
    }

    if (!['pre', 'post'].includes(input.survey_type)) {
      errors.push('Survey type must be pre or post');
    }

    if (!input.responses || typeof input.responses !== 'object') {
      errors.push('Responses must be an object');
    }

    if (!['whatsapp', 'sms'].includes(input.channel)) {
      errors.push('Channel must be whatsapp or sms');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return {
      success: true,
      data: {
        phone_number: input.phone_number.trim(),
        survey_type: input.survey_type,
        responses: input.responses,
        channel: input.channel
      }
    };
  }

  /**
   * Validate broadcast input
   */
  validateBroadcast(input: any): ValidationResult<BroadcastInput> {
    const errors: string[] = [];

    if (!input.message || typeof input.message !== 'string') {
      errors.push('Message is required and must be a string');
    } else if (input.message.length > 1600) {
      errors.push('Message must be less than 1600 characters');
    }

    if (input.target_district && typeof input.target_district !== 'string') {
      errors.push('Target district must be a string');
    }

    if (input.target_language && typeof input.target_language !== 'string') {
      errors.push('Target language must be a string');
    }

    if (typeof input.consent_required !== 'boolean') {
      errors.push('Consent required must be a boolean');
    }

    if (input.max_users && (typeof input.max_users !== 'number' || input.max_users < 1)) {
      errors.push('Max users must be a positive number');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return {
      success: true,
      data: {
        message: input.message.trim(),
        target_district: input.target_district?.trim(),
        target_language: input.target_language?.trim(),
        consent_required: input.consent_required,
        max_users: input.max_users || 1000
      }
    };
  }

  /**
   * Validate phone number format
   */
  private validatePhoneNumber(phone: string): boolean {
    // Simple validation for Indian phone numbers
    const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    return phoneRegex.test(cleanPhone);
  }

  /**
   * Sanitize string input
   */
  sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML
      .slice(0, 1000); // Limit length
  }

  /**
   * Validate admin token
   */
  validateAdminToken(token: string): boolean {
    const expectedToken = Deno.env.get('ADMIN_INGEST_TOKEN');
    return token === expectedToken;
  }

  /**
   * Validate API key
   */
  validateApiKey(key: string): boolean {
    const expectedKey = Deno.env.get('ODISHA_HEALTH_API_KEY');
    return key === expectedKey;
  }
}

// Export singleton instance
export const validator = new Validator();

// Export types
export type {
  HealthQueryInput,
  VaccinationInput,
  OutbreakInput,
  ConsentInput,
  SurveyInput,
  BroadcastInput,
  ValidationResult
};
