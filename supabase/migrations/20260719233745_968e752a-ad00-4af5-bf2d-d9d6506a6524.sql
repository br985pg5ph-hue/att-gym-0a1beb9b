ALTER TABLE public.gym_info ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE public.gym_info ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

UPDATE public.gym_info
SET instagram_url = 'https://instagram.com/attacademy',
    whatsapp_number = '+962790000000'
WHERE instagram_url IS NULL OR whatsapp_number IS NULL;
