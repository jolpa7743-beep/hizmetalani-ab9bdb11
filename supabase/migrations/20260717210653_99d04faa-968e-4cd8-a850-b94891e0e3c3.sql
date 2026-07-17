
-- 1) Fix SECURITY DEFINER view: switch to security_invoker
ALTER VIEW public.profiles_public SET (security_invoker = true);

-- 2) Fix app_logs INSERT policy to prevent user_id spoofing
DROP POLICY IF EXISTS log_insert_any ON public.app_logs;
CREATE POLICY log_insert_self ON public.app_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

-- 3) Revoke EXECUTE from anon on admin SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role, boolean) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_list_review_reports() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_set_review_status(uuid, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_set_report_status(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_set_trust_level(uuid, smallint) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_set_verified(uuid, boolean) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_broadcast_dm(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_set_banned(uuid, boolean, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_list_reviews(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_recent_mod_actions(integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_moderation_inbox() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_review_stats(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_listing_view(uuid) FROM anon, PUBLIC;

-- Re-grant to authenticated where needed (admin functions self-check role internally)
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_review_reports() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_review_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_report_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_trust_level(uuid, smallint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_verified(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_broadcast_dm(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_banned(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_reviews(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_recent_mod_actions(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_moderation_inbox() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_review_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_listing_view(uuid) TO anon, authenticated;
