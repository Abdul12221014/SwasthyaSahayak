import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Emergency keywords for detection
const EMERGENCY_KEYWORDS = [
  'chest pain', 'heart attack', 'severe breathing', 'can\'t breathe', 'difficulty breathing',
  'unconscious', 'seizure', 'heavy bleeding', 'severe injury', 'stroke',
  'high fever child', 'baby not breathing', 'severe allergic reaction', 'anaphylaxis'
];

// Simulated health knowledge base (in production, this would be vector DB retrieval)
const HEALTH_KNOWLEDGE = {
  vaccination: {
    content: "Vaccination schedules for children include BCG at birth, OPV and Hepatitis B at 6 weeks, 10 weeks, and 14 weeks. Measles vaccine is given at 9-12 months.",
    source: "MoHFW India - Universal Immunization Programme",
    link: "https://www.mohfw.gov.in/index1.php?lang=1&level=2&sublinkid=824&lid=1067"
  },
  fever: {
    content: "For fever in children, keep them hydrated, use paracetamol as prescribed, sponge with lukewarm water. Seek medical help if fever persists beyond 3 days or is very high (>103°F).",
    source: "WHO - Fever Management Guidelines",
    link: "https://www.who.int/news-room/fact-sheets"
  },
  malaria: {
    content: "Malaria prevention includes sleeping under insecticide-treated nets, wearing protective clothing, and using mosquito repellents. Symptoms include fever, chills, and headache.",
    source: "National Vector Borne Disease Control Programme",
    link: "https://nvbdcp.gov.in/index1.php?lang=1&level=1&sublinkid=5784&lid=3689"
  },
  tuberculosis: {
    content: "TB symptoms include persistent cough for more than 2 weeks, chest pain, coughing up blood, weight loss, and night sweats. Free treatment is available at government health centers.",
    source: "National TB Elimination Programme",
    link: "https://tbcindia.gov.in/"
  },
  diarrhea: {
    content: "For diarrhea, give ORS (Oral Rehydration Solution), continue breastfeeding for infants, maintain hygiene. Seek help if there's blood in stool, signs of dehydration, or it persists beyond 2 days.",
    source: "UNICEF India - Child Health Guidelines",
    link: "https://www.unicef.org/india/what-we-do/health"
  }
};

// Language detection and translation simulation
function detectLanguage(text: string): string {
  const odiaPattern = /[\u0B00-\u0B7F]/;
  const hindiPattern = /[\u0900-\u097F]/;
  const assamesePattern = /[\u0980-\u09FF]/;
  
  if (odiaPattern.test(text)) return 'odia';
  if (hindiPattern.test(text)) return 'hindi';
  if (assamesePattern.test(text)) return 'assamese';
  return 'english';
}

async function translateText(text: string, fromLang: string): Promise<string> {
  // In production, use IndicTrans2 or Google Translate API
  // For demo, we'll use Lovable AI for translation
  if (fromLang === 'english') return text;
  
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are a translator. Translate the following ${fromLang} text to English. Only return the translation, nothing else.`
        },
        {
          role: 'user',
          content: text
        }
      ]
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}

function retrieveRelevantDocs(query: string): Array<{content: string, source: string, link: string}> {
  // Simplified RAG - keyword matching (in production, use vector similarity)
  const results = [];
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('vaccin') || queryLower.includes('immuniz')) {
    results.push(HEALTH_KNOWLEDGE.vaccination);
  }
  if (queryLower.includes('fever') || queryLower.includes('temperature')) {
    results.push(HEALTH_KNOWLEDGE.fever);
  }
  if (queryLower.includes('malaria') || queryLower.includes('mosquito')) {
    results.push(HEALTH_KNOWLEDGE.malaria);
  }
  if (queryLower.includes('tb') || queryLower.includes('tuberculosis') || queryLower.includes('cough')) {
    results.push(HEALTH_KNOWLEDGE.tuberculosis);
  }
  if (queryLower.includes('diarr') || queryLower.includes('loose motion') || queryLower.includes('dehydrat')) {
    results.push(HEALTH_KNOWLEDGE.diarrhea);
  }
  
  // Return top 3 most relevant
  return results.slice(0, 3);
}

function detectEmergency(query: string): boolean {
  const queryLower = query.toLowerCase();
  return EMERGENCY_KEYWORDS.some(keyword => queryLower.includes(keyword));
}

async function generateResponse(query: string, retrievedDocs: any[]): Promise<{response: string, citations: string[]}> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  // Build context from retrieved documents
  const context = retrievedDocs.map((doc, idx) => 
    `[Document ${idx + 1}]\nSource: ${doc.source}\nContent: ${doc.content}\nLink: ${doc.link}`
  ).join('\n\n');
  
  const systemPrompt = `You are a public health assistant for rural India. Answer health questions accurately and compassionately.
  
IMPORTANT RULES:
1. Use the provided documents to answer the question
2. Always cite your sources using [Document X] format
3. Keep answers simple and actionable
4. If the question is outside your knowledge, direct users to visit nearest health center
5. Be culturally sensitive and use simple language

Available Context:
${context}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ]
    })
  });
  
  const data = await response.json();
  const aiResponse = data.choices[0].message.content;
  
  // Extract citations
  const citations = retrievedDocs.map(doc => `${doc.source}: ${doc.link}`);
  
  return { response: aiResponse, citations };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_language: userLanguage, query } = await req.json();
    
    console.log('Processing query:', { userLanguage, query });
    
    // Step 1: Language detection and translation
    const detectedLang = userLanguage || detectLanguage(query);
    const translatedQuery = await translateText(query, detectedLang);
    
    console.log('Translation:', { detectedLang, translatedQuery });
    
    // Step 2: Emergency detection
    const isEmergency = detectEmergency(translatedQuery);
    
    // Step 3: Retrieve relevant documents (RAG)
    const retrievedDocs = retrieveRelevantDocs(translatedQuery);
    
    console.log('Retrieved docs:', retrievedDocs.length);
    
    // Step 4: Generate response with AI
    const { response, citations } = await generateResponse(translatedQuery, retrievedDocs);
    
    // Step 5: Add emergency message if needed
    let finalResponse = response;
    if (isEmergency) {
      finalResponse = `⚠️ EMERGENCY ALERT: This may be a medical emergency. Please seek immediate medical help at your nearest health center or call emergency services.\n\nNearest clinic information: Please visit your local Primary Health Centre (PHC) or call 108 for ambulance services.\n\n---\n\n${response}`;
    }
    
    // Step 6: Save to database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data: savedQuery, error: dbError } = await supabase
      .from('health_queries')
      .insert({
        user_language: detectedLang,
        original_query: query,
        translated_query: translatedQuery,
        response: finalResponse,
        citations,
        is_emergency: isEmergency,
        accuracy_rating: 'pending'
      })
      .select()
      .single();
    
    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }
    
    console.log('Query saved to database:', savedQuery.id);
    
    return new Response(
      JSON.stringify({
        id: savedQuery.id,
        translated_query: translatedQuery,
        response: finalResponse,
        citations,
        is_emergency: isEmergency,
        user_language: detectedLang
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error processing query:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Failed to process health query'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
