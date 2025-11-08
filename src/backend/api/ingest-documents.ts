/**
 * Knowledge Base Document Ingestion API
 * 
 * Handles ingestion of health documents into the vector database:
 * 1. Text chunking (sentence-aware)
 * 2. Batch embedding generation
 * 3. Storage in health_documents table
 * 
 * Protected by admin token authentication.
 * 
 * @module backend/api/ingest-documents
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
};

const ADMIN_TOKEN = Deno.env.get('ADMIN_INGEST_TOKEN') || 'change-me-in-production';
const ML_SERVICE_URL = Deno.env.get('ML_SERVICE_URL') || 'http://localhost:8000';

/**
 * Simple text chunker (Deno-compatible version)
 */
function chunkText(text: string, maxTokens = 500, overlap = 70): string[] {
  if (!text || text.trim().length === 0) return [];
  
  // Estimate tokens (1 token ≈ 4 chars)
  const estimateTokens = (t: string) => Math.ceil(t.length / 4);
  
  if (estimateTokens(text) <= maxTokens) {
    return [text.trim()];
  }
  
  // Split into sentences
  const sentences = text.split(/([.!?।॥]+\s+)/).filter(s => s.trim());
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;
  
  for (const sentence of sentences) {
    const sentTokens = estimateTokens(sentence);
    
    if (currentTokens + sentTokens > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.join(''));
      
      // Keep overlap
      const overlapSents: string[] = [];
      let overlapTokens = 0;
      for (let i = currentChunk.length - 1; i >= 0; i--) {
        const t = estimateTokens(currentChunk[i]);
        if (overlapTokens + t <= overlap) {
          overlapSents.unshift(currentChunk[i]);
          overlapTokens += t;
        } else break;
      }
      
      currentChunk = overlapSents;
      currentTokens = overlapTokens;
    }
    
    currentChunk.push(sentence);
    currentTokens += sentTokens;
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(''));
  }
  
  return chunks.map(c => c.trim()).filter(c => c.length > 0);
}

/**
 * Call ML service for batch embeddings
 */
async function getBatchEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/embed-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, normalize: true })
    });
    
    if (!response.ok) {
      throw new Error(`ML Service error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.embeddings;
  } catch (error) {
    console.error('Batch embedding failed:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const adminToken = req.headers.get('X-Admin-Token');
    if (adminToken !== ADMIN_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Admin token required.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { title, language = 'en', source, content, category } = await req.json();
    
    if (!title || !source || !content) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, source, content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📄 Ingesting document: ${title}`);
    console.log(`   Source: ${source}`);
    console.log(`   Language: ${language}`);
    console.log(`   Content length: ${content.length} chars`);

    // STEP 1: Chunk text
    console.log('🔪 Step 1: Chunking text...');
    const chunks = chunkText(content, 500, 70);
    console.log(`   ✓ Created ${chunks.length} chunks`);

    // STEP 2: Generate embeddings
    console.log('🧠 Step 2: Generating embeddings...');
    const embeddings = await getBatchEmbeddings(chunks);
    console.log(`   ✓ Generated ${embeddings.length} embeddings (dim: ${embeddings[0]?.length})`);

    // STEP 3: Store in database
    console.log('💾 Step 3: Storing in database...');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Map chunks to table structure (flat fields, not nested metadata)
    const documents = chunks.map((chunk, index) => ({
      title: title,
      language: language || 'en',
      source: source,
      category: category || null,
      content: chunk,
      chunk_index: index,
      embedding: embeddings[index],
      metadata: {
        url: source, // Additional metadata in JSONB
        original_title: title
      }
    }));

    // Insert into Supabase Vector table
    const { data, error } = await supabase
      .from('health_documents')
      .insert(documents)
      .select();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log(`   ✓ Stored ${data.length} document chunks`);

    // STEP 4: Update KB metadata
    const { error: metaError } = await supabase
      .from('kb_meta')
      .upsert({
        key: 'last_ingest',
        value: new Date().toISOString()
      }, { onConflict: 'key' });

    if (metaError) {
      console.warn('Failed to update kb_meta:', metaError);
    }

    // STEP 5: Update total documents count
    const { count } = await supabase
      .from('health_documents')
      .select('*', { count: 'exact', head: true });

    await supabase
      .from('kb_meta')
      .upsert({
        key: 'total_documents',
        value: count?.toString() || '0'
      }, { onConflict: 'key' });

    console.log('✅ Ingestion complete!\n');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Document ingested successfully',
        chunks_created: chunks.length,
        embeddings_generated: embeddings.length,
        total_kb_documents: count
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Ingestion error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to ingest document'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

