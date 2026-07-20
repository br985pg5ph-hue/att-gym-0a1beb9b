CREATE OR REPLACE FUNCTION public.enforce_kids_class_child()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ctype text;
BEGIN
  SELECT type::text INTO ctype FROM public.classes WHERE id = NEW.class_id;
  IF ctype = 'kids' AND NEW.child_id IS NULL THEN
    RAISE EXCEPTION 'Kids classes can only be booked for a child.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_enforce_kids_child ON public.bookings;
CREATE TRIGGER bookings_enforce_kids_child
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_kids_class_child();