-- ===== gyms policies =====
CREATE POLICY "gyms readable" ON public.gyms FOR SELECT USING (true);
CREATE POLICY "gyms staff update" ON public.gyms FOR UPDATE TO authenticated
  USING (public.is_platform_admin() OR (public.has_role(auth.uid(), 'staff') AND id = public.current_gym_id()))
  WITH CHECK (public.is_platform_admin() OR (public.has_role(auth.uid(), 'staff') AND id = public.current_gym_id()));

-- ===== profiles =====
DROP POLICY IF EXISTS "own profile read" ON public.profiles;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR (public.has_role(auth.uid(), 'staff') AND public.same_gym(gym_id)));

DROP POLICY IF EXISTS "own profile insert" ON public.profiles;
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Staff can update member profiles" ON public.profiles;
CREATE POLICY "Staff can update member profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'staff') AND public.same_gym(gym_id))
  WITH CHECK (public.has_role(auth.uid(), 'staff') AND public.same_gym(gym_id));

DROP POLICY IF EXISTS "own profile update" ON public.profiles;
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND gym_id = (SELECT p.gym_id FROM public.profiles p WHERE p.id = auth.uid())
    AND is_platform_admin = (SELECT p.is_platform_admin FROM public.profiles p WHERE p.id = auth.uid())
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND membership_status = (SELECT p.membership_status FROM public.profiles p WHERE p.id = auth.uid())
    AND pt_sessions_remaining = (SELECT p.pt_sessions_remaining FROM public.profiles p WHERE p.id = auth.uid())
    AND NOT (group_subscription_until IS DISTINCT FROM (SELECT p.group_subscription_until FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (group_subscription_started_at IS DISTINCT FROM (SELECT p.group_subscription_started_at FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (group_track IS DISTINCT FROM (SELECT p.group_track FROM public.profiles p WHERE p.id = auth.uid()))
    AND streak = (SELECT p.streak FROM public.profiles p WHERE p.id = auth.uid())
    AND classes_attended = (SELECT p.classes_attended FROM public.profiles p WHERE p.id = auth.uid())
    AND NOT (referral_code IS DISTINCT FROM (SELECT p.referral_code FROM public.profiles p WHERE p.id = auth.uid()))
    AND NOT (member_code IS DISTINCT FROM (SELECT p.member_code FROM public.profiles p WHERE p.id = auth.uid()))
  );

-- ===== children =====
DROP POLICY IF EXISTS "Parents read own children" ON public.children;
CREATE POLICY "Parents read own children" ON public.children FOR SELECT
  USING (parent_id = auth.uid() OR (public.has_role(auth.uid(), 'staff') AND public.same_gym(gym_id)));
DROP POLICY IF EXISTS "Staff can view all children" ON public.children;

DROP POLICY IF EXISTS "Parents delete own children" ON public.children;
CREATE POLICY "Parents delete own children" ON public.children FOR DELETE
  USING (parent_id = auth.uid() AND public.same_gym(gym_id));

DROP POLICY IF EXISTS "Parents insert own children" ON public.children;
CREATE POLICY "Parents insert own children" ON public.children FOR INSERT
  WITH CHECK (
    parent_id = auth.uid()
    AND gym_id = public.current_gym_id()
    AND group_subscription_until IS NULL
    AND streak = 0 AND classes_attended = 0 AND pt_sessions_remaining = 0
  );

DROP POLICY IF EXISTS "Parents update own children" ON public.children;
CREATE POLICY "Parents update own children" ON public.children FOR UPDATE
  USING (parent_id = auth.uid() AND public.same_gym(gym_id))
  WITH CHECK (
    parent_id = auth.uid()
    AND gym_id = (SELECT c.gym_id FROM public.children c WHERE c.id = children.id)
    AND NOT (group_subscription_until IS DISTINCT FROM (SELECT c.group_subscription_until FROM public.children c WHERE c.id = children.id))
    AND NOT (group_subscription_started_at IS DISTINCT FROM (SELECT c.group_subscription_started_at FROM public.children c WHERE c.id = children.id))
    AND NOT (group_track IS DISTINCT FROM (SELECT c.group_track FROM public.children c WHERE c.id = children.id))
    AND streak = (SELECT c.streak FROM public.children c WHERE c.id = children.id)
    AND classes_attended = (SELECT c.classes_attended FROM public.children c WHERE c.id = children.id)
    AND pt_sessions_remaining = (SELECT c.pt_sessions_remaining FROM public.children c WHERE c.id = children.id)
  );

-- ===== classes =====
DROP POLICY IF EXISTS "classes read all" ON public.classes;
CREATE POLICY "classes read all" ON public.classes FOR SELECT TO authenticated USING (public.same_gym(gym_id));
DROP POLICY IF EXISTS "classes staff insert" ON public.classes;
CREATE POLICY "classes staff insert" ON public.classes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'staff') AND public.same_gym(gym_id));
DROP POLICY IF EXISTS "classes staff update" ON public.classes;
CREATE POLICY "classes staff update" ON public.classes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'staff') AND public.same_gym(gym_id))
  WITH CHECK (public.has_role(auth.uid(), 'staff') AND public.same_gym(gym_id));
