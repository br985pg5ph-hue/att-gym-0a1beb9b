-- ============ 1. gym_members ============
CREATE TABLE public.gym_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'member',
  member_code text NOT NULL DEFAULT '',
  membership_status text NOT NULL DEFAULT 'inactive',
  streak integer NOT NULL DEFAULT 0,
  classes_attended integer NOT NULL DEFAULT 0,
  pt_sessions_remaining integer NOT NULL DEFAULT 0,
  group_subscription_until timestamptz,
  group_subscription_started_at timestamptz,
  group_track text,
  membership_paused_at timestamptz,
  membership_pause_days_used integer NOT NULL DEFAULT 0,
  referral_code text NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 8)),
  referred_by uuid,
  referral_reward_granted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, gym_id)
);
CREATE INDEX gym_members_gym_idx ON public.gym_members(gym_id);
CREATE INDEX gym_members_user_idx ON public.gym_members(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gym_members TO authenticated;
GRANT ALL ON public.gym_members TO service_role;
ALTER TABLE public.gym_members ENABLE ROW LEVEL SECURITY;

-- ============ 2. gym_join_settings ============
CREATE TABLE public.gym_join_settings (
  gym_id uuid PRIMARY KEY REFERENCES public.gyms(id) ON DELETE CASCADE,
  join_code text NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 6)),
  require_code boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.gym_join_settings TO authenticated;
GRANT ALL ON public.gym_join_settings TO service_role;
ALTER TABLE public.gym_join_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.gym_join_settings (gym_id) SELECT id FROM public.gyms;

ALTER TABLE public.gyms ADD COLUMN IF NOT EXISTS listed boolean NOT NULL DEFAULT true;
ALTER TABLE public.gyms ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT '';
UPDATE public.gyms SET listed = false WHERE slug = 'preview';

-- ============ 3. profiles: identity only ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_gym_id uuid REFERENCES public.gyms(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false;

-- carry existing rows into memberships before dropping the columns
INSERT INTO public.gym_members (user_id, gym_id, role, member_code, membership_status, streak, classes_attended,
  pt_sessions_remaining, group_subscription_until, group_subscription_started_at, group_track,
  membership_paused_at, membership_pause_days_used, referral_code, referred_by, referral_reward_granted)
SELECT p.id, p.gym_id, p.role, p.member_code, p.membership_status, p.streak, p.classes_attended,
  p.pt_sessions_remaining, p.group_subscription_until, p.group_subscription_started_at, p.group_track,
  p.membership_paused_at, p.membership_pause_days_used, p.referral_code, p.referred_by, p.referral_reward_granted
FROM public.profiles p
ON CONFLICT (user_id, gym_id) DO NOTHING;

UPDATE public.profiles SET active_gym_id = gym_id;
UPDATE public.profiles SET is_platform_admin = true WHERE role = 'owner';

-- drop dependent policies before dropping columns
DROP POLICY IF EXISTS "own profile read" ON public.profiles;
DROP POLICY IF EXISTS "own profile update" ON public.profiles;
DROP POLICY IF EXISTS "own profile insert" ON public.profiles;
DROP POLICY IF EXISTS "Staff can update member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Gym staff can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Gym staff can update their logos" ON storage.objects;
DROP POLICY IF EXISTS "Gym staff can delete their logos" ON storage.objects;

DO $do$
DECLARE t record;
BEGIN
  FOR t IN SELECT tgname FROM pg_trigger
           WHERE tgrelid = 'public.profiles'::regclass AND NOT tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER %I ON public.profiles', t.tgname);
  END LOOP;
END $do$;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS gym_id,
  DROP COLUMN IF EXISTS role,
  DROP COLUMN IF EXISTS membership_status,
  DROP COLUMN IF EXISTS member_code,
  DROP COLUMN IF EXISTS streak,
  DROP COLUMN IF EXISTS classes_attended,
  DROP COLUMN IF EXISTS pt_sessions_remaining,
  DROP COLUMN IF EXISTS group_subscription_until,
  DROP COLUMN IF EXISTS group_subscription_started_at,
  DROP COLUMN IF EXISTS group_track,
  DROP COLUMN IF EXISTS membership_paused_at,
  DROP COLUMN IF EXISTS membership_pause_days_used,
  DROP COLUMN IF EXISTS referral_code,
  DROP COLUMN IF EXISTS referred_by,
  DROP COLUMN IF EXISTS referral_reward_granted;

-- ============ 4. core helper functions ============
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_platform_admin FROM public.profiles WHERE id = auth.uid()), false)
$$;

