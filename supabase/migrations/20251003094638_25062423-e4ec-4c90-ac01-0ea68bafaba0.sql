-- Add channel field to health_queries table
ALTER TABLE public.health_queries 
ADD COLUMN channel TEXT DEFAULT 'web' CHECK (channel IN ('web', 'whatsapp', 'sms'));

-- Add index for channel filtering
CREATE INDEX idx_health_queries_channel ON public.health_queries(channel);

-- Add phone number field for WhatsApp/SMS tracking (optional)
ALTER TABLE public.health_queries 
ADD COLUMN phone_number TEXT;