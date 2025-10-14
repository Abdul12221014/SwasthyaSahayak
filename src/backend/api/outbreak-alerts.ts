/**
 * Outbreak Alerts API
 * 
 * Provides outbreak alerts by district with government API integration.
 * Includes district inference from phone numbers and fallback data.
 * 
 * @module backend/api/outbreak-alerts
 */

import { serve } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getOutbreaksByDistrict } from "@/backend/integrations/gov-api.ts";
import { resolveDistrict } from "@/backend/integrations/geo.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { district, phone_number, channel = 'web' } = await req.json();

    // Resolve district (explicit > phone inference > default)
    const resolvedDistrict = resolveDistrict(phone_number, district);

    console.log(`🚨 Outbreak alerts request for district: ${resolvedDistrict}`);

    // Get outbreak alerts
    const outbreaks = await getOutbreaksByDistrict(resolvedDistrict);

    // Format response
    const response = {
      success: true,
      district: resolvedDistrict,
      outbreaks: outbreaks,
      total_cases: outbreaks.reduce((sum, outbreak) => sum + outbreak.cases, 0),
      message: outbreaks.length > 0 
        ? `Found ${outbreaks.length} active outbreaks in ${resolvedDistrict}`
        : `No active outbreaks reported in ${resolvedDistrict}`,
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
          original_query: `Outbreak alerts for ${resolvedDistrict}`,
          translated_query: `Outbreak alerts for ${resolvedDistrict}`,
          response: JSON.stringify(response),
          citations: ['Government Health API', 'District Health Department'],
          is_emergency: outbreaks.length > 0, // Mark as emergency if outbreaks found
          channel: channel,
          phone_number: phone_number || null,
          accuracy_rating: 'pending'
        });

      console.log(`✅ Logged outbreak query to database`);
    } catch (dbError) {
      console.warn('Failed to log outbreak query:', dbError);
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Outbreak alerts error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch outbreak alerts',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