DROP POLICY IF EXISTS "classes staff delete" ON public.classes;
CREATE POLICY "classes staff delete" ON public.classes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'staff') AND public.same_gym(gym_id));

-- ===== class_type_defs =====
DROP POLICY IF EXISTS "Anyone signed in can view class types" ON public.class_type_defs;
CREATE POLICY "Anyone signed in can view class types" ON public.class_type_defs FOR SELECT TO authenticated
  USING (public.same_gym(gym_id));
DROP POLICY IF EXISTS "Staff can insert class types" ON public.class_type_defs;
CREATE POLICY "Staff can insert class types" ON public.class_type_defs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'staff') AND public.same_gym(gym_id));
DROP POLICY IF EXISTS "Staff can update class types" ON public.class_type_defs;
CREATE POLICY "Staff can update class types" ON public.class_type_defs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'staff') AND public.same_gym(gym_id))
  WITH CHECK (public.has_role(auth.uid(), 'staff') AND public.same_gym(gym_id));
DROP POLICY IF EXISTS "Staff can delete non-builtin class types" ON public.class_type_defs;
CREATE POLICY "Staff can delete non-builtin class types" ON public.class_type_defs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'staff') AND public.same_gym(gym_id) AND is_builtin = false);

-- ===== bookings =====
DROP POLICY IF EXISTS "own bookings read" ON public.bookings;
CREATE POLICY "own bookings read" ON public.bookings FOR SELECT TO authenticated
  USING (public.same_gym(gym_id) AND (member_id = auth.uid() OR public.has_role(auth.uid(), 'staff')));
DROP POLICY IF EXISTS "own bookings insert" ON public.bookings;
CREATE POLICY "own bookings insert" ON public.bookings FOR INSERT
  WITH CHECK (public.same_gym(gym_id) AND (member_id = auth.uid() OR public.has_role(auth.uid(), 'staff')));
DROP POLICY IF EXISTS "own bookings update" ON public.bookings;
CREATE POLICY "own bookings update" ON public.bookings FOR UPDATE TO authenticated
  USING (public.same_gym(gym_id) AND (member_id = auth.uid() OR public.has_role(auth.uid(), 'staff')))
  WITH CHECK (public.same_gym(gym_id) AND (member_id = auth.uid() OR public.has_role(auth.uid(), 'staff')));
DROP POLICY IF EXISTS "own bookings delete" ON public.bookings;
CREATE POLICY "own bookings delete" ON public.bookings FOR DELETE TO authenticated
  USING (public.same_gym(gym_id) AND (member_id = auth.uid() OR public.has_role(auth.uid(), 'staff')));

