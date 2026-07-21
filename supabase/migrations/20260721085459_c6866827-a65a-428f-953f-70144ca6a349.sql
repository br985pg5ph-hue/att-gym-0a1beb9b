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
BEGIN
  delta := CASE WHEN NEW.type = 'credit' THEN NEW.classes ELSE -NEW.classes END;

  IF NEW.child_id IS NOT NULL THEN
    SELECT COALESCE(classes_remaining, 0) INTO current_balance
      FROM public.children WHERE id = NEW.child_id FOR UPDATE;
  ELSE
    SELECT COALESCE(classes_remaining, 0) INTO current_balance
      FROM public.profiles WHERE id = NEW.member_id FOR UPDATE;
  END IF;

  new_balance := COALESCE(current_balance, 0) + delta;
  IF new_balance < 0 THEN
    RAISE EXCEPTION 'This would take the balance below zero — they currently have % classes remaining', COALESCE(current_balance, 0);
  END IF;

  IF NEW.child_id IS NOT NULL THEN
    UPDATE public.children
      SET classes_remaining = new_balance
      WHERE id = NEW.child_id;
  ELSE
    UPDATE public.profiles
      SET classes_remaining = new_balance
      WHERE id = NEW.member_id;
  END IF;
  RETURN NEW;
END;
$function$;