import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // GET /admin-queries - Fetch all queries
    if (req.method === 'GET' && path.includes('/admin-queries')) {
      const { data, error } = await supabase
        .from('health_queries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ queries: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /admin-queries/:id - Update accuracy rating
    if (req.method === 'PATCH') {
      const pathParts = path.split('/');
      const id = pathParts[pathParts.length - 1];
      
      const { accuracy_rating } = await req.json();
      
      if (!['correct', 'incorrect', 'pending'].includes(accuracy_rating)) {
        throw new Error('Invalid accuracy rating');
      }

      const { data, error } = await supabase
        .from('health_queries')
        .update({ accuracy_rating })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ query: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /admin-queries/analytics - Get analytics data
    if (req.method === 'GET' && path.includes('/analytics')) {
      // Fetch all queries for analytics
      const { data: allQueries, error: queriesError } = await supabase
        .from('health_queries')
        .select('*');

      if (queriesError) throw queriesError;

      // Calculate analytics
      const totalQueries = allQueries.length;
      const emergencyCount = allQueries.filter(q => q.is_emergency).length;
      
      // Accuracy calculation
      const ratedQueries = allQueries.filter(q => q.accuracy_rating !== 'pending');
      const correctQueries = ratedQueries.filter(q => q.accuracy_rating === 'correct').length;
      const accuracyPercentage = ratedQueries.length > 0 
        ? Math.round((correctQueries / ratedQueries.length) * 100)
        : 0;

      // Language distribution
      const languageDistribution: Record<string, number> = {};
      allQueries.forEach(q => {
        languageDistribution[q.user_language] = (languageDistribution[q.user_language] || 0) + 1;
      });

      // Common queries (simplified - extract keywords)
      const queryWords: Record<string, number> = {};
      allQueries.forEach(q => {
        const words = q.translated_query?.toLowerCase().split(' ') || [];
        words.forEach((word: string) => {
          if (word.length > 4) { // Only count meaningful words
            queryWords[word] = (queryWords[word] || 0) + 1;
          }
        });
      });

      const topQueries = Object.entries(queryWords)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));

      // Weekly emergency trend (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const weeklyEmergencies = allQueries.filter(q => 
        q.is_emergency && new Date(q.created_at) >= sevenDaysAgo
      ).length;

      return new Response(
        JSON.stringify({
          totalQueries,
          emergencyCount,
          accuracyPercentage,
          languageDistribution,
          topQueries,
          weeklyEmergencies,
          ratedQueriesCount: ratedQueries.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-queries:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
