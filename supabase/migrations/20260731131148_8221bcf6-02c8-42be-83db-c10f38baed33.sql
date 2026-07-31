ALTER TABLE public.gyms ADD COLUMN IF NOT EXISTS waiver_text text NOT NULL DEFAULT '';

ALTER TABLE public.gym_members
  ADD COLUMN IF NOT EXISTS waiver_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS waiver_name text;

CREATE OR REPLACE FUNCTION public.join_gym_by_code(_code text, _referral text DEFAULT NULL::text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller uuid := auth.uid();
  g RECORD;
  ref_id uuid;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _code IS NULL OR length(trim(_code)) = 0 THEN RAISE EXCEPTION 'Enter a gym code'; END IF;

  SELECT gy.* INTO g
  FROM public.gym_join_settings s
  JOIN public.gyms gy ON gy.id = s.gym_id
  WHERE upper(trim(s.join_code)) = upper(trim(_code))
  LIMIT 1;

  IF NOT FOUND THEN RAISE EXCEPTION 'That gym code is not correct'; END IF;
  IF g.status = 'suspended' THEN RAISE EXCEPTION 'This gym is not accepting members right now'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.gym_members WHERE user_id = caller AND gym_id = g.id) THEN
    IF _referral IS NOT NULL AND length(trim(_referral)) > 0 THEN
      SELECT user_id INTO ref_id FROM public.gym_members
        WHERE gym_id = g.id AND referral_code = upper(trim(_referral)) LIMIT 1;
    END IF;
    INSERT INTO public.gym_members (user_id, gym_id, referred_by) VALUES (caller, g.id, ref_id);
  END IF;

  UPDATE public.profiles SET active_gym_id = g.id WHERE id = caller;
  RETURN g.slug;
END; $$;

CREATE OR REPLACE FUNCTION public.sign_waiver(_gym_id uuid, _name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _name IS NULL OR length(trim(_name)) < 2 THEN RAISE EXCEPTION 'Type your full name to sign'; END IF;
  UPDATE public.gym_members
    SET waiver_signed_at = now(), waiver_name = left(trim(_name), 120)
    WHERE user_id = caller AND gym_id = _gym_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'You are not a member of that gym'; END IF;
END; $$;