-- ===== coaches =====
DROP POLICY IF EXISTS "coaches read all" ON public.coaches;
CREATE POLICY "coaches read all" ON public.coaches FOR SELECT TO authenticated USING (public.same_gym(gym_id));
DROP POLICY IF EXISTS "coaches staff write" ON public.coaches;
CREATE POLICY "coaches staff write" ON public.coaches FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'staff') AND public.same_gym(gym_id));
DROP POLICY IF EXISTS "coaches staff update" ON public.coaches;
CREATE POLICY "coaches staff update" ON public.coaches FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'staff') AND public.same_gym(gym_id))
  WITH CHECK (public.has_role(auth.uid(), 'staff') AND public.same_gym(gym_id));
DROP POLICY IF EXISTS "coaches staff delete" ON public.coaches;
CREATE POLICY "coaches staff delete" ON public.coaches FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'staff') AND public.same_gym(gym_id));

-- ===== announcements =====
DROP POLICY IF EXISTS "announcements read all" ON public.announcements;
CREATE POLICY "announcements read all" ON public.announcements FOR SELECT TO authenticated USING (public.same_gym(gym_id));
DROP POLICY IF EXISTS "announcements staff insert" ON public.announcements;
CREATE POLICY "announcements staff insert" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'staff') AND public.same_gym(gym_id));
DROP POLICY IF EXISTS "announcements staff update" ON public.announcements;
CREATE POLICY "announcements staff update" ON public.announcements FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'staff') AND public.same_gym(gym_id))
  WITH CHECK (public.has_role(auth.uid(), 'staff') AND public.same_gym(gym_id));
DROP POLICY IF EXISTS "announcements staff delete" ON public.announcements;
CREATE POLICY "announcements staff delete" ON public.announcements FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'staff') AND public.same_gym(gym_id));

-- ===== transactions =====
DROP POLICY IF EXISTS "own txns read" ON public.transactions;
CREATE POLICY "own txns read" ON public.transactions FOR SELECT TO authenticated
  USING (public.same_gym(gym_id) AND (member_id = auth.uid() OR public.has_role(auth.uid(), 'staff')));
DROP POLICY IF EXISTS "staff can insert txns" ON public.transactions;
CREATE POLICY "staff can insert txns" ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'staff') AND public.same_gym(gym_id));

-- ===== trigger updates: gym-aware class type lookups + gym stamping =====
CREATE OR REPLACE FUNCTION public.enforce_kids_class_child()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE is_kids boolean;
BEGIN
  SELECT d.kids_only INTO is_kids
    FROM public.classes c
    JOIN public.class_type_defs d ON d.key = c.type AND d.gym_id = c.gym_id
    WHERE c.id = NEW.class_id;
  IF is_kids AND NEW.child_id IS NULL THEN
    RAISE EXCEPTION 'Kids classes can only be booked for a child.';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refund_class_credit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  class_row RECORD;
  desc_text text;
BEGIN
  IF OLD.status = 'upcoming' AND NEW.status = 'cancelled' THEN
    SELECT c.title, c.starts_at, c.type, c.gym_id, d.credit_source
      INTO class_row
      FROM public.classes c
      JOIN public.class_type_defs d ON d.key = c.type AND d.gym_id = c.gym_id
      WHERE c.id = NEW.class_id;
    IF class_row.credit_source = 'pt' THEN
      desc_text := 'Booking cancelled: ' || COALESCE(class_row.title, 'class')
                   || ' on ' || to_char(COALESCE(class_row.starts_at, now()), 'Mon DD, HH24:MI');
      INSERT INTO public.transactions (member_id, child_id, classes, type, source, description, service, gym_id)
      VALUES (NEW.member_id, NEW.child_id, 1, 'credit', 'booking', desc_text, 'pt', COALESCE(class_row.gym_id, NEW.gym_id));
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.grant_referral_reward()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  ref_id uuid;
  ref_gym uuid;
  already_granted boolean;
