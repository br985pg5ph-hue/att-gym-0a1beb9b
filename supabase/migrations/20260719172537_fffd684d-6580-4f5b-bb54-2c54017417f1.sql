
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('member', 'staff');
CREATE TYPE public.class_type AS ENUM ('pt', 'women_only', 'mixed', 'kids');
CREATE TYPE public.booking_status AS ENUM ('upcoming', 'completed', 'cancelled');
CREATE TYPE public.txn_type AS ENUM ('credit', 'debit');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  role app_role NOT NULL DEFAULT 'member',
  membership_status TEXT NOT NULL DEFAULT 'active',
  wallet_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 8)),
  streak INT NOT NULL DEFAULT 0,
  classes_attended INT NOT NULL DEFAULT 0,
  interests TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ ROLE HELPER ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = _role)
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ COACHES ============
CREATE TABLE public.coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  photo_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaches TO authenticated;
GRANT ALL ON public.coaches TO service_role;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coaches read all" ON public.coaches FOR SELECT TO authenticated USING (true);
CREATE POLICY "coaches staff write" ON public.coaches FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "coaches staff update" ON public.coaches FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "coaches staff delete" ON public.coaches FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'staff'));

-- ============ CLASSES ============
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type class_type NOT NULL,
  coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  duration_min INT NOT NULL DEFAULT 60,
  capacity INT NOT NULL DEFAULT 15,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "classes read all" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "classes staff insert" ON public.classes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "classes staff update" ON public.classes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "classes staff delete" ON public.classes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'staff'));

-- ============ BOOKINGS ============
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  status booking_status NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, class_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bookings read" ON public.bookings FOR SELECT TO authenticated
  USING (member_id = auth.uid() OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "own bookings insert" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (member_id = auth.uid());
CREATE POLICY "own bookings update" ON public.bookings FOR UPDATE TO authenticated
  USING (member_id = auth.uid() OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "own bookings delete" ON public.bookings FOR DELETE TO authenticated
  USING (member_id = auth.uid() OR public.has_role(auth.uid(), 'staff'));

-- Capacity check trigger
CREATE OR REPLACE FUNCTION public.check_class_capacity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  cap INT;
  cnt INT;
BEGIN
  IF NEW.status = 'upcoming' THEN
    SELECT capacity INTO cap FROM public.classes WHERE id = NEW.class_id FOR UPDATE;
    SELECT count(*) INTO cnt FROM public.bookings WHERE class_id = NEW.class_id AND status = 'upcoming' AND id <> COALESCE(NEW.id, gen_random_uuid());
    IF cnt >= cap THEN
      RAISE EXCEPTION 'Class is full';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER bookings_capacity_check BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_class_capacity();

-- ============ ANNOUNCEMENTS ============
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag TEXT NOT NULL DEFAULT 'News',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcements read all" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "announcements staff insert" ON public.announcements FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "announcements staff update" ON public.announcements FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "announcements staff delete" ON public.announcements FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'staff'));

-- ============ TRANSACTIONS ============
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  type txn_type NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own txns read" ON public.transactions FOR SELECT TO authenticated
  USING (member_id = auth.uid() OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "own txns insert" ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (member_id = auth.uid());

-- Wallet balance sync
CREATE OR REPLACE FUNCTION public.sync_wallet_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + CASE WHEN NEW.type = 'credit' THEN NEW.amount ELSE -NEW.amount END
  WHERE id = NEW.member_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_transaction_insert AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_wallet_balance();

-- ============ GYM INFO ============
CREATE TABLE public.gym_info (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name TEXT NOT NULL DEFAULT 'ATT Academy',
  address TEXT NOT NULL,
  lat NUMERIC(9,6) NOT NULL,
  lng NUMERIC(9,6) NOT NULL,
  phone TEXT NOT NULL,
  hours JSONB NOT NULL DEFAULT '[]'::jsonb
);
GRANT SELECT ON public.gym_info TO authenticated;
GRANT UPDATE ON public.gym_info TO authenticated;
GRANT ALL ON public.gym_info TO service_role;
ALTER TABLE public.gym_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gym read all" ON public.gym_info FOR SELECT TO authenticated USING (true);
CREATE POLICY "gym staff update" ON public.gym_info FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'staff'));

-- ============ SEED DATA ============
INSERT INTO public.gym_info (id, name, address, lat, lng, phone, hours) VALUES (
  1, 'ATT Academy', 'Antelias Highway, Metn, Lebanon', 33.913840, 35.591670, '+961 70 000 000',
  '[
    {"day":"Monday","open":"06:00","close":"22:00"},
    {"day":"Tuesday","open":"06:00","close":"22:00"},
    {"day":"Wednesday","open":"06:00","close":"22:00"},
    {"day":"Thursday","open":"06:00","close":"22:00"},
    {"day":"Friday","open":"06:00","close":"22:00"},
    {"day":"Saturday","open":"08:00","close":"20:00"},
    {"day":"Sunday","open":"09:00","close":"14:00"}
  ]'::jsonb
);

INSERT INTO public.coaches (name, specialty, bio, sort_order) VALUES
  ('Coach Rami', 'Head Muay Thai Coach', 'Former national champion with 15+ years training fighters across Lebanon and Thailand.', 1),
  ('Coach Lara', 'Women''s Program Lead', 'Certified strength coach specializing in women-only Muay Thai and functional training.', 2),
  ('Coach Ziad', 'MMA & Grappling', 'BJJ black belt bringing ground-game and MMA integration to ATT.', 3),
  ('Coach Nour', 'Kids Program', 'Youth movement specialist making martial arts fun, safe, and disciplined for kids 6-14.', 4);

-- Seed 14 days of classes
DO $$
DECLARE
  d INT;
  coach_r UUID; coach_l UUID; coach_z UUID; coach_n UUID;
BEGIN
  SELECT id INTO coach_r FROM public.coaches WHERE name = 'Coach Rami';
  SELECT id INTO coach_l FROM public.coaches WHERE name = 'Coach Lara';
  SELECT id INTO coach_z FROM public.coaches WHERE name = 'Coach Ziad';
  SELECT id INTO coach_n FROM public.coaches WHERE name = 'Coach Nour';
  FOR d IN 0..13 LOOP
    INSERT INTO public.classes (type, coach_id, starts_at, duration_min, capacity, title) VALUES
      ('mixed',       coach_r, (CURRENT_DATE + d)::timestamp + interval '7 hours',  60, 20, 'Morning Muay Thai'),
      ('women_only',  coach_l, (CURRENT_DATE + d)::timestamp + interval '10 hours', 60, 15, 'Women Only Muay Thai'),
      ('kids',        coach_n, (CURRENT_DATE + d)::timestamp + interval '16 hours', 45, 15, 'Kids Program'),
      ('pt',          coach_z, (CURRENT_DATE + d)::timestamp + interval '18 hours', 60,  4, 'Personal Training'),
      ('mixed',       coach_r, (CURRENT_DATE + d)::timestamp + interval '19 hours 30 minutes', 60, 25, 'Evening Muay Thai');
  END LOOP;
END $$;

INSERT INTO public.announcements (tag, title, body) VALUES
  ('Event',   'Sparring Night This Friday', 'Open sparring for all levels from 8pm. Bring your gear and a mouthguard.'),
  ('News',    'New Women-Only Sessions', 'Additional women-only slots added every Tuesday and Thursday at 10am.'),
  ('Update',  'Kids Program Enrollment Open', 'Spots filling fast for the new kids program. Reserve on the Book tab.');
