
-- Restrict public exposure of PII on profiles table.
-- Drop the broad public SELECT policy that exposes phone, birth_year, gender, bio etc.
DROP POLICY IF EXISTS "Public can view non-banned profiles" ON public.profiles;

-- Revoke blanket table-level SELECT from anon/authenticated (owner still reads via own policy + column grants below).
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.profiles FROM authenticated;

-- Grant column-level SELECT only for safe, public-facing columns so joins that
-- select those columns keep working under RLS for authenticated users.
GRANT SELECT (
  id, full_name, avatar_url, city, district, is_verified,
  trust_level, is_banned, created_at, updated_at, languages, skills, website
) ON public.profiles TO authenticated;

-- Anonymous visitors must read public profile data via the profiles_public view.
GRANT SELECT ON public.profiles_public TO anon;
GRANT SELECT ON public.profiles_public TO authenticated;

-- Recreate a safe public row-level policy scoped to the non-sensitive columns granted above.
CREATE POLICY "Public can view safe profile fields"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (is_banned = false);