BEGIN
  SELECT referred_by, referral_reward_granted
    INTO ref_id, already_granted
    FROM public.profiles WHERE id = NEW.member_id;

  IF ref_id IS NOT NULL AND already_granted = false THEN
    SELECT gym_id INTO ref_gym FROM public.profiles WHERE id = ref_id;
    UPDATE public.profiles SET referral_reward_granted = true WHERE id = NEW.member_id;
    INSERT INTO public.transactions (member_id, classes, type, source, description, gym_id)
    VALUES (ref_id, 1, 'credit', 'referral', 'Referral reward — a friend you invited booked their first class', ref_gym);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_class_credit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
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

  SELECT title, starts_at, type, gym_id INTO class_row
    FROM public.classes WHERE id = NEW.class_id;

  SELECT * INTO def_row FROM public.class_type_defs
    WHERE key = class_row.type AND gym_id = class_row.gym_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown class type: %', class_row.type;
  END IF;

  desc_text := 'Class booked: ' || COALESCE(class_row.title, 'class')
               || ' on ' || to_char(COALESCE(class_row.starts_at, now()), 'Mon DD, HH24:MI');

  is_staff_caller := COALESCE(public.has_role(auth.uid(), 'staff'), false);

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
        JOIN public.class_type_defs d2 ON d2.key = c.type AND d2.gym_id = c.gym_id
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
      INSERT INTO public.transactions (member_id, child_id, classes, type, source, description, service, gym_id)
      VALUES (NEW.member_id, NEW.child_id, 1, 'debit', 'booking', desc_text, 'pt', COALESCE(class_row.gym_id, NEW.gym_id));
    ELSE
      SELECT COALESCE(pt_sessions_remaining, 0) INTO remaining
        FROM public.profiles WHERE id = NEW.member_id FOR UPDATE;
      IF COALESCE(remaining, 0) <= 0 THEN
        RAISE EXCEPTION 'No PT sessions remaining — visit the gym to add more';
      END IF;
      INSERT INTO public.transactions (member_id, child_id, classes, type, source, description, service, gym_id)
      VALUES (NEW.member_id, NULL, 1, 'debit', 'booking', desc_text, 'pt', COALESCE(class_row.gym_id, NEW.gym_id));
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ===== signup: assign gym from metadata slug =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  ref_code text := NEW.raw_user_meta_data->>'referral_code';
  gym_slug text := NEW.raw_user_meta_data->>'gym_slug';
  target_gym uuid;
  ref_id uuid;
BEGIN
  IF gym_slug IS NOT NULL AND length(gym_slug) > 0 THEN
    SELECT id INTO target_gym FROM public.gyms WHERE slug = gym_slug AND status <> 'suspended';
  END IF;
  IF target_gym IS NULL THEN
    SELECT id INTO target_gym FROM public.gyms ORDER BY created_at LIMIT 1;
  END IF;

  IF ref_code IS NOT NULL AND length(ref_code) > 0 THEN
    SELECT id INTO ref_id FROM public.profiles
      WHERE referral_code = ref_code AND gym_id = target_gym LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, name, phone, referred_by, gender, gym_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    ref_id,
    NULLIF(NEW.raw_user_meta_data->>'gender', ''),
    target_gym
  );
  RETURN NEW;
END;
$function$;

