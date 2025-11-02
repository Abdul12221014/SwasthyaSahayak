/**
 * Simple Health Check Endpoint
 * 
 * Minimal health check without complex dependencies
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default async function healthHandler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Date.now(),
    service: 'swasthya-sahayak-backend',
    version: '1.0.0'
  };

  return new Response(JSON.stringify(healthData), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

