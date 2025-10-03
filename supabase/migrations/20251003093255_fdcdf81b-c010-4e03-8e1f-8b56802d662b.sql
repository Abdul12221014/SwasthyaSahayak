-- Create health queries table
CREATE TABLE IF NOT EXISTS public.health_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_language TEXT NOT NULL,
  original_query TEXT NOT NULL,
  translated_query TEXT,
  response TEXT,
  citations TEXT[],
  is_emergency BOOLEAN DEFAULT false,
  accuracy_rating TEXT CHECK (accuracy_rating IN ('correct', 'incorrect', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.health_queries ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no authentication required for this public health service)
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

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_health_queries_updated_at
BEFORE UPDATE ON public.health_queries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient querying
CREATE INDEX idx_health_queries_created_at ON public.health_queries(created_at DESC);
CREATE INDEX idx_health_queries_language ON public.health_queries(user_language);
CREATE INDEX idx_health_queries_accuracy ON public.health_queries(accuracy_rating);