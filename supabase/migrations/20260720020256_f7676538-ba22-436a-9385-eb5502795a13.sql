
-- Consume a class credit when a booking is inserted
CREATE OR REPLACE FUNCTION public.consume_class_credit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining integer;
BEGIN
  IF NEW.status <> 'upcoming' THEN
    RETURN NEW;
  END IF;

  IF NEW.child_id IS NOT NULL THEN
    SELECT classes_remaining INTO remaining FROM public.children WHERE id = NEW.child_id FOR UPDATE;
    IF remaining IS NULL OR remaining <= 0 THEN
      RAISE EXCEPTION 'No classes remaining for this child';
    END IF;
    UPDATE public.children SET classes_remaining = classes_remaining - 1 WHERE id = NEW.child_id;
  ELSE
    SELECT classes_remaining INTO remaining FROM public.profiles WHERE id = NEW.member_id FOR UPDATE;
    IF remaining IS NULL OR remaining <= 0 THEN
      RAISE EXCEPTION 'No classes remaining — visit the gym to add more';
    END IF;
    UPDATE public.profiles SET classes_remaining = classes_remaining - 1 WHERE id = NEW.member_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_consume_credit ON public.bookings;
CREATE TRIGGER bookings_consume_credit
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.consume_class_credit();

-- Refund a class credit when a booking is cancelled
CREATE OR REPLACE FUNCTION public.refund_class_credit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'upcoming' AND NEW.status = 'cancelled' THEN
    IF NEW.child_id IS NOT NULL THEN
      UPDATE public.children
        SET classes_remaining = COALESCE(classes_remaining, 0) + 1
        WHERE id = NEW.child_id;
    ELSE
      UPDATE public.profiles
        SET classes_remaining = COALESCE(classes_remaining, 0) + 1
        WHERE id = NEW.member_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_refund_credit ON public.bookings;
CREATE TRIGGER bookings_refund_credit
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.refund_class_credit();
