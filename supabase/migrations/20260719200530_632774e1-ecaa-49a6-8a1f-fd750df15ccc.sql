
CREATE OR REPLACE FUNCTION public.set_my_email_verified()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  UPDATE public.profiles
     SET is_verified = true,
         trust_level = GREATEST(COALESCE(trust_level,0), 1)
   WHERE id = auth.uid();
END; $$;

GRANT EXECUTE ON FUNCTION public.set_my_email_verified() TO authenticated;
