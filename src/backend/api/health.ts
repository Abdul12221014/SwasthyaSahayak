/**
 * Health Check Endpoints
 * 
 * Provides health and readiness checks for the application.
 * Used by load balancers and monitoring systems.
 * 
 * @module backend/api/health
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { logger } from "@/backend/utils/logger.ts";
import { metrics } from "@/backend/utils/metrics.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  environment: string;
  uptime: number;
  version?: string;
}

interface ReadyStatus {
  status: 'ready' | 'not_ready';
  timestamp: string;
  checks: {
    database: 'healthy' | 'unhealthy';
    ml_service: 'healthy' | 'unhealthy' | 'unknown';
  };
  errors?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = logger.generateRequestId();
  const startTime = Date.now();

  try {
    const url = new URL(req.url);
    const endpoint = url.pathname;

    logger.logRequestStart(requestId, req.method, endpoint);

    let response: Response;

    if (endpoint.includes('/healthz')) {
      response = await handleHealthCheck(requestId);
    } else if (endpoint.includes('/readyz')) {
      response = await handleReadyCheck(requestId);
    } else if (endpoint.includes('/metrics')) {
      response = await handleMetrics(requestId);
    } else {
      response = new Response(
        JSON.stringify({ error: 'Not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const duration = Date.now() - startTime;
    logger.logRequestEnd(requestId, req.method, endpoint, response.status, duration);

    return response;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logError(error as Error, { requestId, endpoint: req.url });
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Handle health check endpoint
 */
async function handleHealthCheck(requestId: string): Promise<Response> {
  const startTime = Date.now();

  try {
    const healthStatus: HealthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: Deno.env.get('ENV_NAME') || 'development',
      uptime: process.uptime ? process.uptime() : 0,
      version: Deno.env.get('APP_VERSION') || '1.0.0'
    };

    const duration = Date.now() - startTime;
    metrics.incrementCounter('health_check_total');
    metrics.recordHistogram('health_check_latency_ms_hist', duration);

    logger.info('Health check completed', { requestId, status: 'ok', duration });

    return new Response(
      JSON.stringify(healthStatus),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    metrics.incrementCounter('health_check_failures_total');
    logger.logError(error as Error, { requestId, operation: 'health_check' });
    
    return new Response(
      JSON.stringify({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle readiness check endpoint
 */
async function handleReadyCheck(requestId: string): Promise<Response> {
  const startTime = Date.now();
  const errors: string[] = [];
  const checks = {
    database: 'healthy' as 'healthy' | 'unhealthy',
    ml_service: 'unknown' as 'healthy' | 'unhealthy' | 'unknown'
  };

  try {
    // Check database connectivity
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { error } = await supabase
        .from('health_queries')
        .select('id')
        .limit(1);

      if (error) {
        checks.database = 'unhealthy';
        errors.push(`Database error: ${error.message}`);
      }
    } catch (error) {
      checks.database = 'unhealthy';
      errors.push(`Database connection failed: ${error.message}`);
    }

    // Check ML service connectivity
    try {
      const mlServiceUrl = Deno.env.get('VITE_ML_SERVICE_URL') || 'http://localhost:8000';
      const timeoutMs = parseInt(Deno.env.get('HEALTH_CHECK_TIMEOUT_MS') || '5000');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${mlServiceUrl}/health`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        checks.ml_service = 'healthy';
      } else {
        checks.ml_service = 'unhealthy';
        errors.push(`ML service returned ${response.status}`);
      }
    } catch (error) {
      checks.ml_service = 'unhealthy';
      errors.push(`ML service unreachable: ${error.message}`);
    }

    const duration = Date.now() - startTime;
    const isReady = checks.database === 'healthy' && checks.ml_service === 'healthy';

    metrics.incrementCounter('health_check_total');
    metrics.recordHistogram('health_check_latency_ms_hist', duration);

    const readyStatus: ReadyStatus = {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
      ...(errors.length > 0 && { errors })
    };

    logger.info('Readiness check completed', { 
      requestId, 
      status: readyStatus.status, 
      checks, 
      duration 
    });

    return new Response(
      JSON.stringify(readyStatus),
      { 
        status: isReady ? 200 : 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    metrics.incrementCounter('health_check_failures_total');
    logger.logError(error as Error, { requestId, operation: 'readiness_check' });
    
    return new Response(
      JSON.stringify({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        checks: { database: 'unhealthy', ml_service: 'unhealthy' },
        errors: ['Readiness check failed']
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle metrics endpoint
 */
async function handleMetrics(requestId: string): Promise<Response> {
  try {
    const metricsData = metrics.getMetricsJSON();
    
    logger.info('Metrics endpoint accessed', { requestId });

    return new Response(
      JSON.stringify(metricsData),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    logger.logError(error as Error, { requestId, operation: 'metrics' });
    
    return new Response(
      JSON.stringify({ error: 'Metrics unavailable' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
