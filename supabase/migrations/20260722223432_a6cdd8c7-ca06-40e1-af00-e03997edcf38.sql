
-- 1. Add columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS group_track text
    CHECK (group_track IN ('sat_mon_wed','sun_tue_thu')),
  ADD COLUMN IF NOT EXISTS group_subscription_started_at timestamptz;

ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS group_track text
    CHECK (group_track IN ('sat_mon_wed','sun_tue_thu')),
  ADD COLUMN IF NOT EXISTS group_subscription_started_at timestamptz;

-- Backfill start dates for existing active subscriptions (approximate)
UPDATE public.profiles
  SET group_subscription_started_at = COALESCE(group_subscription_started_at, now())
  WHERE group_subscription_until IS NOT NULL AND group_subscription_until > now();
UPDATE public.children
  SET group_subscription_started_at = COALESCE(group_subscription_started_at, now())
  WHERE group_subscription_until IS NOT NULL AND group_subscription_until > now();

-- 2. Update sync_classes_remaining: manage started_at + clear track/start on lapse
CREATE OR REPLACE FUNCTION public.sync_classes_remaining()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  delta integer;
  current_balance integer;
  new_balance integer;
  current_expiry timestamptz;
  new_expiry timestamptz;
  day_delta integer;
  current_start timestamptz;
  new_start timestamptz;
BEGIN
  IF NEW.service = 'pt' THEN
    delta := CASE WHEN NEW.type = 'credit' THEN NEW.classes ELSE -NEW.classes END;

    IF NEW.child_id IS NOT NULL THEN
      SELECT COALESCE(pt_sessions_remaining, 0) INTO current_balance
        FROM public.children WHERE id = NEW.child_id FOR UPDATE;
      new_balance := COALESCE(current_balance, 0) + delta;
      IF new_balance < 0 THEN
        RAISE EXCEPTION 'This would take the balance below zero — they currently have % PT sessions remaining', COALESCE(current_balance, 0);
      END IF;
      UPDATE public.children SET pt_sessions_remaining = new_balance WHERE id = NEW.child_id;
    ELSE
      SELECT COALESCE(pt_sessions_remaining, 0) INTO current_balance
        FROM public.profiles WHERE id = NEW.member_id FOR UPDATE;
      new_balance := COALESCE(current_balance, 0) + delta;
      IF new_balance < 0 THEN
        RAISE EXCEPTION 'This would take the balance below zero — they currently have % PT sessions remaining', COALESCE(current_balance, 0);
      END IF;
      UPDATE public.profiles SET pt_sessions_remaining = new_balance WHERE id = NEW.member_id;
    END IF;

  ELSIF NEW.service = 'group' THEN
    day_delta := COALESCE(NEW.days, 0);

    IF NEW.child_id IS NOT NULL THEN
      SELECT group_subscription_until, group_subscription_started_at INTO current_expiry, current_start
        FROM public.children WHERE id = NEW.child_id FOR UPDATE;
    ELSE
      SELECT group_subscription_until, group_subscription_started_at INTO current_expiry, current_start
        FROM public.profiles WHERE id = NEW.member_id FOR UPDATE;
    END IF;

    IF NEW.type = 'credit' THEN
      new_expiry := GREATEST(COALESCE(current_expiry, now()), now()) + (day_delta || ' days')::interval;
      -- If no active cycle, this is a fresh subscription: reset start date
      IF current_expiry IS NULL OR current_expiry <= now() THEN
        new_start := now();
      ELSE
        new_start := current_start;
      END IF;
    ELSE
      new_expiry := COALESCE(current_expiry, now()) - (day_delta || ' days')::interval;
      new_start := current_start;
    END IF;

    IF NEW.child_id IS NOT NULL THEN
      UPDATE public.children
        SET group_subscription_until = new_expiry,
            group_subscription_started_at = CASE
              WHEN new_expiry IS NULL OR new_expiry <= now() THEN NULL
              ELSE new_start
            END,
            group_track = CASE
              WHEN new_expiry IS NULL OR new_expiry <= now() THEN NULL
              ELSE group_track
            END
        WHERE id = NEW.child_id;
    ELSE
      UPDATE public.profiles
        SET group_subscription_until = new_expiry,
            group_subscription_started_at = CASE
              WHEN new_expiry IS NULL OR new_expiry <= now() THEN NULL
              ELSE new_start
            END,
            group_track = CASE
              WHEN new_expiry IS NULL OR new_expiry <= now() THEN NULL
              ELSE group_track
            END,
            membership_pause_days_used = CASE WHEN NEW.type = 'credit' THEN 0 ELSE membership_pause_days_used END,
            membership_paused_at = CASE WHEN NEW.type = 'credit' THEN NULL ELSE membership_paused_at END
        WHERE id = NEW.member_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Update consume_class_credit with track + cap enforcement (non-staff only)
