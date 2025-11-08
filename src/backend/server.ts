import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Load .env file
try {
  const envFile = await Deno.readTextFile('.env');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      if (key && value) {
        Deno.env.set(key.trim(), value.trim());
      }
    }
  }
} catch (error) {
  console.warn('Could not load .env file:', error.message);
}

const PORT = parseInt(Deno.env.get("BACKEND_PORT") || "3001");
const HOST = Deno.env.get("BACKEND_HOST") || "0.0.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// Route mapping for API endpoints
const routes = new Map([
  ['/api/healthz', 'health-simple.ts'],
  ['/api/readyz', 'health-simple.ts'],
  ['/api/health-query', 'health-query.ts'],
  ['/api/ingest-documents', 'ingest-documents.ts'],
  ['/api/reembed-kb', 'reembed-kb.ts'],
  ['/api/admin-queries', 'admin-queries.ts'],
  ['/api/vaccination-schedule', 'vaccination-schedule.ts'],
  ['/api/outbreak-alerts', 'outbreak-alerts.ts'],
  ['/api/sms-webhook', 'sms-webhook.ts'],
  ['/api/whatsapp-webhook', 'whatsapp-webhook.ts'],
  ['/api/test-supabase', 'test-supabase.ts']
]);

async function requestHandler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathname = url.pathname;
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);
  
  // Find matching route
  for (const [route, moduleName] of routes) {
    if (pathname.startsWith(route)) {
      try {
        // Dynamically import the API module
        const module = await import(`./api/${moduleName}`);
        
        // Create a new request with the original URL for the handler
        const handlerReq = new Request(req.url, {
          method: req.method,
          headers: req.headers,
          body: req.body
        });
        
        // Execute the handler from the module
        const response = await module.default(handlerReq);
        
        // Add CORS headers to the response
        const responseHeaders = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          responseHeaders.set(key, value);
        });
        
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders
        });
        
      } catch (error) {
        console.error(`Error handling ${pathname}:`, error);
        return new Response(
          JSON.stringify({ 
            error: 'Internal server error',
            message: error.message,
            path: pathname 
          }),
          { 
            status: 500, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            }
          }
        );
      }
    }
  }

  // 404 for unmatched routes
  return new Response(
    JSON.stringify({ 
      error: 'Not found',
      message: `Route ${pathname} not found`,
      availableRoutes: Array.from(routes.keys())
    }),
    { 
      status: 404, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    }
  );
}

console.log(`🚀 SwasthyaSahayak Backend Server starting...`);
console.log(`📍 Host: ${HOST}`);
console.log(`🔌 Port: ${PORT}`);
console.log(`🌐 URL: http://${HOST}:${PORT}`);
console.log(`📋 Available routes: ${Array.from(routes.keys()).join(', ')}`);
console.log(`⏰ Started at: ${new Date().toISOString()}`);

serve(requestHandler, { hostname: HOST, port: PORT });