CREATE OR REPLACE FUNCTION public.current_gym_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT active_gym_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_member_of(_gym_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.gym_members m WHERE m.user_id = auth.uid() AND m.gym_id = _gym_id)
$$;

CREATE OR REPLACE FUNCTION public.same_gym(_gym_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_platform_admin() OR public.is_member_of(_gym_id)
$$;

CREATE OR REPLACE FUNCTION public.has_role_at(_user_id uuid, _gym_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_platform_admin FROM public.profiles WHERE id = _user_id), false)
    OR EXISTS (
      SELECT 1 FROM public.gym_members m
      WHERE m.user_id = _user_id AND m.gym_id = _gym_id
        AND (
          m.role = _role
          OR (_role = 'staff' AND m.role IN ('admin','owner'))
          OR (_role = 'admin' AND m.role = 'owner')
        )
    )
$$;

-- keeps every existing policy working: role is evaluated at the caller's active gym
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role_at(_user_id, public.current_gym_id(), _role)
$$;

CREATE OR REPLACE FUNCTION public.shares_gym_with(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_platform_admin() OR EXISTS (
    SELECT 1 FROM public.gym_members m
    WHERE m.user_id = _user_id
      AND m.gym_id = public.current_gym_id()
      AND public.has_role_at(auth.uid(), m.gym_id, 'staff')
  )
$$;

-- ============ 5. policies ============
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.shares_gym_with(id));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_platform_admin = (SELECT p.is_platform_admin FROM public.profiles p WHERE p.id = auth.uid())
    AND (active_gym_id IS NULL OR public.is_member_of(active_gym_id))
  );
CREATE POLICY "staff read shared profiles update" ON public.profiles FOR UPDATE TO authenticated
  USING (public.shares_gym_with(id))
  WITH CHECK (public.shares_gym_with(id) AND is_platform_admin = false);

CREATE POLICY "memberships read" ON public.gym_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role_at(auth.uid(), gym_id, 'staff'));
CREATE POLICY "memberships staff write" ON public.gym_members FOR UPDATE TO authenticated
  USING (public.has_role_at(auth.uid(), gym_id, 'staff'))
  WITH CHECK (public.has_role_at(auth.uid(), gym_id, 'staff'));
CREATE POLICY "memberships leave" ON public.gym_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role_at(auth.uid(), gym_id, 'admin'));
CREATE POLICY "memberships staff insert" ON public.gym_members FOR INSERT TO authenticated
  WITH CHECK (public.has_role_at(auth.uid(), gym_id, 'admin'));

CREATE POLICY "join settings admin read" ON public.gym_join_settings FOR SELECT TO authenticated
  USING (public.has_role_at(auth.uid(), gym_id, 'admin'));
CREATE POLICY "join settings admin update" ON public.gym_join_settings FOR UPDATE TO authenticated
  USING (public.has_role_at(auth.uid(), gym_id, 'admin'))
  WITH CHECK (public.has_role_at(auth.uid(), gym_id, 'admin'));

