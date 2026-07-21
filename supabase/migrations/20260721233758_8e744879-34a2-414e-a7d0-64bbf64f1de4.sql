
CREATE SEQUENCE IF NOT EXISTS public.member_code_seq START 1;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS member_code text;

-- Backfill existing rows in stable order
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
  FROM public.profiles
  WHERE member_code IS NULL
)
UPDATE public.profiles p
SET member_code = 'ATT-' || lpad(o.rn::text, 5, '0')
FROM ordered o
WHERE p.id = o.id;

-- Advance sequence past the highest backfilled code
SELECT setval('public.member_code_seq', GREATEST(
  (SELECT COALESCE(MAX(NULLIF(regexp_replace(member_code, '\D', '', 'g'), '')::bigint), 0) FROM public.profiles),
  1
));

ALTER TABLE public.profiles ALTER COLUMN member_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_member_code_key ON public.profiles(member_code);

CREATE OR REPLACE FUNCTION public.assign_member_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.member_code IS NULL OR NEW.member_code = '' THEN
    NEW.member_code := 'ATT-' || lpad(nextval('public.member_code_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_assign_member_code ON public.profiles;
CREATE TRIGGER profiles_assign_member_code
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.assign_member_code();
