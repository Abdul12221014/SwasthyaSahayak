/**
 * Verify Supabase Migration Status
 * 
 * Checks if RPC functions and tables exist after migration.
 * 
 * Usage:
 *   deno run --allow-net --allow-env verify-migration.ts
 */

// @ts-ignore - Deno runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

async function verifyMigration() {
  console.log('🔍 Verifying Supabase Migration Status');
  console.log('=' .repeat(60));
  console.log('');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase credentials');
    Deno.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const results: any[] = [];

  // Test 1: Check if health_documents table exists
  try {
    const { data, error } = await supabase
      .from('health_documents')
      .select('id')
      .limit(1);
    
    if (error) {
      results.push({ test: 'health_documents table', status: 'FAIL', message: error.message });
    } else {
      results.push({ test: 'health_documents table', status: 'PASS', message: 'Table exists' });
    }
  } catch (error) {
    results.push({ test: 'health_documents table', status: 'FAIL', message: String(error) });
  }

  // Test 2: Check if kb_meta table exists
  try {
    const { data, error } = await supabase
      .from('kb_meta')
      .select('key')
      .limit(1);
    
    if (error) {
      results.push({ test: 'kb_meta table', status: 'FAIL', message: error.message });
    } else {
      results.push({ test: 'kb_meta table', status: 'PASS', message: 'Table exists' });
    }
  } catch (error) {
    results.push({ test: 'kb_meta table', status: 'FAIL', message: String(error) });
  }

  // Test 3: Check if match_health_documents RPC exists
  try {
    const dummyEmbedding = new Array(768).fill(0.1);
    const { data, error } = await supabase
      .rpc('match_health_documents', {
        query_embedding: dummyEmbedding,
        match_count: 1,
        similarity_threshold: 0.0
      });
    
    if (error) {
      if (error.code === 'PGRST202') {
        results.push({ 
          test: 'match_health_documents RPC', 
          status: 'FAIL', 
          message: 'Function does not exist - migration not applied' 
        });
      } else {
        results.push({ 
          test: 'match_health_documents RPC', 
          status: 'PASS', 
          message: 'Function exists (may return empty results if no embeddings)' 
        });
      }
    } else {
      results.push({ 
        test: 'match_health_documents RPC', 
        status: 'PASS', 
        message: `Function exists and works (returned ${data?.length || 0} results)` 
      });
    }
  } catch (error) {
    results.push({ test: 'match_health_documents RPC', status: 'FAIL', message: String(error) });
  }

  // Test 4: Check if hybrid_search_health_documents RPC exists
  try {
    const dummyEmbedding = new Array(768).fill(0.1);
    const { data, error } = await supabase
      .rpc('hybrid_search_health_documents', {
        query_embedding: dummyEmbedding,
        query_text: 'test',
        match_count: 1,
        vector_weight: 0.6,
        text_weight: 0.4
      });
    
    if (error) {
      if (error.code === 'PGRST202') {
        results.push({ 
          test: 'hybrid_search_health_documents RPC', 
          status: 'FAIL', 
          message: 'Function does not exist - migration not applied' 
        });
      } else {
        results.push({ 
          test: 'hybrid_search_health_documents RPC', 
          status: 'PASS', 
          message: 'Function exists' 
        });
      }
    } else {
      results.push({ 
        test: 'hybrid_search_health_documents RPC', 
        status: 'PASS', 
        message: `Function exists and works` 
      });
    }
  } catch (error) {
    results.push({ test: 'hybrid_search_health_documents RPC', status: 'FAIL', message: String(error) });
  }

  // Summary
  console.log('📊 Verification Results:');
  console.log('');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${result.test}: ${result.message}`);
  });

  console.log('');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('');

  if (failed > 0) {
    console.log('⚠️  Migration not fully applied.');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Run: src/backend/db/migrations/002_pgvector_kb.sql');
    console.log('3. Run this verification script again');
    console.log('');
    Deno.exit(1);
  } else {
    console.log('✅ All migrations applied successfully!');
    console.log('');
    console.log('🎉 RPC functions are ready for vector search!');
  }
}

if (import.meta.main) {
  await verifyMigration();
}

