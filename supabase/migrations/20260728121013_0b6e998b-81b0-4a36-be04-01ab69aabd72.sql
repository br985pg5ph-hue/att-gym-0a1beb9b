-- 1. gyms table
CREATE TABLE public.gyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  logo_url text,
  primary_color text,
  secondary_color text,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  address text NOT NULL DEFAULT '',
  lat numeric NOT NULL DEFAULT 0,
  lng numeric NOT NULL DEFAULT 0,
  phone text NOT NULL DEFAULT '',
  hours jsonb NOT NULL DEFAULT '[]'::jsonb,
  instagram_url text,
  whatsapp_number text,
  maps_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.gyms TO authenticated;
GRANT ALL ON public.gyms TO service_role;
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

INSERT INTO public.gyms (slug, name, address, lat, lng, phone, hours, instagram_url, whatsapp_number, maps_url)
SELECT 'att-academy', g.name, g.address, g.lat, g.lng, g.phone, g.hours, g.instagram_url, g.whatsapp_number, g.maps_url
FROM public.gym_info g WHERE g.id = 1;

-- 2. gym_id on every tenant-scoped table
ALTER TABLE public.profiles         ADD COLUMN gym_id uuid REFERENCES public.gyms(id);
ALTER TABLE public.children         ADD COLUMN gym_id uuid REFERENCES public.gyms(id);
ALTER TABLE public.classes          ADD COLUMN gym_id uuid REFERENCES public.gyms(id);
ALTER TABLE public.class_type_defs  ADD COLUMN gym_id uuid REFERENCES public.gyms(id);
ALTER TABLE public.bookings         ADD COLUMN gym_id uuid REFERENCES public.gyms(id);
ALTER TABLE public.coaches          ADD COLUMN gym_id uuid REFERENCES public.gyms(id);
ALTER TABLE public.announcements    ADD COLUMN gym_id uuid REFERENCES public.gyms(id);
ALTER TABLE public.transactions     ADD COLUMN gym_id uuid REFERENCES public.gyms(id);

DO $$
DECLARE g uuid;
BEGIN
  SELECT id INTO g FROM public.gyms WHERE slug = 'att-academy';
  UPDATE public.profiles        SET gym_id = g WHERE gym_id IS NULL;
  UPDATE public.children        SET gym_id = g WHERE gym_id IS NULL;
  UPDATE public.classes         SET gym_id = g WHERE gym_id IS NULL;
  UPDATE public.class_type_defs SET gym_id = g WHERE gym_id IS NULL;
  UPDATE public.bookings        SET gym_id = g WHERE gym_id IS NULL;
  UPDATE public.coaches         SET gym_id = g WHERE gym_id IS NULL;
  UPDATE public.announcements   SET gym_id = g WHERE gym_id IS NULL;
  UPDATE public.transactions    SET gym_id = g WHERE gym_id IS NULL;
END $$;

ALTER TABLE public.profiles        ALTER COLUMN gym_id SET NOT NULL;
ALTER TABLE public.children        ALTER COLUMN gym_id SET NOT NULL;
ALTER TABLE public.classes         ALTER COLUMN gym_id SET NOT NULL;
ALTER TABLE public.class_type_defs ALTER COLUMN gym_id SET NOT NULL;
ALTER TABLE public.bookings        ALTER COLUMN gym_id SET NOT NULL;
ALTER TABLE public.coaches         ALTER COLUMN gym_id SET NOT NULL;
ALTER TABLE public.announcements   ALTER COLUMN gym_id SET NOT NULL;
ALTER TABLE public.transactions    ALTER COLUMN gym_id SET NOT NULL;

CREATE INDEX profiles_gym_id_idx        ON public.profiles(gym_id);
CREATE INDEX children_gym_id_idx        ON public.children(gym_id);
CREATE INDEX classes_gym_starts_idx     ON public.classes(gym_id, starts_at);
CREATE INDEX class_type_defs_gym_idx    ON public.class_type_defs(gym_id);
CREATE INDEX bookings_gym_id_idx        ON public.bookings(gym_id);
CREATE INDEX coaches_gym_id_idx         ON public.coaches(gym_id);
CREATE INDEX announcements_gym_id_idx   ON public.announcements(gym_id);
CREATE INDEX transactions_gym_created_idx ON public.transactions(gym_id, created_at DESC);

-- 3. platform admin flag
ALTER TABLE public.profiles ADD COLUMN is_platform_admin boolean NOT NULL DEFAULT false;

-- 4. per-gym keys
ALTER TABLE public.classes DROP CONSTRAINT classes_type_fkey;
ALTER TABLE public.class_type_defs DROP CONSTRAINT class_type_defs_pkey;
ALTER TABLE public.class_type_defs ADD PRIMARY KEY (gym_id, key);
ALTER TABLE public.classes ADD CONSTRAINT classes_gym_type_fkey
  FOREIGN KEY (gym_id, type) REFERENCES public.class_type_defs(gym_id, key);

DROP INDEX IF EXISTS public.profiles_member_code_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_gym_member_code_key UNIQUE (gym_id, member_code);
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_referral_code_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_gym_referral_code_key UNIQUE (gym_id, referral_code);

-- 5. helper to resolve the caller's gym
CREATE OR REPLACE FUNCTION public.current_gym_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT gym_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_platform_admin FROM public.profiles WHERE id = auth.uid()), false)
$$;

CREATE OR REPLACE FUNCTION public.same_gym(_gym_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_platform_admin() OR _gym_id = public.current_gym_id()
$$;

-- 6. default gym_id on insert for every tenant table
CREATE OR REPLACE FUNCTION public.set_gym_id_default()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.gym_id IS NULL THEN
    NEW.gym_id := public.current_gym_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_gym_id BEFORE INSERT ON public.children       FOR EACH ROW EXECUTE FUNCTION public.set_gym_id_default();
CREATE TRIGGER set_gym_id BEFORE INSERT ON public.classes        FOR EACH ROW EXECUTE FUNCTION public.set_gym_id_default();
CREATE TRIGGER set_gym_id BEFORE INSERT ON public.class_type_defs FOR EACH ROW EXECUTE FUNCTION public.set_gym_id_default();
CREATE TRIGGER set_gym_id BEFORE INSERT ON public.bookings       FOR EACH ROW EXECUTE FUNCTION public.set_gym_id_default();
CREATE TRIGGER set_gym_id BEFORE INSERT ON public.coaches        FOR EACH ROW EXECUTE FUNCTION public.set_gym_id_default();
CREATE TRIGGER set_gym_id BEFORE INSERT ON public.announcements  FOR EACH ROW EXECUTE FUNCTION public.set_gym_id_default();
CREATE TRIGGER set_gym_id BEFORE INSERT ON public.transactions   FOR EACH ROW EXECUTE FUNCTION public.set_gym_id_default();

-- 7. per-gym member codes
CREATE OR REPLACE FUNCTION public.assign_member_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  next_code integer;
BEGIN
  IF NEW.member_code IS NULL OR NEW.member_code = '' THEN
    PERFORM 1 FROM public.gyms WHERE id = NEW.gym_id FOR UPDATE;
    SELECT COALESCE(MAX(NULLIF(regexp_replace(member_code, '\D', '', 'g'), '')::integer), 1000) + 1
      INTO next_code
      FROM public.profiles WHERE gym_id = NEW.gym_id;
    NEW.member_code := next_code::text;
  END IF;
  RETURN NEW;
END;
$$;
