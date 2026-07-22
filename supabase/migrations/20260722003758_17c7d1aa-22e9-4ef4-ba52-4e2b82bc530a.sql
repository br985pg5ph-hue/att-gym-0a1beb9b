
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS membership_paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS membership_pause_days_used integer NOT NULL DEFAULT 0;

-- Reset pause counter on new group credit + block group booking while paused
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
      SELECT group_subscription_until INTO current_expiry
        FROM public.children WHERE id = NEW.child_id FOR UPDATE;
    ELSE
      SELECT group_subscription_until INTO current_expiry
        FROM public.profiles WHERE id = NEW.member_id FOR UPDATE;
    END IF;

    IF NEW.type = 'credit' THEN
      new_expiry := GREATEST(COALESCE(current_expiry, now()), now()) + (day_delta || ' days')::interval;
    ELSE
      new_expiry := COALESCE(current_expiry, now()) - (day_delta || ' days')::interval;
    END IF;

    IF NEW.child_id IS NOT NULL THEN
      UPDATE public.children SET group_subscription_until = new_expiry WHERE id = NEW.child_id;
    ELSE
      UPDATE public.profiles
        SET group_subscription_until = new_expiry,
            -- Reset pause allowance on a fresh credit (renewal); also auto-unpause
            membership_pause_days_used = CASE WHEN NEW.type = 'credit' THEN 0 ELSE membership_pause_days_used END,
            membership_paused_at = CASE WHEN NEW.type = 'credit' THEN NULL ELSE membership_paused_at END
        WHERE id = NEW.member_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Block group class booking while membership is paused
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
BEGIN
  IF NEW.status <> 'upcoming' THEN RETURN NEW; END IF;

  SELECT title, starts_at, type INTO class_row
    FROM public.classes WHERE id = NEW.class_id;

  desc_text := 'Class booked: ' || COALESCE(class_row.title, 'class')
               || ' on ' || to_char(COALESCE(class_row.starts_at, now()), 'Mon DD, HH24:MI');

  IF class_row.type::text IN ('mixed', 'women_only', 'yoga', 'gymnastics') THEN
    SELECT group_subscription_until, membership_paused_at INTO expiry, paused_at
      FROM public.profiles WHERE id = NEW.member_id;
    IF paused_at IS NOT NULL THEN
      RAISE EXCEPTION 'Your membership is paused — resume it to book group classes';
    END IF;
    IF expiry IS NULL OR expiry <= now() THEN
      RAISE EXCEPTION 'Your group class membership isn''t active';
    END IF;

  ELSIF class_row.type::text = 'kids' THEN
    SELECT group_subscription_until INTO expiry
      FROM public.children WHERE id = NEW.child_id;
    IF expiry IS NULL OR expiry <= now() THEN
      RAISE EXCEPTION 'This child''s group class membership isn''t active';
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

-- Pause / resume RPCs (security definer; enforce caller identity)
CREATE OR REPLACE FUNCTION public.pause_membership(target_user uuid)
 RETURNS public.profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  is_staff boolean;
  row_out public.profiles;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT public.has_role(caller, 'staff') INTO is_staff;
  IF caller <> target_user AND NOT is_staff THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  SELECT * INTO row_out FROM public.profiles WHERE id = target_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Member not found'; END IF;

  IF row_out.membership_paused_at IS NOT NULL THEN
    RAISE EXCEPTION 'Membership is already paused';
  END IF;
  IF row_out.group_subscription_until IS NULL OR row_out.group_subscription_until <= now() THEN
    RAISE EXCEPTION 'No active group membership to pause';
  END IF;
  IF COALESCE(row_out.membership_pause_days_used, 0) >= 45 THEN
    RAISE EXCEPTION 'Pause limit of 45 days already used for this membership cycle';
  END IF;

  UPDATE public.profiles
    SET membership_paused_at = now()
    WHERE id = target_user
    RETURNING * INTO row_out;
  RETURN row_out;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resume_membership(target_user uuid)
 RETURNS public.profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  is_staff boolean;
  row_out public.profiles;
  elapsed_days integer;
  allowed_days integer;
  add_days integer;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT public.has_role(caller, 'staff') INTO is_staff;
  IF caller <> target_user AND NOT is_staff THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  SELECT * INTO row_out FROM public.profiles WHERE id = target_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF row_out.membership_paused_at IS NULL THEN
    RAISE EXCEPTION 'Membership is not paused';
  END IF;

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

GRANT EXECUTE ON FUNCTION public.pause_membership(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resume_membership(uuid) TO authenticated;
