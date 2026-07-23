
-- 1. New table
CREATE TABLE public.class_type_defs (
  key text PRIMARY KEY,
  label text NOT NULL,
  gender_restriction text NOT NULL DEFAULT 'none' CHECK (gender_restriction IN ('none','female','male')),
  credit_source text NOT NULL DEFAULT 'group' CHECK (credit_source IN ('group','pt')),
  kids_only boolean NOT NULL DEFAULT false,
  track_restricted boolean NOT NULL DEFAULT false,
  is_builtin boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.class_type_defs TO authenticated;
GRANT ALL ON public.class_type_defs TO service_role;

ALTER TABLE public.class_type_defs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view class types"
  ON public.class_type_defs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert class types"
  ON public.class_type_defs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can update class types"
  ON public.class_type_defs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff can delete non-builtin class types"
  ON public.class_type_defs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'staff') AND is_builtin = false);

CREATE TRIGGER trg_class_type_defs_touch
  BEFORE UPDATE ON public.class_type_defs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Seed built-ins matching current behaviour
INSERT INTO public.class_type_defs (key, label, gender_restriction, credit_source, kids_only, track_restricted, is_builtin, sort_order) VALUES
  ('mixed',      'Mixed',      'none',   'group', false, true,  true, 10),
  ('women_only', 'Women Only', 'female', 'group', false, true,  true, 20),
  ('yoga',       'Yoga',       'female', 'group', false, false, true, 30),
  ('gymnastics', 'Gymnastics', 'female', 'group', false, false, true, 40),
  ('pt',         'PT',         'none',   'pt',    false, false, true, 50),
  ('kids',       'Kids',       'none',   'group', true,  true,  true, 60);

-- 3. Convert classes.type from enum to text + FK
ALTER TABLE public.classes ALTER COLUMN type DROP DEFAULT;
ALTER TABLE public.classes ALTER COLUMN type TYPE text USING type::text;
ALTER TABLE public.classes ALTER COLUMN type SET DEFAULT 'mixed';
ALTER TABLE public.classes
  ADD CONSTRAINT classes_type_fkey FOREIGN KEY (type)
  REFERENCES public.class_type_defs(key) ON UPDATE CASCADE;

-- 4. Rewrite trigger functions to use the definitions table

CREATE OR REPLACE FUNCTION public.enforce_kids_class_child()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_kids boolean;
BEGIN
  SELECT d.kids_only INTO is_kids
    FROM public.classes c
    JOIN public.class_type_defs d ON d.key = c.type
    WHERE c.id = NEW.class_id;
  IF is_kids AND NEW.child_id IS NULL THEN
    RAISE EXCEPTION 'Kids classes can only be booked for a child.';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refund_class_credit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  class_row RECORD;
  desc_text text;
  csource text;
BEGIN
  IF OLD.status = 'upcoming' AND NEW.status = 'cancelled' THEN
    SELECT c.title, c.starts_at, c.type, d.credit_source
      INTO class_row
      FROM public.classes c
      JOIN public.class_type_defs d ON d.key = c.type
      WHERE c.id = NEW.class_id;
    IF class_row.credit_source = 'pt' THEN
      desc_text := 'Booking cancelled: ' || COALESCE(class_row.title, 'class')
                   || ' on ' || to_char(COALESCE(class_row.starts_at, now()), 'Mon DD, HH24:MI');
      INSERT INTO public.transactions (member_id, child_id, classes, type, source, description, service)
      VALUES (NEW.member_id, NEW.child_id, 1, 'credit', 'booking', desc_text, 'pt');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_class_credit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  class_row RECORD;
  def_row RECORD;
  desc_text text;
  expiry timestamptz;
  remaining integer;
  paused_at timestamptz;
  is_staff_caller boolean;
  track text;
  sub_start timestamptz;
  class_dow int;
  allowed_dows int[];
  window_start timestamptz;
  cap_count integer;
  member_gender text;