-- ============ 6. membership triggers ============
CREATE OR REPLACE FUNCTION public.assign_member_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE next_code integer;
BEGIN
  IF NEW.member_code IS NULL OR NEW.member_code = '' THEN
    PERFORM 1 FROM public.gyms WHERE id = NEW.gym_id FOR UPDATE;
    SELECT COALESCE(MAX(NULLIF(regexp_replace(member_code, '\D', '', 'g'), '')::integer), 1000) + 1
      INTO next_code FROM public.gym_members WHERE gym_id = NEW.gym_id;
    NEW.member_code := next_code::text;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.sync_membership_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.membership_status := CASE
    WHEN COALESCE(NEW.pt_sessions_remaining, 0) > 0
      OR (NEW.group_subscription_until IS NOT NULL AND NEW.group_subscription_until > now())
    THEN 'active' ELSE 'inactive' END;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.guard_role_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.uid() IS NULL THEN RETURN NEW; END IF;
    IF NOT public.has_role_at(auth.uid(), NEW.gym_id, 'admin') THEN
      RAISE EXCEPTION 'Only a gym admin can change account roles';
    END IF;
    IF NEW.role = 'owner' AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Only the platform owner can grant owner access';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER gym_members_assign_code BEFORE INSERT ON public.gym_members
  FOR EACH ROW EXECUTE FUNCTION public.assign_member_code();
CREATE TRIGGER gym_members_sync_status BEFORE INSERT OR UPDATE ON public.gym_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_membership_status();
CREATE TRIGGER gym_members_guard_role BEFORE UPDATE ON public.gym_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_role_change();
CREATE TRIGGER gym_members_touch BEFORE UPDATE ON public.gym_members
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER gym_join_settings_touch BEFORE UPDATE ON public.gym_join_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ 7. signup / join / switch ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, gender)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    NULLIF(NEW.raw_user_meta_data->>'gender', '')
  );
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.join_gym(_slug text, _code text DEFAULT NULL, _referral text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller uuid := auth.uid();
  g RECORD;
  s RECORD;
  ref_id uuid;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO g FROM public.gyms WHERE slug = _slug;
  IF NOT FOUND THEN RAISE EXCEPTION 'Gym not found'; END IF;
  IF g.status = 'suspended' THEN RAISE EXCEPTION 'This gym is not accepting members right now'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.gym_members WHERE user_id = caller AND gym_id = g.id) THEN
    SELECT * INTO s FROM public.gym_join_settings WHERE gym_id = g.id;
    IF s.require_code THEN
      IF _code IS NULL OR upper(trim(_code)) <> upper(s.join_code) THEN
        RAISE EXCEPTION 'That join code is not correct';
      END IF;
    END IF;

    IF _referral IS NOT NULL AND length(trim(_referral)) > 0 THEN
      SELECT user_id INTO ref_id FROM public.gym_members
        WHERE gym_id = g.id AND referral_code = upper(trim(_referral)) LIMIT 1;
    END IF;

    INSERT INTO public.gym_members (user_id, gym_id, referred_by) VALUES (caller, g.id, ref_id);
  END IF;

  UPDATE public.profiles SET active_gym_id = g.id WHERE id = caller;
  RETURN g.id;
END; $$;

CREATE OR REPLACE FUNCTION public.set_active_gym(_gym_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.gym_members WHERE user_id = auth.uid() AND gym_id = _gym_id) THEN
    RAISE EXCEPTION 'You are not a member of that gym';
  END IF;
  UPDATE public.profiles SET active_gym_id = _gym_id WHERE id = auth.uid();
END; $$;

