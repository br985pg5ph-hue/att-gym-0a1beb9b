
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_reward_granted boolean NOT NULL DEFAULT false;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'staff' CHECK (source IN ('staff', 'referral'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_code text := NEW.raw_user_meta_data->>'referral_code';
  ref_id uuid;
BEGIN
  IF ref_code IS NOT NULL AND length(ref_code) > 0 THEN
    SELECT id INTO ref_id FROM public.profiles WHERE referral_code = ref_code LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, name, phone, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    ref_id
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_referral_reward()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_id uuid;
  already_granted boolean;
BEGIN
  SELECT referred_by, referral_reward_granted
    INTO ref_id, already_granted
    FROM public.profiles
   WHERE id = NEW.member_id;

  IF ref_id IS NOT NULL AND already_granted = false THEN
    UPDATE public.profiles
       SET referral_reward_granted = true
     WHERE id = NEW.member_id;

    INSERT INTO public.transactions (member_id, classes, type, source, description)
    VALUES (
      ref_id,
      1,
      'credit',
      'referral',
      'Referral reward — a friend you invited booked their first class'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_booking_grant_referral ON public.bookings;
CREATE TRIGGER on_booking_grant_referral
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.grant_referral_reward();

CREATE OR REPLACE FUNCTION public.get_referral_stats()
RETURNS TABLE(joined bigint, rewards bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.profiles WHERE referred_by = auth.uid()),
    (SELECT count(*) FROM public.transactions WHERE member_id = auth.uid() AND source = 'referral');
$$;

GRANT EXECUTE ON FUNCTION public.get_referral_stats() TO authenticated;
