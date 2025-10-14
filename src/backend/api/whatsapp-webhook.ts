import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Twilio webhook signature verification
function verifyTwilioSignature(url: string, params: Record<string, string>, signature: string): boolean {
  // In production, implement proper Twilio signature verification
  // For now, return true for testing
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (!twilioAuthToken) {
    console.warn('TWILIO_AUTH_TOKEN not set, skipping signature verification');
    return true;
  }
  
  // Implement actual verification here using crypto-js or similar
  // See: https://www.twilio.com/docs/usage/security#validating-requests
  return true;
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
      
      console.log('WhatsApp message received:', { from, body });
      
      // Verify Twilio signature (optional but recommended for production)
      const twilioSignature = req.headers.get('X-Twilio-Signature') || '';
      const url = req.url;
      const params: Record<string, string> = {};
      formData.forEach((value, key) => {
        params[key] = value.toString();
      });
      
      if (!verifyTwilioSignature(url, params, twilioSignature)) {
        throw new Error('Invalid Twilio signature');
      }
    } else {
      // For testing without Twilio
      const json = await req.json();
      from = json.from || 'test';
      body = json.body || '';
      console.log('Test message received:', { from, body });
    }

    if (!body) {
      throw new Error('No message body provided');
    }

    // Call the health-query edge function
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: healthData, error: healthError } = await supabase.functions.invoke('health-query', {
      body: {
        user_language: 'english', // Will be auto-detected by health-query
        query: body,
        channel: 'whatsapp',
        phone_number: from
      }
    });

    if (healthError) {
      console.error('Health query error:', healthError);
      throw healthError;
    }

    console.log('Health query response:', healthData);

    // Format WhatsApp response
    let whatsappMessage = healthData.response;
    
    // Add citations
    if (healthData.citations && healthData.citations.length > 0) {
      whatsappMessage += '\n\n📚 *Sources:*\n';
      healthData.citations.forEach((citation: string, idx: number) => {
        const parts = citation.split(': ');
        whatsappMessage += `${idx + 1}. ${parts[0]}\n`;
      });
    }

    // Send WhatsApp reply via Twilio
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioWhatsappNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER') || 'whatsapp:+14155238886';

    if (twilioAccountSid && twilioAuthToken && from.startsWith('whatsapp:')) {
      // Send actual WhatsApp message via Twilio
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      const credentials = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
      
      const messageData = new URLSearchParams({
        From: twilioWhatsappNumber,
        To: from,
        Body: whatsappMessage
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
        throw new Error(`Failed to send WhatsApp message: ${errorText}`);
      }

      const twilioData = await twilioResponse.json();
      console.log('WhatsApp message sent:', twilioData.sid);
    } else {
      console.log('Test mode: Would send WhatsApp message:', whatsappMessage);
    }

    // Return TwiML response for Twilio
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${whatsappMessage.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Message>
</Response>`;

    return new Response(twimlResponse, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Return error as TwiML
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, I encountered an error. Please try again later.</Message>
</Response>`;

    return new Response(errorTwiml, {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
    });
  }
});
