/**
 * Supabase Integration Test Endpoint
 * 
 * Tests:
 * 1. Connection to Supabase
 * 2. Table structure validation
 * 3. Data count verification
 * 4. RPC function availability
 * 5. Sample query test
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default async function testSupabaseHandler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const results: any[] = [];

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Test 1: Environment Variables
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      results.push({
        test: 'Environment Variables',
        status: 'FAIL',
        message: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
      });
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials', results }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    results.push({
      test: 'Environment Variables',
      status: 'PASS',
      message: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY found'
    });

    // Test 2: Supabase Connection
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    results.push({
      test: 'Supabase Connection',
      status: 'PASS',
      message: 'Client created successfully'
    });

    // Test 3: Table Existence
    const { data: tableData, error: tableError } = await supabase
      .from('health_documents')
      .select('id')
      .limit(1);

    if (tableError) {
      results.push({
        test: 'Table Existence',
        status: 'FAIL',
        message: `Table not accessible: ${tableError.message}`,
        details: tableError
      });
    } else {
      results.push({
        test: 'Table Existence',
        status: 'PASS',
        message: 'health_documents table exists and is accessible'
      });
    }

    // Test 4: Data Count
    const { count, error: countError } = await supabase
      .from('health_documents')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      results.push({
        test: 'Data Count',
        status: 'FAIL',
        message: `Failed to count documents: ${countError.message}`,
        details: countError
      });
    } else {
      const docCount = count || 0;
      results.push({
        test: 'Data Count',
        status: docCount === 0 ? 'WARN' : 'PASS',
        message: `Found ${docCount} documents in health_documents table`,
        details: { count: docCount }
      });
    }

    // Test 5: Sample Document Structure
    const { data: sampleDoc, error: sampleError } = await supabase
      .from('health_documents')
      .select('id, title, language, source, category, content, chunk_index, embedding, metadata, created_at')
      .limit(1)
      .maybeSingle();

    if (sampleError) {
      results.push({
        test: 'Document Structure',
        status: 'FAIL',
        message: `Failed to fetch sample: ${sampleError.message}`,
        details: sampleError
      });
    } else if (!sampleDoc) {
      results.push({
        test: 'Document Structure',
        status: 'WARN',
        message: 'No documents to sample (table is empty)'
      });
    } else {
      const requiredFields = ['id', 'title', 'language', 'source', 'content', 'chunk_index'];
      const missingFields = requiredFields.filter(field => !(field in sampleDoc));
      
      if (missingFields.length > 0) {
        results.push({
          test: 'Document Structure',
          status: 'FAIL',
          message: `Missing required fields: ${missingFields.join(', ')}`,
          details: { sampleDoc, missingFields }
        });
      } else {
        const hasEmbedding = sampleDoc.embedding !== null && Array.isArray(sampleDoc.embedding);
        results.push({
          test: 'Document Structure',
          status: 'PASS',
          message: 'Document structure is valid',
          details: {
            hasEmbedding,
            embeddingLength: hasEmbedding ? sampleDoc.embedding.length : 0,
            fields: Object.keys(sampleDoc)
          }
        });
      }
    }

    // Test 6: RPC Function - match_health_documents
    const dummyEmbedding = new Array(768).fill(0.1);
    
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('match_health_documents', {
        query_embedding: dummyEmbedding,
        match_count: 3,
        similarity_threshold: 0.0
      });

    if (rpcError) {
      results.push({
        test: 'RPC: match_health_documents',
        status: 'FAIL',
        message: `RPC function error: ${rpcError.message}`,
        details: rpcError
      });
    } else {
      const resultCount = rpcData?.length || 0;
      results.push({
        test: 'RPC: match_health_documents',
        status: resultCount === 0 ? 'WARN' : 'PASS',
        message: `RPC function works correctly, returned ${resultCount} results`,
        details: {
          resultCount,
          sampleResult: rpcData?.[0] ? {
            id: rpcData[0].id,
            title: rpcData[0].title,
            similarity: rpcData[0].similarity
          } : null
        }
      });
    }

    // Test 7: RPC Function - hybrid_search_health_documents
    const { data: hybridData, error: hybridError } = await supabase
      .rpc('hybrid_search_health_documents', {
        query_embedding: dummyEmbedding,
        query_text: 'fever',
        match_count: 3,
        vector_weight: 0.6,
        text_weight: 0.4
      });

    if (hybridError) {
      results.push({
        test: 'RPC: hybrid_search_health_documents',
        status: 'FAIL',
        message: `RPC function error: ${hybridError.message}`,
        details: hybridError
      });
    } else {
      const resultCount = hybridData?.length || 0;
      results.push({
        test: 'RPC: hybrid_search_health_documents',
        status: resultCount === 0 ? 'WARN' : 'PASS',
        message: `RPC function works correctly, returned ${resultCount} results`,
        details: {
          resultCount,
          sampleResult: hybridData?.[0] ? {
            id: hybridData[0].id,
            title: hybridData[0].title,
            hybrid_score: hybridData[0].hybrid_score
          } : null
        }
      });
    }

    // Test 8: KB Metadata Table
    const { data: metaData, error: metaError } = await supabase
      .from('kb_meta')
      .select('*');

    if (metaError) {
      results.push({
        test: 'KB Metadata',
        status: 'FAIL',
        message: `Failed to access kb_meta: ${metaError.message}`,
        details: metaError
      });
    } else {
      results.push({
        test: 'KB Metadata',
        status: 'PASS',
        message: `KB metadata accessible, ${metaData?.length || 0} entries found`,
        details: {
          entries: metaData?.map(m => ({ key: m.key, value: m.value })) || []
        }
      });
    }

    // Test 9: Language Distribution
    const { data: langData, error: langError } = await supabase
      .from('health_documents')
      .select('language')
      .limit(1000);

    if (langError) {
      results.push({
        test: 'Language Distribution',
        status: 'FAIL',
        message: `Failed to check languages: ${langError.message}`,
        details: langError
      });
    } else if (!langData || langData.length === 0) {
      results.push({
        test: 'Language Distribution',
        status: 'WARN',
        message: 'No documents to analyze language distribution'
      });
    } else {
      const langCounts: Record<string, number> = {};
      langData.forEach(doc => {
        const lang = doc.language || 'unknown';
        langCounts[lang] = (langCounts[lang] || 0) + 1;
      });
      results.push({
        test: 'Language Distribution',
        status: 'PASS',
        message: 'Language distribution analyzed',
        details: { distribution: langCounts }
      });
    }

    // Test 10: Embedding Dimension Check
    const { data: embedData, error: embedError } = await supabase
      .from('health_documents')
      .select('embedding')
      .not('embedding', 'is', null)
      .limit(1)
      .maybeSingle();

    if (embedError) {
      results.push({
        test: 'Embedding Dimensions',
        status: 'FAIL',
        message: `Failed to check embeddings: ${embedError.message}`,
        details: embedError
      });
    } else if (!embedData || !embedData.embedding) {
      results.push({
        test: 'Embedding Dimensions',
        status: 'WARN',
        message: 'No documents with embeddings found'
      });
    } else {
      const embedArray = embedData.embedding as number[];
      const expectedDim = 768;
      if (embedArray.length === expectedDim) {
        results.push({
          test: 'Embedding Dimensions',
          status: 'PASS',
          message: `Embeddings have correct dimension: ${expectedDim}`,
          details: { dimension: embedArray.length }
        });
      } else {
        results.push({
          test: 'Embedding Dimensions',
          status: 'FAIL',
          message: `Embedding dimension mismatch: expected ${expectedDim}, got ${embedArray.length}`,
          details: {
            expected: expectedDim,
            actual: embedArray.length
          }
        });
      }
    }

    // Summary
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warnings = results.filter(r => r.status === 'WARN').length;

    return new Response(
      JSON.stringify({
        success: failed === 0,
        summary: {
          passed,
          failed,
          warnings,
          total: results.length
        },
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    results.push({
      test: 'Test Execution',
      status: 'FAIL',
      message: `Test execution failed: ${error}`,
      details: error
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }       }
    );
  }
}