CREATE OR REPLACE FUNCTION public.consume_class_credit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  class_row RECORD;
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
BEGIN
  IF NEW.status <> 'upcoming' THEN RETURN NEW; END IF;

  SELECT title, starts_at, type INTO class_row
    FROM public.classes WHERE id = NEW.class_id;

  desc_text := 'Class booked: ' || COALESCE(class_row.title, 'class')
               || ' on ' || to_char(COALESCE(class_row.starts_at, now()), 'Mon DD, HH24:MI');

  is_staff_caller := COALESCE(public.has_role(auth.uid(), 'staff'), false);

  IF class_row.type::text IN ('mixed', 'women_only', 'yoga', 'gymnastics', 'kids') THEN
    -- Membership active check
    IF class_row.type::text = 'kids' THEN
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

    -- Track + cap apply to mixed / women_only / kids only, and only for non-staff bookings
    IF class_row.type::text IN ('mixed','women_only','kids') AND NOT is_staff_caller THEN
      IF track IS NULL THEN
        RAISE EXCEPTION 'Choose your booking days first (Sat/Mon/Wed or Sun/Tue/Thu)';
      END IF;

      -- Amman weekday (Sun=0..Sat=6)
      class_dow := EXTRACT(DOW FROM (class_row.starts_at AT TIME ZONE 'Asia/Amman'))::int;
      allowed_dows := CASE track
        WHEN 'sat_mon_wed' THEN ARRAY[6,1,3]
        WHEN 'sun_tue_thu' THEN ARRAY[0,2,4]
        ELSE ARRAY[]::int[]
      END;
      IF NOT (class_dow = ANY(allowed_dows)) THEN
        RAISE EXCEPTION 'This class isn''t on your booking days';
      END IF;

      -- Rolling 30-day window from subscription start
      IF sub_start IS NULL THEN
        window_start := now() - interval '30 days';
      ELSE
        window_start := sub_start + (floor(EXTRACT(EPOCH FROM (now() - sub_start)) / (30 * 86400))::int) * interval '30 days';
      END IF;

      SELECT count(*) INTO cap_count
        FROM public.bookings b
        JOIN public.classes c ON c.id = b.class_id
        WHERE b.member_id = NEW.member_id
          AND (b.child_id IS NOT DISTINCT FROM NEW.child_id)
          AND b.status <> 'cancelled'
          AND c.type::text IN ('mixed','women_only','kids')
          AND c.starts_at >= window_start
          AND c.starts_at < window_start + interval '30 days'
          AND b.id <> COALESCE(NEW.id, gen_random_uuid());
      IF cap_count >= 12 THEN
        RAISE EXCEPTION 'You''ve reached the 12-class monthly cap';
      END IF;
    END IF;

  ELSIF class_row.type::text = 'pt' THEN
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

-- 4. set_group_track RPC
CREATE OR REPLACE FUNCTION public.set_group_track(target_user uuid, target_child uuid, track text)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  is_staff boolean;
  current_track text;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF track NOT IN ('sat_mon_wed','sun_tue_thu') THEN
    RAISE EXCEPTION 'Invalid track';
  END IF;
  is_staff := public.has_role(caller, 'staff');

  IF target_child IS NOT NULL THEN
    -- Child: only the parent or staff can set it
    IF NOT is_staff AND NOT EXISTS (
      SELECT 1 FROM public.children WHERE id = target_child AND parent_id = caller
    ) THEN
      RAISE EXCEPTION 'Not authorised';
    END IF;
    SELECT group_track INTO current_track FROM public.children WHERE id = target_child FOR UPDATE;
    IF current_track IS NOT NULL AND NOT is_staff THEN
      RAISE EXCEPTION 'Booking days already set for this cycle';
    END IF;
    UPDATE public.children SET group_track = track WHERE id = target_child;
  ELSE
    IF caller <> target_user AND NOT is_staff THEN
      RAISE EXCEPTION 'Not authorised';
    END IF;
    SELECT group_track INTO current_track FROM public.profiles WHERE id = target_user FOR UPDATE;
    IF current_track IS NOT NULL AND NOT is_staff THEN
      RAISE EXCEPTION 'Booking days already set for this cycle';
    END IF;
    UPDATE public.profiles SET group_track = track WHERE id = target_user;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_group_track(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_group_track(uuid, uuid, text) TO authenticated;

-- 5. Extend RLS: lock group_track & group_subscription_started_at on self-update
DROP POLICY IF EXISTS "own profile update" ON public.profiles;
CREATE POLICY "own profile update" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
    AND membership_status = (SELECT p.membership_status FROM profiles p WHERE p.id = auth.uid())
    AND pt_sessions_remaining = (SELECT p.pt_sessions_remaining FROM profiles p WHERE p.id = auth.uid())
    AND NOT (group_subscription_until IS DISTINCT FROM (SELECT p.group_subscription_until FROM profiles p WHERE p.id = auth.uid()))
    AND NOT (group_subscription_started_at IS DISTINCT FROM (SELECT p.group_subscription_started_at FROM profiles p WHERE p.id = auth.uid()))
    AND NOT (group_track IS DISTINCT FROM (SELECT p.group_track FROM profiles p WHERE p.id = auth.uid()))
    AND streak = (SELECT p.streak FROM profiles p WHERE p.id = auth.uid())
    AND classes_attended = (SELECT p.classes_attended FROM profiles p WHERE p.id = auth.uid())
    AND NOT (referral_code IS DISTINCT FROM (SELECT p.referral_code FROM profiles p WHERE p.id = auth.uid()))
  );

DROP POLICY IF EXISTS "Parents update own children" ON public.children;
CREATE POLICY "Parents update own children" ON public.children
  FOR UPDATE
  USING (parent_id = auth.uid())
  WITH CHECK (
    parent_id = auth.uid()
    AND NOT (group_subscription_until IS DISTINCT FROM (SELECT c.group_subscription_until FROM children c WHERE c.id = children.id))
    AND NOT (group_subscription_started_at IS DISTINCT FROM (SELECT c.group_subscription_started_at FROM children c WHERE c.id = children.id))
    AND NOT (group_track IS DISTINCT FROM (SELECT c.group_track FROM children c WHERE c.id = children.id))
    AND streak = (SELECT c.streak FROM children c WHERE c.id = children.id)
    AND classes_attended = (SELECT c.classes_attended FROM children c WHERE c.id = children.id)
    AND pt_sessions_remaining = (SELECT c.pt_sessions_remaining FROM children c WHERE c.id = children.id)
  );