BEGIN
  IF NEW.status <> 'upcoming' THEN RETURN NEW; END IF;

  SELECT title, starts_at, type INTO class_row
    FROM public.classes WHERE id = NEW.class_id;

  SELECT * INTO def_row FROM public.class_type_defs WHERE key = class_row.type;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown class type: %', class_row.type;
  END IF;

  desc_text := 'Class booked: ' || COALESCE(class_row.title, 'class')
               || ' on ' || to_char(COALESCE(class_row.starts_at, now()), 'Mon DD, HH24:MI');

  is_staff_caller := COALESCE(public.has_role(auth.uid(), 'staff'), false);

  -- Gender restriction (adult bookings only)
  IF NOT is_staff_caller
     AND NEW.child_id IS NULL
     AND NOT def_row.kids_only
     AND def_row.gender_restriction <> 'none' THEN
    SELECT gender INTO member_gender FROM public.profiles WHERE id = NEW.member_id;
    IF member_gender IS NULL THEN
      RAISE EXCEPTION 'Set your gender in Profile to book this class';
    ELSIF member_gender <> def_row.gender_restriction THEN
      RAISE EXCEPTION 'This class is restricted to % members only', def_row.gender_restriction;
    END IF;
  END IF;

  IF def_row.credit_source = 'group' THEN
    IF def_row.kids_only THEN
      SELECT group_subscription_until, group_track, group_subscription_started_at
        INTO expiry, track, sub_start
        FROM public.children WHERE id = NEW.child_id;
      IF expiry IS NULL OR expiry <= now() THEN
        RAISE EXCEPTION 'This child''s group class membership isn''t active';
      END IF;
    ELSE
      SELECT group_subscription_until, membership_paused_at, group_track, group_subscription_started_at
        INTO expiry, paused_at, track, sub_start
        FROM public.profiles WHERE id = NEW.member_id;
      IF paused_at IS NOT NULL THEN
        RAISE EXCEPTION 'Your membership is paused — resume it to book group classes';
      END IF;
      IF expiry IS NULL OR expiry <= now() THEN
        RAISE EXCEPTION 'Your group class membership isn''t active';
      END IF;
    END IF;

    IF def_row.track_restricted AND NOT is_staff_caller THEN
      IF track IS NULL THEN
        RAISE EXCEPTION 'Choose your booking days first (Sat/Mon/Wed or Sun/Tue/Thu)';
      END IF;

      class_dow := EXTRACT(DOW FROM (class_row.starts_at AT TIME ZONE 'Asia/Amman'))::int;
      allowed_dows := CASE track
        WHEN 'sat_mon_wed' THEN ARRAY[6,1,3]
        WHEN 'sun_tue_thu' THEN ARRAY[0,2,4]
        ELSE ARRAY[]::int[]
      END;
      IF NOT (class_dow = ANY(allowed_dows)) THEN
        RAISE EXCEPTION 'This class isn''t on your booking days';
      END IF;

      IF sub_start IS NULL THEN
        window_start := now() - interval '30 days';
      ELSE
        window_start := sub_start + (floor(EXTRACT(EPOCH FROM (now() - sub_start)) / (30 * 86400))::int) * interval '30 days';
      END IF;

      SELECT count(*) INTO cap_count
        FROM public.bookings b
        JOIN public.classes c ON c.id = b.class_id
        JOIN public.class_type_defs d2 ON d2.key = c.type
        WHERE b.member_id = NEW.member_id
          AND (b.child_id IS NOT DISTINCT FROM NEW.child_id)
          AND b.status <> 'cancelled'
          AND d2.credit_source = 'group'
          AND d2.track_restricted = true
          AND c.starts_at >= window_start
          AND c.starts_at < window_start + interval '30 days'
          AND b.id <> COALESCE(NEW.id, gen_random_uuid());
      IF cap_count >= 12 THEN
        RAISE EXCEPTION 'You''ve reached the 12-class monthly cap';
      END IF;
    END IF;

  ELSIF def_row.credit_source = 'pt' THEN
    IF NEW.child_id IS NOT NULL THEN
      SELECT COALESCE(pt_sessions_remaining, 0) INTO remaining
        FROM public.children WHERE id = NEW.child_id FOR UPDATE;
      IF COALESCE(remaining, 0) <= 0 THEN
        RAISE EXCEPTION 'No PT sessions remaining for this child — visit the gym to add more';
      END IF;
      INSERT INTO public.transactions (member_id, child_id, classes, type, source, description, service)
      VALUES (NEW.member_id, NEW.child_id, 1, 'debit', 'booking', desc_text, 'pt');
    ELSE
      SELECT COALESCE(pt_sessions_remaining, 0) INTO remaining
        FROM public.profiles WHERE id = NEW.member_id FOR UPDATE;
      IF COALESCE(remaining, 0) <= 0 THEN
        RAISE EXCEPTION 'No PT sessions remaining — visit the gym to add more';
      END IF;
      INSERT INTO public.transactions (member_id, child_id, classes, type, source, description, service)
      VALUES (NEW.member_id, NULL, 1, 'debit', 'booking', desc_text, 'pt');
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 5. Drop the now-unused enum type
DROP TYPE IF EXISTS public.class_type;
