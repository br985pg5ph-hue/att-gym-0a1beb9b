
ALTER TABLE public.profiles RENAME COLUMN classes_remaining TO pt_sessions_remaining;
ALTER TABLE public.profiles ADD COLUMN group_subscription_until timestamptz;

DROP POLICY "Parents insert own children" ON public.children;
DROP POLICY "Parents update own children" ON public.children;

ALTER TABLE public.children DROP COLUMN classes_remaining;
ALTER TABLE public.children ADD COLUMN group_subscription_until timestamptz;

CREATE POLICY "Parents insert own children" ON public.children
FOR INSERT
WITH CHECK (
  parent_id = auth.uid()
  AND group_subscription_until IS NULL
  AND streak = 0
  AND classes_attended = 0
);

CREATE POLICY "Parents update own children" ON public.children
FOR UPDATE
USING (parent_id = auth.uid())
WITH CHECK (
  parent_id = auth.uid()
  AND (NOT (group_subscription_until IS DISTINCT FROM (SELECT c.group_subscription_until FROM public.children c WHERE c.id = children.id)))
  AND streak = (SELECT c.streak FROM public.children c WHERE c.id = children.id)
  AND classes_attended = (SELECT c.classes_attended FROM public.children c WHERE c.id = children.id)
);

DROP POLICY "own profile update" ON public.profiles;
CREATE POLICY "own profile update" ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  AND membership_status = (SELECT p.membership_status FROM public.profiles p WHERE p.id = auth.uid())
  AND pt_sessions_remaining = (SELECT p.pt_sessions_remaining FROM public.profiles p WHERE p.id = auth.uid())
  AND (NOT (group_subscription_until IS DISTINCT FROM (SELECT p.group_subscription_until FROM public.profiles p WHERE p.id = auth.uid())))
  AND streak = (SELECT p.streak FROM public.profiles p WHERE p.id = auth.uid())
  AND classes_attended = (SELECT p.classes_attended FROM public.profiles p WHERE p.id = auth.uid())
  AND (NOT (referral_code IS DISTINCT FROM (SELECT p.referral_code FROM public.profiles p WHERE p.id = auth.uid())))
);

ALTER TABLE public.transactions
  ADD COLUMN service text NOT NULL DEFAULT 'pt' CHECK (service IN ('pt','group')),
  ADD COLUMN days integer;
