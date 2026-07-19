
CREATE OR REPLACE FUNCTION public.public_weekly_deal_listings()
 RETURNS TABLE(listing_id uuid, ends_at timestamptz)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT lp.listing_id, lp.ends_at
  FROM public.listing_promotions lp
  JOIN public.promotion_packages pk ON pk.id = lp.package_id
  WHERE lp.status = 'active'
    AND pk.family = 'weekly_deal'
    AND (lp.ends_at IS NULL OR lp.ends_at > now());
$$;

REVOKE EXECUTE ON FUNCTION public.public_weekly_deal_listings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_weekly_deal_listings() TO anon, authenticated;
