CREATE OR REPLACE FUNCTION public.sync_classes_remaining()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    -- PT sessions are adult-only; ignore any stray child_id
    delta := CASE WHEN NEW.type = 'credit' THEN NEW.classes ELSE -NEW.classes END;

    SELECT COALESCE(pt_sessions_remaining, 0) INTO current_balance
      FROM public.profiles WHERE id = NEW.member_id FOR UPDATE;

    new_balance := COALESCE(current_balance, 0) + delta;
    IF new_balance < 0 THEN
      RAISE EXCEPTION 'This would take the balance below zero — they currently have % PT sessions remaining', COALESCE(current_balance, 0);
    END IF;

    UPDATE public.profiles
      SET pt_sessions_remaining = new_balance
      WHERE id = NEW.member_id;

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