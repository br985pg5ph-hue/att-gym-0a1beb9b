DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I FROM anon;', fn.proname);
  END LOOP;
END $$;