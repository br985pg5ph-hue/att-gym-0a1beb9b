
-- Allow 'booking' as a transaction source
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_source_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_source_check
  CHECK (source = ANY (ARRAY['staff','referral','admin_adjustment','booking']));

-- Rewrite consume_class_credit: insert a transaction (sync trigger updates balance) so history shows the debit.
CREATE OR REPLACE FUNCTION public.consume_class_credit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  class_row RECORD;
  desc_text text;
BEGIN
  IF NEW.status <> 'upcoming' THEN
    RETURN NEW;
  END IF;

  SELECT name, starts_at INTO class_row FROM public.classes WHERE id = NEW.class_id;
  desc_text := 'Class booked: ' || COALESCE(class_row.name, 'class')
               || ' on ' || to_char(COALESCE(class_row.starts_at, now()), 'Mon DD, HH24:MI');

  INSERT INTO public.transactions (member_id, child_id, classes, type, source, description)
  VALUES (NEW.member_id, NEW.child_id, 1, 'debit', 'booking', desc_text);

  RETURN NEW;
END;
$function$;

-- Rewrite refund_class_credit similarly: insert a credit transaction on cancellation.
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
    SELECT name, starts_at INTO class_row FROM public.classes WHERE id = NEW.class_id;
    desc_text := 'Booking cancelled: ' || COALESCE(class_row.name, 'class')
                 || ' on ' || to_char(COALESCE(class_row.starts_at, now()), 'Mon DD, HH24:MI');
    INSERT INTO public.transactions (member_id, child_id, classes, type, source, description)
    VALUES (NEW.member_id, NEW.child_id, 1, 'credit', 'booking', desc_text);
  END IF;
  RETURN NEW;
END;
$function$;

-- consume trigger must run AFTER insert so sync sees the row; keep BEFORE-insert capacity/kids checks.
DROP TRIGGER IF EXISTS bookings_consume_credit ON public.bookings;
CREATE TRIGGER bookings_consume_credit
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.consume_class_credit();

-- Pre-check balance BEFORE insert so we fail early with a friendly message and don't consume capacity slot.
CREATE OR REPLACE FUNCTION public.check_class_credit_available()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  remaining integer;
BEGIN
  IF NEW.status <> 'upcoming' THEN RETURN NEW; END IF;
  IF NEW.child_id IS NOT NULL THEN
    SELECT classes_remaining INTO remaining FROM public.children WHERE id = NEW.child_id;
    IF COALESCE(remaining,0) <= 0 THEN
      RAISE EXCEPTION 'No classes remaining for this child';
    END IF;
  ELSE
    SELECT classes_remaining INTO remaining FROM public.profiles WHERE id = NEW.member_id;
    IF COALESCE(remaining,0) <= 0 THEN
      RAISE EXCEPTION 'No classes remaining — visit the gym to add more';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS bookings_check_credit ON public.bookings;
CREATE TRIGGER bookings_check_credit
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_class_credit_available();
