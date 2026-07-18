
-- 1) Remove permissive SELECT policy on base profiles table
DROP POLICY IF EXISTS "Public can view profiles via public view" ON public.profiles;

-- 2) Make profiles_public view use definer semantics so anon can read safe columns
--    without needing a permissive policy on the base table
ALTER VIEW public.profiles_public SET (security_invoker = off);

-- Ensure grants on the safe view remain in place
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- 3) Add a default deny-all baseline on storage.objects so future buckets
--    don't accidentally expose data if policies are misconfigured.
--    (Private buckets today still fail closed; this makes intent explicit.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Deny all by default'
  ) THEN
    CREATE POLICY "Deny all by default"
      ON storage.objects
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END $$;
