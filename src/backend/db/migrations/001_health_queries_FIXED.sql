-- Health Queries Table Migration (FIXED VERSION)
-- Run this ENTIRE SQL script in one go

-- Step 1: Create the table
CREATE TABLE IF NOT EXISTS public.health_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_language TEXT NOT NULL,
  original_query TEXT NOT NULL,
  translated_query TEXT,
  response TEXT,
  citations TEXT[],
  is_emergency BOOLEAN DEFAULT false,
  accuracy_rating TEXT CHECK (accuracy_rating IN ('correct', 'incorrect', 'pending')),
  channel TEXT DEFAULT 'web' CHECK (channel IN ('web', 'whatsapp', 'sms')),
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 2: Enable Row Level Security
ALTER TABLE public.health_queries ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view health queries" ON public.health_queries;
DROP POLICY IF EXISTS "Anyone can create health queries" ON public.health_queries;
DROP POLICY IF EXISTS "Anyone can update health queries" ON public.health_queries;

-- Step 4: Create policies
CREATE POLICY "Anyone can view health queries" 
ON public.health_queries 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create health queries" 
ON public.health_queries 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update health queries" 
ON public.health_queries 
FOR UPDATE 
USING (true);

-- Step 5: Create function for timestamp updates (drop if exists first)
DROP FUNCTION IF EXISTS public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Step 6: Drop trigger if exists, then create
DROP TRIGGER IF EXISTS update_health_queries_updated_at ON public.health_queries;
CREATE TRIGGER update_health_queries_updated_at
BEFORE UPDATE ON public.health_queries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Step 7: Create indexes (drop if exists first to avoid conflicts)
DROP INDEX IF EXISTS idx_health_queries_created_at;
DROP INDEX IF EXISTS idx_health_queries_language;
DROP INDEX IF EXISTS idx_health_queries_accuracy;
DROP INDEX IF EXISTS idx_health_queries_channel;

CREATE INDEX idx_health_queries_created_at ON public.health_queries(created_at DESC);
CREATE INDEX idx_health_queries_language ON public.health_queries(user_language);
CREATE INDEX idx_health_queries_accuracy ON public.health_queries(accuracy_rating);
CREATE INDEX idx_health_queries_channel ON public.health_queries(channel);
