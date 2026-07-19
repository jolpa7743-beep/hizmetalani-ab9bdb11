
-- Fix public profile visibility. The profiles_public view was security_invoker,
-- but the base profiles table has no SELECT for anon/authenticated (except
-- owner/admin), so the view returned 0 rows for other users. Switch to
-- security_definer so the view exposes only the safe columns using the view
-- owner's privileges, and keep SELECT grants to anon/authenticated.

ALTER VIEW public.profiles_public SET (security_invoker = off);

GRANT SELECT ON public.profiles_public TO anon, authenticated;