REVOKE ALL ON FUNCTION public.join_gym(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_gym(text, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.set_active_gym(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_active_gym(uuid) TO authenticated;

-- ============ 8. rewire gym-specific business logic ============
CREATE OR REPLACE FUNCTION public.get_referral_stats()
RETURNS TABLE(joined bigint, rewards bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM public.gym_members WHERE referred_by = auth.uid() AND gym_id = public.current_gym_id()),
    (SELECT count(*) FROM public.transactions WHERE member_id = auth.uid() AND source = 'referral' AND gym_id = public.current_gym_id());
$$;

CREATE OR REPLACE FUNCTION public.grant_referral_reward()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ref_id uuid; already_granted boolean;
BEGIN
  SELECT referred_by, referral_reward_granted INTO ref_id, already_granted
    FROM public.gym_members WHERE user_id = NEW.member_id AND gym_id = NEW.gym_id;

  IF ref_id IS NOT NULL AND already_granted = false THEN
    UPDATE public.gym_members SET referral_reward_granted = true
      WHERE user_id = NEW.member_id AND gym_id = NEW.gym_id;
    INSERT INTO public.transactions (member_id, classes, type, source, description, gym_id)
    VALUES (ref_id, 1, 'credit', 'referral', 'Referral reward — a friend you invited booked their first class', NEW.gym_id);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.consume_class_credit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  class_row RECORD; def_row RECORD; desc_text text; expiry timestamptz;
  remaining integer; paused_at timestamptz; is_staff_caller boolean; track text;
  sub_start timestamptz; class_dow int; allowed_dows int[]; window_start timestamptz;
  cap_count integer; member_gender text;
BEGIN
  IF NEW.status <> 'upcoming' THEN RETURN NEW; END IF;

  SELECT title, starts_at, type, gym_id INTO class_row FROM public.classes WHERE id = NEW.class_id;
  SELECT * INTO def_row FROM public.class_type_defs WHERE key = class_row.type AND gym_id = class_row.gym_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown class type: %', class_row.type; END IF;

  desc_text := 'Class booked: ' || COALESCE(class_row.title, 'class')
               || ' on ' || to_char(COALESCE(class_row.starts_at, now()), 'Mon DD, HH24:MI');

  is_staff_caller := COALESCE(public.has_role_at(auth.uid(), class_row.gym_id, 'staff'), false);

  IF NOT is_staff_caller AND NEW.child_id IS NULL AND NOT def_row.kids_only
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
        INTO expiry, track, sub_start FROM public.children WHERE id = NEW.child_id;
      IF expiry IS NULL OR expiry <= now() THEN
        RAISE EXCEPTION 'This child''s group class membership isn''t active';
      END IF;
    ELSE
      SELECT group_subscription_until, membership_paused_at, group_track, group_subscription_started_at
        INTO expiry, paused_at, track, sub_start
        FROM public.gym_members WHERE user_id = NEW.member_id AND gym_id = class_row.gym_id;
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
        ELSE ARRAY[]::int[] END;
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
          AND d2.credit_source = 'group' AND d2.track_restricted = true
          AND c.starts_at >= window_start AND c.starts_at < window_start + interval '30 days'
          AND b.id <> COALESCE(NEW.id, gen_random_uuid());
      IF cap_count >= 12 THEN RAISE EXCEPTION 'You''ve reached the 12-class monthly cap'; END IF;
    END IF;

  ELSIF def_row.credit_source = 'pt' THEN
    IF NEW.child_id IS NOT NULL THEN
      SELECT COALESCE(pt_sessions_remaining, 0) INTO remaining FROM public.children WHERE id = NEW.child_id FOR UPDATE;
      IF COALESCE(remaining, 0) <= 0 THEN
        RAISE EXCEPTION 'No PT sessions remaining for this child — visit the gym to add more';
      END IF;
      INSERT INTO public.transactions (member_id, child_id, classes, type, source, description, service, gym_id)
      VALUES (NEW.member_id, NEW.child_id, 1, 'debit', 'booking', desc_text, 'pt', COALESCE(class_row.gym_id, NEW.gym_id));
    ELSE
      SELECT COALESCE(pt_sessions_remaining, 0) INTO remaining
        FROM public.gym_members WHERE user_id = NEW.member_id AND gym_id = class_row.gym_id FOR UPDATE;
      IF COALESCE(remaining, 0) <= 0 THEN
        RAISE EXCEPTION 'No PT sessions remaining — visit the gym to add more';
      END IF;
      INSERT INTO public.transactions (member_id, child_id, classes, type, source, description, service, gym_id)
      VALUES (NEW.member_id, NULL, 1, 'debit', 'booking', desc_text, 'pt', COALESCE(class_row.gym_id, NEW.gym_id));
    END IF;
  END IF;

  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.sync_classes_remaining()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  delta integer; current_balance integer; new_balance integer;
  current_expiry timestamptz; new_expiry timestamptz; day_delta integer;
  current_start timestamptz; new_start timestamptz;
BEGIN
  IF NEW.service = 'pt' THEN
    delta := CASE WHEN NEW.type = 'credit' THEN NEW.classes ELSE -NEW.classes END;
    IF NEW.child_id IS NOT NULL THEN
      SELECT COALESCE(pt_sessions_remaining, 0) INTO current_balance FROM public.children WHERE id = NEW.child_id FOR UPDATE;
      new_balance := COALESCE(current_balance, 0) + delta;
      IF new_balance < 0 THEN
        RAISE EXCEPTION 'This would take the balance below zero — they currently have % PT sessions remaining', COALESCE(current_balance, 0);
      END IF;
      UPDATE public.children SET pt_sessions_remaining = new_balance WHERE id = NEW.child_id;
    ELSE
      SELECT COALESCE(pt_sessions_remaining, 0) INTO current_balance
        FROM public.gym_members WHERE user_id = NEW.member_id AND gym_id = NEW.gym_id FOR UPDATE;
      new_balance := COALESCE(current_balance, 0) + delta;
      IF new_balance < 0 THEN
        RAISE EXCEPTION 'This would take the balance below zero — they currently have % PT sessions remaining', COALESCE(current_balance, 0);
      END IF;
      UPDATE public.gym_members SET pt_sessions_remaining = new_balance
        WHERE user_id = NEW.member_id AND gym_id = NEW.gym_id;
    END IF;

  ELSIF NEW.service = 'group' THEN
    day_delta := COALESCE(NEW.days, 0);
    IF NEW.child_id IS NOT NULL THEN
      SELECT group_subscription_until, group_subscription_started_at INTO current_expiry, current_start
        FROM public.children WHERE id = NEW.child_id FOR UPDATE;
    ELSE
      SELECT group_subscription_until, group_subscription_started_at INTO current_expiry, current_start
        FROM public.gym_members WHERE user_id = NEW.member_id AND gym_id = NEW.gym_id FOR UPDATE;
    END IF;

    IF NEW.type = 'credit' THEN
      new_expiry := GREATEST(COALESCE(current_expiry, now()), now()) + (day_delta || ' days')::interval;
      IF current_expiry IS NULL OR current_expiry <= now() THEN new_start := now(); ELSE new_start := current_start; END IF;
    ELSE
      new_expiry := COALESCE(current_expiry, now()) - (day_delta || ' days')::interval;
      new_start := current_start;
    END IF;

    IF NEW.child_id IS NOT NULL THEN
      UPDATE public.children
        SET group_subscription_until = new_expiry,
            group_subscription_started_at = CASE WHEN new_expiry IS NULL OR new_expiry <= now() THEN NULL ELSE new_start END,
            group_track = CASE WHEN new_expiry IS NULL OR new_expiry <= now() THEN NULL ELSE group_track END
        WHERE id = NEW.child_id;
    ELSE
      UPDATE public.gym_members
        SET group_subscription_until = new_expiry,
            group_subscription_started_at = CASE WHEN new_expiry IS NULL OR new_expiry <= now() THEN NULL ELSE new_start END,
            group_track = CASE WHEN new_expiry IS NULL OR new_expiry <= now() THEN NULL ELSE group_track END,
            membership_pause_days_used = CASE WHEN NEW.type = 'credit' THEN 0 ELSE membership_pause_days_used END,
            membership_paused_at = CASE WHEN NEW.type = 'credit' THEN NULL ELSE membership_paused_at END
        WHERE user_id = NEW.member_id AND gym_id = NEW.gym_id;
    END IF;
  END IF;

  RETURN NEW;
END; $$;

DROP FUNCTION IF EXISTS public.pause_membership(uuid);
CREATE OR REPLACE FUNCTION public.pause_membership(target_user uuid, target_gym uuid DEFAULT NULL)
RETURNS public.gym_members LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller uuid := auth.uid(); g uuid := COALESCE(target_gym, public.current_gym_id());
  row_out public.gym_members;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF caller <> target_user AND NOT public.has_role_at(caller, g, 'staff') THEN RAISE EXCEPTION 'Not authorised'; END IF;
  SELECT * INTO row_out FROM public.gym_members WHERE user_id = target_user AND gym_id = g FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF row_out.membership_paused_at IS NOT NULL THEN RAISE EXCEPTION 'Membership is already paused'; END IF;
  IF row_out.group_subscription_until IS NULL OR row_out.group_subscription_until <= now() THEN
    RAISE EXCEPTION 'No active group membership to pause';
  END IF;
  IF COALESCE(row_out.membership_pause_days_used, 0) >= 45 THEN
    RAISE EXCEPTION 'Pause limit of 45 days already used for this membership cycle';
  END IF;
  UPDATE public.gym_members SET membership_paused_at = now()
    WHERE user_id = target_user AND gym_id = g RETURNING * INTO row_out;
  RETURN row_out;
END; $$;

DROP FUNCTION IF EXISTS public.resume_membership(uuid);
CREATE OR REPLACE FUNCTION public.resume_membership(target_user uuid, target_gym uuid DEFAULT NULL)
RETURNS public.gym_members LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller uuid := auth.uid(); g uuid := COALESCE(target_gym, public.current_gym_id());
  row_out public.gym_members; elapsed_days integer; allowed_days integer; add_days integer;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF caller <> target_user AND NOT public.has_role_at(caller, g, 'staff') THEN RAISE EXCEPTION 'Not authorised'; END IF;
  SELECT * INTO row_out FROM public.gym_members WHERE user_id = target_user AND gym_id = g FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF row_out.membership_paused_at IS NULL THEN RAISE EXCEPTION 'Membership is not paused'; END IF;

  elapsed_days := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (now() - row_out.membership_paused_at)) / 86400.0)::int);
  allowed_days := GREATEST(0, 45 - COALESCE(row_out.membership_pause_days_used, 0));
  add_days := LEAST(elapsed_days, allowed_days);

  UPDATE public.gym_members
    SET membership_paused_at = NULL,
        membership_pause_days_used = COALESCE(membership_pause_days_used, 0) + add_days,
        group_subscription_until = COALESCE(group_subscription_until, now()) + (add_days || ' days')::interval
    WHERE user_id = target_user AND gym_id = g
    RETURNING * INTO row_out;
  RETURN row_out;
