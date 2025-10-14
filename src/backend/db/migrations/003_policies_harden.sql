-- Harden Row Level Security Policies
-- Prevent PHI exposure and unauthorized access

-- ========================================
-- health_queries table - RLS hardening
-- ========================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can view health queries" ON public.health_queries;
DROP POLICY IF EXISTS "Anyone can create health queries" ON public.health_queries;
DROP POLICY IF EXISTS "Anyone can update health queries" ON public.health_queries;

-- New restrictive policies

-- SELECT: Only service role can read (for admin dashboard)
CREATE POLICY "Service role can view health queries"
ON public.health_queries
FOR SELECT
TO service_role
USING (true);

-- INSERT: Only service role can create (via edge functions)
CREATE POLICY "Service role can create health queries"
ON public.health_queries
FOR INSERT
TO service_role
WITH CHECK (true);

-- UPDATE: Only service role can update (for accuracy ratings)
CREATE POLICY "Service role can update health queries"
ON public.health_queries
FOR UPDATE
TO service_role
USING (true);

-- DELETE: Disabled (retain all queries for analytics)
-- No DELETE policy = no one can delete

-- ========================================
-- health_documents table - RLS setup
-- ========================================

-- Enable RLS
ALTER TABLE public.health_documents ENABLE ROW LEVEL SECURITY;

-- SELECT: Service role can read (for RAG retrieval)
CREATE POLICY "Service role can view health documents"
ON public.health_documents
FOR SELECT
TO service_role
USING (true);

-- INSERT: Only service role can insert (via ingestion API)
CREATE POLICY "Service role can insert health documents"
ON public.health_documents
FOR INSERT
TO service_role
WITH CHECK (true);

-- UPDATE: Only service role can update (for re-embedding)
CREATE POLICY "Service role can update health documents"
ON public.health_documents
FOR UPDATE
TO service_role
USING (true);

-- DELETE: Only service role can delete (cleanup)
CREATE POLICY "Service role can delete health documents"
ON public.health_documents
FOR DELETE
TO service_role
USING (true);

-- ========================================
-- kb_meta table - RLS setup
-- ========================================

ALTER TABLE public.kb_meta ENABLE ROW LEVEL SECURITY;

-- SELECT: Service role only
CREATE POLICY "Service role can view kb_meta"
ON public.kb_meta
FOR SELECT
TO service_role
USING (true);

-- INSERT/UPDATE: Service role only
CREATE POLICY "Service role can modify kb_meta"
ON public.kb_meta
FOR ALL
TO service_role
USING (true);

-- ========================================
-- Additional Security Measures
-- ========================================

-- Revoke public access
REVOKE ALL ON public.health_queries FROM PUBLIC;
REVOKE ALL ON public.health_documents FROM PUBLIC;
REVOKE ALL ON public.kb_meta FROM PUBLIC;

-- Grant specific permissions to service role
GRANT SELECT, INSERT, UPDATE ON public.health_queries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_documents TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.kb_meta TO service_role;

-- Ensure RLS is enforced
ALTER TABLE public.health_queries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.health_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.kb_meta FORCE ROW LEVEL SECURITY;

-- Log security changes
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies hardened for health_queries';
  RAISE NOTICE '✅ RLS enabled for health_documents';
  RAISE NOTICE '✅ RLS enabled for kb_meta';
  RAISE NOTICE '✅ Public access revoked from all tables';
  RAISE NOTICE '⚠️  Only service_role can access data';
END $$;

