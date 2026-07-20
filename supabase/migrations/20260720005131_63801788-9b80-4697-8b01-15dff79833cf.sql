
-- Backfill missing profile rows for existing auth users
INSERT INTO public.profiles (id, name, phone)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
       u.raw_user_meta_data->>'phone'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Ensure trigger exists for future users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
