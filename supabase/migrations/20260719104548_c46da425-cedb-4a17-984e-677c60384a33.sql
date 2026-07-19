
ALTER VIEW public.profiles_public SET (security_invoker = on);

-- Column-level SELECT on safe columns only (email, phone, etc. remain hidden)
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, full_name, avatar_url, city, district, bio, is_verified, trust_level, created_at, is_banned)
  ON public.profiles TO anon, authenticated;

-- Allow public visibility of non-banned profiles via RLS (columns still restricted by grants above)
DROP POLICY IF EXISTS "Public can view non-banned profiles" ON public.profiles;
CREATE POLICY "Public can view non-banned profiles"
ON public.profiles FOR SELECT
TO anon, authenticated
USING (is_banned = false);

GRANT SELECT ON public.profiles_public TO anon, authenticated;
