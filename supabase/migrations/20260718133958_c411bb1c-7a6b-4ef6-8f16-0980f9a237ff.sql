-- 1) Remove permissive SELECT on base profiles table
DROP POLICY IF EXISTS "Public can view profiles via public view" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;

-- 2) Explicit storage.objects policies (private buckets today, safe by default)
DROP POLICY IF EXISTS "Admins manage all storage objects" ON storage.objects;
CREATE POLICY "Admins manage all storage objects"
ON storage.objects
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Owners read own storage objects" ON storage.objects;
CREATE POLICY "Owners read own storage objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (owner = auth.uid());
