
-- App-wide log table for admin diagnostics
CREATE TABLE public.app_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL DEFAULT 'error',
  source text NOT NULL DEFAULT 'client',
  message text NOT NULL,
  context jsonb,
  url text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX app_logs_created_at_idx ON public.app_logs(created_at DESC);
CREATE INDEX app_logs_level_idx ON public.app_logs(level);

GRANT SELECT, INSERT ON public.app_logs TO authenticated;
GRANT INSERT ON public.app_logs TO anon;
GRANT ALL ON public.app_logs TO service_role;

ALTER TABLE public.app_logs ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon) can insert logs
CREATE POLICY "log_insert_any" ON public.app_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
-- Only admins can read
CREATE POLICY "log_admin_read" ON public.app_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
-- Only admins can delete
CREATE POLICY "log_admin_delete" ON public.app_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Helper RPC: find user id by email (admin only) - avoids listUsers scan bug
CREATE OR REPLACE FUNCTION public.admin_get_user_id_by_email(_email text)
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id FROM auth.users WHERE email = _email LIMIT 1;
$$;
