
-- Drop old wallet trigger + function
DROP TRIGGER IF EXISTS on_transaction_insert ON public.transactions;
DROP FUNCTION IF EXISTS public.sync_wallet_balance();

-- Drop wallet balance from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS wallet_balance;

-- Repurpose transactions into class-credit log
ALTER TABLE public.transactions RENAME COLUMN amount TO classes;
ALTER TABLE public.transactions ALTER COLUMN classes TYPE integer USING classes::integer;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS child_id uuid REFERENCES public.children(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('cash','card');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_method public.payment_method;

-- description was NOT NULL originally, relax it since notes are optional
ALTER TABLE public.transactions ALTER COLUMN description DROP NOT NULL;

-- New sync trigger for classes_remaining
CREATE OR REPLACE FUNCTION public.sync_classes_remaining()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta integer;
BEGIN
  delta := CASE WHEN NEW.type = 'credit' THEN NEW.classes ELSE -NEW.classes END;
  IF NEW.child_id IS NOT NULL THEN
    UPDATE public.children
      SET classes_remaining = COALESCE(classes_remaining,0) + delta
      WHERE id = NEW.child_id;
  ELSE
    UPDATE public.profiles
      SET classes_remaining = COALESCE(classes_remaining,0) + delta
      WHERE id = NEW.member_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_transaction_insert
AFTER INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.sync_classes_remaining();

-- Update RLS: only staff can insert
DROP POLICY IF EXISTS "own txns insert" ON public.transactions;
CREATE POLICY "staff can insert txns" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'staff'));
