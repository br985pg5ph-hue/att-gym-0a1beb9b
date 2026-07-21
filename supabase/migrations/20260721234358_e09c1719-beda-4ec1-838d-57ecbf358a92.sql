
CREATE OR REPLACE FUNCTION public.assign_member_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  candidate text;
  tries int := 0;
BEGIN
  IF NEW.member_code IS NULL OR NEW.member_code = '' OR NEW.member_code !~ '^\d{4}$' THEN
    LOOP
      candidate := lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE member_code = candidate);
      tries := tries + 1;
      IF tries > 50 THEN RAISE EXCEPTION 'Could not allocate unique member_code'; END IF;
    END LOOP;
    NEW.member_code := candidate;
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill existing rows to random 4-digit codes
DO $$
DECLARE r RECORD; candidate text; tries int;
BEGIN
  FOR r IN SELECT id FROM public.profiles LOOP
    tries := 0;
    LOOP
      candidate := lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE member_code = candidate);
      tries := tries + 1;
      IF tries > 50 THEN RAISE EXCEPTION 'Could not allocate unique member_code'; END IF;
    END LOOP;
    UPDATE public.profiles SET member_code = candidate WHERE id = r.id;
  END LOOP;
END $$;
