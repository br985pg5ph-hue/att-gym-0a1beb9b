ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS classes_remaining INTEGER NOT NULL DEFAULT 0;

UPDATE public.profiles SET classes_remaining = 8 WHERE wallet_balance > 0 OR classes_attended > 0;

DROP POLICY IF EXISTS "Staff can update member profiles" ON public.profiles;
CREATE POLICY "Staff can update member profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role));