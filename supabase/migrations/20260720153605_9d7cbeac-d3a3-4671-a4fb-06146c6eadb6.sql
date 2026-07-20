
-- profiles: pin protected columns
DROP POLICY "own profile update" ON public.profiles;
CREATE POLICY "own profile update" ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  AND membership_status = (SELECT membership_status FROM public.profiles WHERE id = auth.uid())
  AND classes_remaining = (SELECT classes_remaining FROM public.profiles WHERE id = auth.uid())
  AND streak = (SELECT streak FROM public.profiles WHERE id = auth.uid())
  AND classes_attended = (SELECT classes_attended FROM public.profiles WHERE id = auth.uid())
  AND referral_code IS NOT DISTINCT FROM (SELECT referral_code FROM public.profiles WHERE id = auth.uid())
);

-- children: replace FOR ALL with command-scoped policies
DROP POLICY "Parents manage own children" ON public.children;

CREATE POLICY "Parents read own children" ON public.children
FOR SELECT
USING (parent_id = auth.uid());

CREATE POLICY "Parents delete own children" ON public.children
FOR DELETE
USING (parent_id = auth.uid());

CREATE POLICY "Parents insert own children" ON public.children
FOR INSERT
WITH CHECK (
  parent_id = auth.uid()
  AND classes_remaining = 0
  AND streak = 0
  AND classes_attended = 0
);

CREATE POLICY "Parents update own children" ON public.children
FOR UPDATE
USING (parent_id = auth.uid())
WITH CHECK (
  parent_id = auth.uid()
  AND classes_remaining = (SELECT classes_remaining FROM public.children WHERE id = children.id)
  AND streak = (SELECT streak FROM public.children WHERE id = children.id)
  AND classes_attended = (SELECT classes_attended FROM public.children WHERE id = children.id)
);