END; $$;

CREATE OR REPLACE FUNCTION public.set_group_track(target_user uuid, target_child uuid, track text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller uuid := auth.uid(); g uuid := public.current_gym_id();
  is_staff boolean; current_track text;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF track NOT IN ('sat_mon_wed','sun_tue_thu') THEN RAISE EXCEPTION 'Invalid track'; END IF;
  is_staff := public.has_role_at(caller, g, 'staff');

  IF target_child IS NOT NULL THEN
    IF NOT is_staff AND NOT EXISTS (SELECT 1 FROM public.children WHERE id = target_child AND parent_id = caller) THEN
      RAISE EXCEPTION 'Not authorised';
    END IF;
    IF is_staff AND NOT EXISTS (SELECT 1 FROM public.children WHERE id = target_child AND gym_id = g) THEN
      RAISE EXCEPTION 'Not authorised';
    END IF;
    SELECT group_track INTO current_track FROM public.children WHERE id = target_child FOR UPDATE;
    IF current_track IS NOT NULL AND NOT is_staff THEN RAISE EXCEPTION 'Booking days already set for this cycle'; END IF;
    UPDATE public.children SET group_track = track WHERE id = target_child;
  ELSE
    IF caller <> target_user AND NOT is_staff THEN RAISE EXCEPTION 'Not authorised'; END IF;
    SELECT group_track INTO current_track FROM public.gym_members
      WHERE user_id = target_user AND gym_id = g FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Member not found'; END IF;
    IF current_track IS NOT NULL AND NOT is_staff THEN RAISE EXCEPTION 'Booking days already set for this cycle'; END IF;
    UPDATE public.gym_members SET group_track = track WHERE user_id = target_user AND gym_id = g;
  END IF;
END; $$;