
CREATE OR REPLACE FUNCTION public.sync_membership_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.membership_status := CASE WHEN COALESCE(NEW.classes_remaining, 0) > 0 THEN 'active' ELSE 'inactive' END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_membership_status ON public.profiles;
CREATE TRIGGER profiles_sync_membership_status
BEFORE INSERT OR UPDATE OF classes_remaining ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_membership_status();

-- Backfill existing rows so status matches current class balance.
UPDATE public.profiles SET classes_remaining = classes_remaining;

-- Prevent members from setting membership_status directly on their own row.
DROP POLICY IF EXISTS "own profile update" ON public.profiles;
CREATE POLICY "own profile update" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT profiles_1.role FROM public.profiles profiles_1 WHERE profiles_1.id = auth.uid())
    AND membership_status = (SELECT profiles_1.membership_status FROM public.profiles profiles_1 WHERE profiles_1.id = auth.uid())
  );