-- referral stats scoped to the caller's gym implicitly (member ids are gym-bound)
CREATE OR REPLACE FUNCTION public.set_group_track(target_user uuid, target_child uuid, track text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  caller uuid := auth.uid();
  is_staff boolean;
  current_track text;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF track NOT IN ('sat_mon_wed','sun_tue_thu') THEN RAISE EXCEPTION 'Invalid track'; END IF;
  is_staff := public.has_role(caller, 'staff');

  IF target_child IS NOT NULL THEN
    IF NOT is_staff AND NOT EXISTS (
      SELECT 1 FROM public.children WHERE id = target_child AND parent_id = caller
    ) THEN
      RAISE EXCEPTION 'Not authorised';
    END IF;
    IF is_staff AND NOT EXISTS (
      SELECT 1 FROM public.children WHERE id = target_child AND public.same_gym(gym_id)
    ) THEN
      RAISE EXCEPTION 'Not authorised';
    END IF;
    SELECT group_track INTO current_track FROM public.children WHERE id = target_child FOR UPDATE;
    IF current_track IS NOT NULL AND NOT is_staff THEN
      RAISE EXCEPTION 'Booking days already set for this cycle';
    END IF;
    UPDATE public.children SET group_track = track WHERE id = target_child;
  ELSE
    IF caller <> target_user AND NOT is_staff THEN RAISE EXCEPTION 'Not authorised'; END IF;
    IF caller <> target_user AND NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = target_user AND public.same_gym(gym_id)
    ) THEN
      RAISE EXCEPTION 'Not authorised';
    END IF;
    SELECT group_track INTO current_track FROM public.profiles WHERE id = target_user FOR UPDATE;
    IF current_track IS NOT NULL AND NOT is_staff THEN
      RAISE EXCEPTION 'Booking days already set for this cycle';
    END IF;
    UPDATE public.profiles SET group_track = track WHERE id = target_user;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.pause_membership(target_user uuid)
RETURNS profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  caller uuid := auth.uid();
  is_staff boolean;
  row_out public.profiles;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT public.has_role(caller, 'staff') INTO is_staff;
  IF caller <> target_user AND NOT is_staff THEN RAISE EXCEPTION 'Not authorised'; END IF;

  SELECT * INTO row_out FROM public.profiles WHERE id = target_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF NOT public.same_gym(row_out.gym_id) THEN RAISE EXCEPTION 'Not authorised'; END IF;

  IF row_out.membership_paused_at IS NOT NULL THEN RAISE EXCEPTION 'Membership is already paused'; END IF;
  IF row_out.group_subscription_until IS NULL OR row_out.group_subscription_until <= now() THEN
    RAISE EXCEPTION 'No active group membership to pause';
  END IF;
  IF COALESCE(row_out.membership_pause_days_used, 0) >= 45 THEN
    RAISE EXCEPTION 'Pause limit of 45 days already used for this membership cycle';
  END IF;

  UPDATE public.profiles SET membership_paused_at = now() WHERE id = target_user RETURNING * INTO row_out;
  RETURN row_out;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resume_membership(target_user uuid)
RETURNS profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  caller uuid := auth.uid();
  is_staff boolean;
  row_out public.profiles;
  elapsed_days integer;
  allowed_days integer;
  add_days integer;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT public.has_role(caller, 'staff') INTO is_staff;
  IF caller <> target_user AND NOT is_staff THEN RAISE EXCEPTION 'Not authorised'; END IF;

  SELECT * INTO row_out FROM public.profiles WHERE id = target_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF NOT public.same_gym(row_out.gym_id) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF row_out.membership_paused_at IS NULL THEN RAISE EXCEPTION 'Membership is not paused'; END IF;

  elapsed_days := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (now() - row_out.membership_paused_at)) / 86400.0)::int);
  allowed_days := GREATEST(0, 45 - COALESCE(row_out.membership_pause_days_used, 0));
  add_days := LEAST(elapsed_days, allowed_days);

  UPDATE public.profiles
    SET membership_paused_at = NULL,
        membership_pause_days_used = COALESCE(membership_pause_days_used, 0) + add_days,
        group_subscription_until = COALESCE(group_subscription_until, now()) + (add_days || ' days')::interval
    WHERE id = target_user
    RETURNING * INTO row_out;
  RETURN row_out;
END;
$function$;
