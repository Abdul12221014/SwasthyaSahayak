// Deno runtime - type declarations for IDE
// @ts-expect-error - Deno runtime types not available in IDE
/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error - Supabase types from remote URL
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function truncateForSMS(text: string, maxLength: number = 300): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let from = '';
    let body = '';
    
    // Parse Twilio webhook data (form-urlencoded)
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      from = formData.get('From') as string || '';
      body = formData.get('Body') as string || '';
      
      console.log('SMS received:', { from, body });
    } else {
      // For testing without Twilio
      const json = await req.json();
      from = json.from || 'test';
      body = json.body || '';
      console.log('Test SMS received:', { from, body });
    }

    if (!body) {
      throw new Error('No message body provided');
    }

    // Call the health-query edge function
    const supabase = createClient(
      // @ts-expect-error - Deno.env is available at runtime
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-expect-error - Deno.env is available at runtime
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: healthData, error: healthError } = await supabase.functions.invoke('health-query', {
      body: {
        user_language: 'english', // Will be auto-detected
        query: body,
        channel: 'sms',
        phone_number: from
      }
    });

    if (healthError) {
      console.error('Health query error:', healthError);
      throw healthError;
    }

    // Validate healthData exists and has required fields
    if (!healthData) {
      throw new Error('No response data from health-query function');
    }

    console.log('Health query response:', healthData);

    // Format SMS-friendly response (short, < 300 chars)
    let smsMessage = '';
    
    // Check for emergency flag (safe access)
    if (healthData.is_emergency === true) {
      smsMessage = '⚠️ EMERGENCY: Seek immediate help. Call 108.\n\n';
    }
    
    // Safely extract main response
    const responseText = healthData.response || 'I apologize, but I could not process your query. Please try again or contact a healthcare professional.';
    
    // Truncate main response to fit SMS limits
    const mainResponse = responseText.split('\n\n')[0] || responseText; // Take first paragraph or full text
    smsMessage += truncateForSMS(mainResponse, 250);
    
    // Add one citation if space permits (safe access)
    if (healthData.citations && Array.isArray(healthData.citations) && healthData.citations.length > 0 && smsMessage.length < 280) {
      const citationParts = healthData.citations[0].split(': ');
      const citation = citationParts[0] || healthData.citations[0]; // Fallback to full citation if split fails
      smsMessage += `\n\nSource: ${citation}`;
    }

    // Send SMS reply via Twilio
    // @ts-expect-error - Deno.env is available at runtime
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    // @ts-expect-error - Deno.env is available at runtime
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    // @ts-expect-error - Deno.env is available at runtime
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
      // Send actual SMS via Twilio
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      const credentials = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
      
      const messageData = new URLSearchParams({
        From: twilioPhoneNumber,
        To: from,
        Body: smsMessage
      });

      const twilioResponse = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: messageData
      });

      if (!twilioResponse.ok) {
        const errorText = await twilioResponse.text();
        console.error('Twilio API error:', errorText);
        throw new Error(`Failed to send SMS: ${errorText}`);
      }

      const twilioData = await twilioResponse.json();
      console.log('SMS sent:', twilioData.sid);
    } else {
      console.log('Test mode: Would send SMS:', smsMessage);
    }

    // Return TwiML response for Twilio
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${smsMessage.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Message>
</Response>`;

    return new Response(twimlResponse, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('SMS webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Return error as TwiML
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Error processing your message. Please try again.</Message>
</Response>`;

    return new Response(errorTwiml, {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
    });
  }
});
