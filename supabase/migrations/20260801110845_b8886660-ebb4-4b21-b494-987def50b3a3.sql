CREATE TABLE public.platform_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  gym_id uuid REFERENCES public.gyms(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.platform_audit_log TO service_role;
GRANT SELECT ON public.platform_audit_log TO authenticated;

ALTER TABLE public.platform_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can read audit log"
ON public.platform_audit_log
FOR SELECT
TO authenticated
USING (public.is_platform_admin());

CREATE INDEX idx_platform_audit_log_created_at ON public.platform_audit_log(created_at DESC);
CREATE INDEX idx_platform_audit_log_gym_id ON public.platform_audit_log(gym_id);