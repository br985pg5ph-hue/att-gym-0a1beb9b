
CREATE OR REPLACE FUNCTION public.refund_class_credit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  class_row RECORD;
  desc_text text;
BEGIN
  IF OLD.status = 'upcoming' AND NEW.status = 'cancelled' THEN
    SELECT title, starts_at INTO class_row FROM public.classes WHERE id = NEW.class_id;
    desc_text := 'Booking cancelled: ' || COALESCE(class_row.title, 'class')
                 || ' on ' || to_char(COALESCE(class_row.starts_at, now()), 'Mon DD, HH24:MI');
    INSERT INTO public.transactions (member_id, child_id, classes, type, source, description)
    VALUES (NEW.member_id, NEW.child_id, 1, 'credit', 'booking', desc_text);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_class_credit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  class_row RECORD;
  desc_text text;
BEGIN
  IF NEW.status <> 'upcoming' THEN RETURN NEW; END IF;
  SELECT title, starts_at INTO class_row FROM public.classes WHERE id = NEW.class_id;
  desc_text := 'Class booked: ' || COALESCE(class_row.title, 'class')
               || ' on ' || to_char(COALESCE(class_row.starts_at, now()), 'Mon DD, HH24:MI');
  INSERT INTO public.transactions (member_id, child_id, classes, type, source, description)
  VALUES (NEW.member_id, NEW.child_id, 1, 'debit', 'booking', desc_text);
  RETURN NEW;
END;
$$;
