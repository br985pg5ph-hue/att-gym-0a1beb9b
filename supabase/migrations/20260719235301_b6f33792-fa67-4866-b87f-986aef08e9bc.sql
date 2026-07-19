
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_parent boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TABLE public.children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  date_of_birth date,
  gender text,
  experience_level text,
  injuries_notes text,
  emergency_contact_name text,
  emergency_contact_phone text,
  classes_remaining integer NOT NULL DEFAULT 0,
  streak integer NOT NULL DEFAULT 0,
  classes_attended integer NOT NULL DEFAULT 0,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.children TO authenticated;
GRANT ALL ON public.children TO service_role;

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents manage own children" ON public.children
  FOR ALL TO authenticated
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Staff can view all children" ON public.children
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));

CREATE TRIGGER children_updated_at
  BEFORE UPDATE ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS child_id uuid REFERENCES public.children(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS bookings_child_id_idx ON public.bookings(child_id);
CREATE INDEX IF NOT EXISTS children_parent_id_idx ON public.children(parent_id);
