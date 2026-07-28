-- 1. Role hierarchy: admin/owner satisfy staff checks; owner satisfies admin checks.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id
      AND (
        p.role = _role
        OR (_role = 'staff' AND p.role IN ('admin','owner'))
        OR (_role = 'admin' AND p.role = 'owner')
      )
  )
$$;

-- 2. Promote the earliest staff account of each real gym to admin (the gym owner).
WITH first_staff AS (
  SELECT DISTINCT ON (p.gym_id) p.id
  FROM public.profiles p
  JOIN public.gyms g ON g.id = p.gym_id
  WHERE p.role = 'staff' AND g.slug <> 'platform'
  ORDER BY p.gym_id, p.created_at ASC
)
UPDATE public.profiles SET role = 'admin'
WHERE id IN (SELECT id FROM first_staff);

-- 3. Platform owners become role = 'owner'.
UPDATE public.profiles SET role = 'owner' WHERE is_platform_admin = true;

-- 4. Recreate the self-update policy without the is_platform_admin column.
DROP POLICY IF EXISTS "own profile update" ON public.profiles;
CREATE POLICY "own profile update" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND gym_id = (SELECT p.gym_id FROM public.profiles p WHERE p.id = auth.uid())
  AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  AND membership_status = (SELECT p.membership_status FROM public.profiles p WHERE p.id = auth.uid())
  AND pt_sessions_remaining = (SELECT p.pt_sessions_remaining FROM public.profiles p WHERE p.id = auth.uid())
  AND NOT (group_subscription_until IS DISTINCT FROM (SELECT p.group_subscription_until FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (group_subscription_started_at IS DISTINCT FROM (SELECT p.group_subscription_started_at FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (group_track IS DISTINCT FROM (SELECT p.group_track FROM public.profiles p WHERE p.id = auth.uid()))
  AND streak = (SELECT p.streak FROM public.profiles p WHERE p.id = auth.uid())
  AND classes_attended = (SELECT p.classes_attended FROM public.profiles p WHERE p.id = auth.uid())
  AND NOT (referral_code IS DISTINCT FROM (SELECT p.referral_code FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (member_code IS DISTINCT FROM (SELECT p.member_code FROM public.profiles p WHERE p.id = auth.uid()))
);

-- 5. Platform-owner check now reads the role.
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((SELECT role = 'owner' FROM public.profiles WHERE id = auth.uid()), false)
$$;

-- 6. Retire the old flag.
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_platform_admin;

-- 7. Admin-only surfaces: gym settings/branding.
DROP POLICY IF EXISTS "gyms staff update" ON public.gyms;
CREATE POLICY "gyms admin update" ON public.gyms
FOR UPDATE TO authenticated
USING (public.is_platform_admin() OR (public.has_role(auth.uid(), 'admin') AND id = public.current_gym_id()))
WITH CHECK (public.is_platform_admin() OR (public.has_role(auth.uid(), 'admin') AND id = public.current_gym_id()));

-- 8. Admin-only surfaces: coach roster.
DROP POLICY IF EXISTS "coaches staff write" ON public.coaches;
DROP POLICY IF EXISTS "coaches staff update" ON public.coaches;
DROP POLICY IF EXISTS "coaches staff delete" ON public.coaches;
CREATE POLICY "coaches admin insert" ON public.coaches
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND public.same_gym(gym_id));
CREATE POLICY "coaches admin update" ON public.coaches
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND public.same_gym(gym_id))
WITH CHECK (public.has_role(auth.uid(), 'admin') AND public.same_gym(gym_id));
CREATE POLICY "coaches admin delete" ON public.coaches
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND public.same_gym(gym_id));

-- 9. Only admins/owners may change someone's role.
CREATE OR REPLACE FUNCTION public.guard_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.uid() IS NULL THEN
      RETURN NEW; -- service role / triggers
    END IF;
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only a gym admin can change account roles';
    END IF;
    IF NEW.role = 'owner' AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Only the platform owner can grant owner access';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_role_change ON public.profiles;
CREATE TRIGGER guard_role_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_role_change();