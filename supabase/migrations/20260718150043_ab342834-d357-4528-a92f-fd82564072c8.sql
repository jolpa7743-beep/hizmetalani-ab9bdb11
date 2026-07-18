
-- 1) Fix SECURITY DEFINER view -> switch to SECURITY INVOKER
ALTER VIEW public.profiles_public SET (security_invoker = on);

-- 2) Restrict bank account details to signed-in users only (no anon)
DROP POLICY IF EXISTS bank_public_read ON public.bank_accounts;
DROP POLICY IF EXISTS banks_public_read_active ON public.bank_accounts;
DROP POLICY IF EXISTS banks_admin_read_all ON public.bank_accounts;
DROP POLICY IF EXISTS banks_admin_all ON public.bank_accounts;
DROP POLICY IF EXISTS bank_admin_write ON public.bank_accounts;

CREATE POLICY bank_authenticated_read_active ON public.bank_accounts
  FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY bank_admin_write ON public.bank_accounts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

REVOKE SELECT ON public.bank_accounts FROM anon;

-- 3) Consolidate overlapping policies on promotion_packages
DROP POLICY IF EXISTS packages_admin_all ON public.promotion_packages;
DROP POLICY IF EXISTS packages_admin_read_all ON public.promotion_packages;
DROP POLICY IF EXISTS packages_public_read_active ON public.promotion_packages;
DROP POLICY IF EXISTS pkg_admin_write ON public.promotion_packages;
DROP POLICY IF EXISTS pkg_public_read ON public.promotion_packages;

CREATE POLICY pkg_public_read ON public.promotion_packages
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY pkg_admin_write ON public.promotion_packages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 4) Consolidate overlapping policies on sponsor_ads
DROP POLICY IF EXISTS ad_admin_write ON public.sponsor_ads;
DROP POLICY IF EXISTS ad_public_read ON public.sponsor_ads;
DROP POLICY IF EXISTS ads_admin_all ON public.sponsor_ads;
DROP POLICY IF EXISTS ads_admin_read_all ON public.sponsor_ads;
DROP POLICY IF EXISTS ads_public_read_active ON public.sponsor_ads;

CREATE POLICY ad_public_read ON public.sponsor_ads
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY ad_admin_write ON public.sponsor_ads
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 5) Consolidate listing_promotions
DROP POLICY IF EXISTS lp_admin_update ON public.listing_promotions;
DROP POLICY IF EXISTS lp_owner_insert ON public.listing_promotions;
DROP POLICY IF EXISTS lp_owner_read ON public.listing_promotions;
DROP POLICY IF EXISTS promos_admin_write ON public.listing_promotions;
DROP POLICY IF EXISTS promos_owner_read ON public.listing_promotions;

CREATE POLICY lp_read ON public.listing_promotions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY lp_owner_insert ON public.listing_promotions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY lp_admin_write ON public.listing_promotions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 6) Consolidate payments
DROP POLICY IF EXISTS pay_admin_update ON public.payments;
DROP POLICY IF EXISTS pay_owner_insert ON public.payments;
DROP POLICY IF EXISTS pay_owner_read ON public.payments;
DROP POLICY IF EXISTS payments_admin_write ON public.payments;
DROP POLICY IF EXISTS payments_owner_read ON public.payments;

CREATE POLICY pay_read ON public.payments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY pay_owner_insert ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY pay_admin_write ON public.payments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
