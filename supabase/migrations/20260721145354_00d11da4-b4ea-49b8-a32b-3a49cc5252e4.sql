ALTER TYPE public.class_type ADD VALUE IF NOT EXISTS 'yoga';
ALTER TYPE public.class_type ADD VALUE IF NOT EXISTS 'gymnastics';

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
    SELECT COALESCE(pt_sessions_remaining, 0) INTO remaining
      FROM public.profiles WHERE id = NEW.member_id FOR UPDATE;
    IF COALESCE(remaining, 0) <= 0 THEN
      RAISE EXCEPTION 'No PT sessions remaining — visit the gym to add more';
    END IF;
    INSERT INTO public.transactions (member_id, child_id, classes, type, source, description, service)
    VALUES (NEW.member_id, NULL, 1, 'debit', 'booking', desc_text, 'pt');
  END IF;

  RETURN NEW;
END;
$function$;