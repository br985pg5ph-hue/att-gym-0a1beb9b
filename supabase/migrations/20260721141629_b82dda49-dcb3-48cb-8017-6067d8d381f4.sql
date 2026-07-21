ALTER TABLE public.gym_info ADD COLUMN IF NOT EXISTS maps_url TEXT;
GRANT SELECT ON public.gym_info TO anon, authenticated;
GRANT ALL ON public.gym_info TO service_role;