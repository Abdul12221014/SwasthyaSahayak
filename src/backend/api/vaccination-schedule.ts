/**
 * Vaccination Schedule API
 * 
 * Provides vaccination schedules based on age in months.
 * Integrates with government API with fallback to curated data.
 * 
 * @module backend/api/vaccination-schedule
 */

import { serve } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getVaccinesByAge, validateAgeMonths, getAgeGroupDescription } from "@/backend/integrations/gov-api.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { age_months, phone_number, channel = 'web' } = await req.json();

    // Validate age
    if (!age_months || !validateAgeMonths(age_months)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid age_months. Must be between 0 and 216 months (0-18 years).'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📅 Vaccination schedule request: ${age_months} months`);

    // Get vaccination schedule
    const schedule = await getVaccinesByAge(age_months);
    const ageGroup = getAgeGroupDescription(age_months);

    // Format response
    const response = {
      success: true,
      age_months: age_months,
      age_group: ageGroup,
      vaccines: schedule.vaccines,
      message: `Vaccination schedule for ${ageGroup}:`,
      source: 'Government Health API',
      last_updated: new Date().toISOString()
    };

    // Log query to database
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabase
        .from('health_queries')
        .insert({
          user_language: 'en',
          original_query: `Vaccination schedule for ${ageGroup}`,
          translated_query: `Vaccination schedule for ${ageGroup}`,
          response: JSON.stringify(response),
          citations: ['Government Health API', 'Immunization Schedule India'],
          is_emergency: false,
          channel: channel,
          phone_number: phone_number || null,
          accuracy_rating: 'pending'
        });

      console.log(`✅ Logged vaccination query to database`);
    } catch (dbError) {
      console.warn('Failed to log vaccination query:', dbError);
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Vaccination schedule error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch vaccination schedule',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

