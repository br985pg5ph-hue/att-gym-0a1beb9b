
-- 1) Column
ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS pt_sessions_remaining integer NOT NULL DEFAULT 0;

-- 2) Tighten RLS to prevent parents editing PT balance directly
DROP POLICY IF EXISTS "Parents update own children" ON public.children;
CREATE POLICY "Parents update own children"
ON public.children
FOR UPDATE
USING (parent_id = auth.uid())
WITH CHECK (
  parent_id = auth.uid()
  AND NOT (group_subscription_until IS DISTINCT FROM (SELECT c.group_subscription_until FROM public.children c WHERE c.id = children.id))
  AND streak = (SELECT c.streak FROM public.children c WHERE c.id = children.id)
  AND classes_attended = (SELECT c.classes_attended FROM public.children c WHERE c.id = children.id)
  AND pt_sessions_remaining = (SELECT c.pt_sessions_remaining FROM public.children c WHERE c.id = children.id)
);

DROP POLICY IF EXISTS "Parents insert own children" ON public.children;
CREATE POLICY "Parents insert own children"
ON public.children
FOR INSERT
WITH CHECK (
  parent_id = auth.uid()
  AND group_subscription_until IS NULL
  AND streak = 0
  AND classes_attended = 0
  AND pt_sessions_remaining = 0
);

-- 3) sync_classes_remaining: for PT, route to child if child_id present
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

      UPDATE public.children
        SET pt_sessions_remaining = new_balance
        WHERE id = NEW.child_id;
    ELSE
      SELECT COALESCE(pt_sessions_remaining, 0) INTO current_balance
        FROM public.profiles WHERE id = NEW.member_id FOR UPDATE;

      new_balance := COALESCE(current_balance, 0) + delta;
      IF new_balance < 0 THEN
        RAISE EXCEPTION 'This would take the balance below zero — they currently have % PT sessions remaining', COALESCE(current_balance, 0);
      END IF;

      UPDATE public.profiles
        SET pt_sessions_remaining = new_balance
        WHERE id = NEW.member_id;
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
      UPDATE public.children
        SET group_subscription_until = new_expiry
        WHERE id = NEW.child_id;
    ELSE
      UPDATE public.profiles
        SET group_subscription_until = new_expiry
        WHERE id = NEW.member_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4) consume_class_credit: for PT, check child balance if booked for a child
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
BEGIN
  IF NEW.status <> 'upcoming' THEN RETURN NEW; END IF;

  SELECT title, starts_at, type INTO class_row
    FROM public.classes WHERE id = NEW.class_id;

  desc_text := 'Class booked: ' || COALESCE(class_row.title, 'class')
               || ' on ' || to_char(COALESCE(class_row.starts_at, now()), 'Mon DD, HH24:MI');

  IF class_row.type::text IN ('mixed', 'women_only', 'yoga', 'gymnastics') THEN
    SELECT group_subscription_until INTO expiry
      FROM public.profiles WHERE id = NEW.member_id;
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

-- 5) refund_class_credit: preserve child_id on PT refund
CREATE OR REPLACE FUNCTION public.refund_class_credit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  class_row RECORD;
  desc_text text;
BEGIN
  IF OLD.status = 'upcoming' AND NEW.status = 'cancelled' THEN
    SELECT title, starts_at, type INTO class_row FROM public.classes WHERE id = NEW.class_id;
    IF class_row.type::text = 'pt' THEN
      desc_text := 'Booking cancelled: ' || COALESCE(class_row.title, 'class')
                   || ' on ' || to_char(COALESCE(class_row.starts_at, now()), 'Mon DD, HH24:MI');
      INSERT INTO public.transactions (member_id, child_id, classes, type, source, description, service)
      VALUES (NEW.member_id, NEW.child_id, 1, 'credit', 'booking', desc_text, 'pt');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
