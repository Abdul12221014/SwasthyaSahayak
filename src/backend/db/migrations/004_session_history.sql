-- Idempotent creation of session history table for conversation context

-- Create table if not exists
CREATE TABLE IF NOT EXISTS public.health_session_history (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  query TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_history_session_id ON public.health_session_history (session_id);
CREATE INDEX IF NOT EXISTS idx_session_history_created_at ON public.health_session_history (created_at DESC);

-- Simple retention policy note:
-- Consider scheduled cleanup (e.g., keep last N per session) if needed later.


