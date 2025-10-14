/**
 * Re-embed Knowledge Base API
 * 
 * Re-generates embeddings for all KB documents when model version changes.
 * Triggered manually via admin dashboard or automatically on version bump.
 * 
 * Protected by admin token.
 * 
 * @module backend/api/reembed-kb
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
 * Get current embedding model version from ML service
 */
async function getCurrentModelVersion(): Promise<string> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/versions`);
    if (!response.ok) throw new Error('ML service unavailable');
    
    const data = await response.json();
    return data.embedding_model || 'unknown';
  } catch (error) {
    console.error('Failed to get model version:', error);
    return 'unknown';
  }
}

/**
 * Generate embeddings in batches
 */
async function getBatchEmbeddings(texts: string[], batchSize = 100): Promise<number[][]> {
  const allEmbeddings: number[][] = [];
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    
    const response = await fetch(`${ML_SERVICE_URL}/embed-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: batch, normalize: true })
    });
    
    if (!response.ok) {
      throw new Error(`Batch embedding failed at index ${i}`);
    }
    
    const data = await response.json();
    allEmbeddings.push(...data.embeddings);
    
    console.log(`   Processed ${i + batch.length} / ${texts.length} documents`);
  }
  
  return allEmbeddings;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication
    const adminToken = req.headers.get('X-Admin-Token');
    if (adminToken !== ADMIN_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔄 Starting KB re-embedding process...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // STEP 1: Check current vs new model version
    console.log('📋 Step 1: Checking model versions...');
    
    const { data: metaData } = await supabase
      .from('kb_meta')
      .select('value')
      .eq('key', 'embedding_model_version')
      .single();

    const storedVersion = metaData?.value || 'unknown';
    const currentVersion = await getCurrentModelVersion();

    console.log(`   Stored version: ${storedVersion}`);
    console.log(`   Current version: ${currentVersion}`);

    if (storedVersion === currentVersion && storedVersion !== 'unknown') {
      return new Response(
        JSON.stringify({
          message: 'KB already up to date',
          version: currentVersion,
          reembedded: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 2: Fetch all documents
    console.log('📚 Step 2: Fetching all KB documents...');
    
    const { data: documents, error: fetchError } = await supabase
      .from('health_documents')
      .select('id, content')
      .order('id');

    if (fetchError) throw fetchError;

    console.log(`   ✓ Found ${documents.length} documents to re-embed`);

    if (documents.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No documents in KB to re-embed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 3: Generate new embeddings
    console.log('🧠 Step 3: Generating new embeddings...');
    
    const texts = documents.map(d => d.content);
    const newEmbeddings = await getBatchEmbeddings(texts, 100);

    console.log(`   ✓ Generated ${newEmbeddings.length} new embeddings`);

    // STEP 4: Update database
    console.log('💾 Step 4: Updating database...');
    
    for (let i = 0; i < documents.length; i++) {
      const { error: updateError } = await supabase
        .from('health_documents')
        .update({ embedding: newEmbeddings[i] })
        .eq('id', documents[i].id);

      if (updateError) {
        console.error(`Failed to update document ${documents[i].id}:`, updateError);
      }
      
      if ((i + 1) % 100 === 0) {
        console.log(`   Updated ${i + 1} / ${documents.length} documents`);
      }
    }

    console.log(`   ✓ Updated all ${documents.length} documents`);

    // STEP 5: Update metadata
    console.log('📝 Step 5: Updating metadata...');
    
    await supabase
      .from('kb_meta')
      .upsert({
        key: 'embedding_model_version',
        value: currentVersion
      }, { onConflict: 'key' });

    await supabase
      .from('kb_meta')
      .upsert({
        key: 'last_reembed',
        value: new Date().toISOString()
      }, { onConflict: 'key' });

    console.log('✅ Re-embedding complete!\n');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'KB re-embedded successfully',
        documents_updated: documents.length,
        old_version: storedVersion,
        new_version: currentVersion
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Re-embed error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to re-embed KB'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

