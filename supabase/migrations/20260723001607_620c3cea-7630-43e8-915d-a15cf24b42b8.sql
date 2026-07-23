
CREATE SEQUENCE IF NOT EXISTS public.member_code_seq START 1001 MINVALUE 1001;

-- Advance sequence past any existing numeric codes
SELECT setval(
  'public.member_code_seq',
  GREATEST(
    1000,
    COALESCE((SELECT MAX(member_code::int) FROM public.profiles WHERE member_code ~ '^\d+$'), 1000)
  )
);

CREATE OR REPLACE FUNCTION public.assign_member_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  candidate text;
  tries int := 0;
BEGIN
  IF NEW.member_code IS NULL OR NEW.member_code = '' THEN
    LOOP
      candidate := nextval('public.member_code_seq')::text;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE member_code = candidate);
      tries := tries + 1;
      IF tries > 100 THEN RAISE EXCEPTION 'Could not allocate unique member_code'; END IF;
    END LOOP;
    NEW.member_code := candidate;
  END IF;
  RETURN NEW;
END;
$function$;
