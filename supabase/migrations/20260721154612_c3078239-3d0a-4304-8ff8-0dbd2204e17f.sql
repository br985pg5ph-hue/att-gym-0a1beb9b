CREATE OR REPLACE FUNCTION public.reject_past_class_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  starts timestamptz;
BEGIN
  IF NEW.status = 'upcoming' THEN
    SELECT starts_at INTO starts FROM public.classes WHERE id = NEW.class_id;
    IF starts IS NULL OR starts <= now() THEN
      RAISE EXCEPTION 'This class has already started';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_reject_past ON public.bookings;
CREATE TRIGGER bookings_reject_past
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.reject_past_class_booking();