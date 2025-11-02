/**
 * Simple Health Query Endpoint
 * 
 * Basic RAG endpoint without complex dependencies for testing
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default async function healthQueryHandler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const body = await req.json();
    const { query, language = 'en' } = body;

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Mock RAG response for testing
    const ragResponse = {
      query: query,
      language: language,
      response: `Based on your query "${query}", here are some general health information guidelines. Please consult with a healthcare professional for accurate medical advice.`,
      citations: [
        "General Health Guidelines - WHO",
        "Medical Information Database - CDC"
      ],
      confidence: 0.85,
      timestamp: new Date().toISOString(),
      status: "success"
    };

    return new Response(JSON.stringify(ragResponse), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Invalid request body',
        message: 'Could not parse JSON request body'
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

