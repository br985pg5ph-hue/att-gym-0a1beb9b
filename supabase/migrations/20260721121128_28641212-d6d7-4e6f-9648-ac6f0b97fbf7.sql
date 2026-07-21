CREATE OR REPLACE FUNCTION public.refund_class_credit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      VALUES (NEW.member_id, NULL, 1, 'credit', 'booking', desc_text, 'pt');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_membership_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.membership_status := CASE
    WHEN COALESCE(NEW.pt_sessions_remaining, 0) > 0
      OR (NEW.group_subscription_until IS NOT NULL AND NEW.group_subscription_until > now())
    THEN 'active'
    ELSE 'inactive'
  END;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sync_membership_status_trigger ON public.profiles;
DROP TRIGGER IF EXISTS profiles_sync_membership_status ON public.profiles;
DROP TRIGGER IF EXISTS sync_membership_status ON public.profiles;

CREATE TRIGGER sync_membership_status
BEFORE INSERT OR UPDATE OF pt_sessions_remaining, group_subscription_until ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_membership_status();