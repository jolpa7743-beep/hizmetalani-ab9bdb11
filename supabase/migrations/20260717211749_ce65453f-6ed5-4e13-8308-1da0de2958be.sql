
-- ============================================================
-- 1) LISTINGS: promotion columns
-- ============================================================
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_showcase boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_urgent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS boost_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promoted_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_listings_boost ON public.listings (boost_score DESC, created_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_listings_featured ON public.listings (is_featured) WHERE is_featured = true;

-- ============================================================
-- 2) PROMOTION_PACKAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.promotion_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('featured','showcase','urgent','top')),
  duration_hours integer NOT NULL CHECK (duration_hours > 0),
  price_try numeric(10,2) NOT NULL CHECK (price_try >= 0),
  boost_score integer NOT NULL DEFAULT 100,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promotion_packages TO anon, authenticated;
GRANT ALL ON public.promotion_packages TO service_role;
ALTER TABLE public.promotion_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packages_public_read_active" ON public.promotion_packages FOR SELECT USING (is_active = true);
CREATE POLICY "packages_admin_read_all" ON public.promotion_packages FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "packages_admin_all" ON public.promotion_packages FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER tg_packages_updated BEFORE UPDATE ON public.promotion_packages FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- 3) BANK_ACCOUNTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  account_holder text NOT NULL,
  iban text NOT NULL,
  branch text,
  note text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bank_accounts TO anon, authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banks_public_read_active" ON public.bank_accounts FOR SELECT USING (is_active = true);
CREATE POLICY "banks_admin_read_all" ON public.bank_accounts FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "banks_admin_all" ON public.bank_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER tg_banks_updated BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- 4) LISTING_PROMOTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.listing_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  package_id uuid NOT NULL REFERENCES public.promotion_packages(id),
  starts_at timestamptz,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_promos_listing ON public.listing_promotions (listing_id);
CREATE INDEX IF NOT EXISTS idx_promos_user ON public.listing_promotions (user_id);
GRANT SELECT, INSERT, UPDATE ON public.listing_promotions TO authenticated;
GRANT ALL ON public.listing_promotions TO service_role;
ALTER TABLE public.listing_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promos_owner_read" ON public.listing_promotions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "promos_admin_write" ON public.listing_promotions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER tg_promos_updated BEFORE UPDATE ON public.listing_promotions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- 5) PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_try numeric(10,2) NOT NULL,
  method text NOT NULL CHECK (method IN ('shopier','bank_transfer','manual')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded','cancelled')),
  reference text NOT NULL UNIQUE,
  external_id text,
  promotion_id uuid REFERENCES public.listing_promotions(id) ON DELETE SET NULL,
  bank_note text,
  admin_note text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments (status, created_at DESC);
GRANT SELECT, INSERT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_owner_read" ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "payments_admin_write" ON public.payments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER tg_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- 6) SHOPIER_SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shopier_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_enabled boolean NOT NULL DEFAULT false,
  test_mode boolean NOT NULL DEFAULT true,
  api_key text,
  api_secret text,
  website_index integer,
  callback_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.shopier_settings TO authenticated;
GRANT ALL ON public.shopier_settings TO service_role;
ALTER TABLE public.shopier_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shopier_admin_read" ON public.shopier_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "shopier_admin_write" ON public.shopier_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.shopier_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============================================================
-- 7) SPONSOR_ADS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sponsor_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot text NOT NULL CHECK (slot IN ('header','sidebar','footer','in_article','home_hero','listing_inline')),
  title text NOT NULL,
  sponsor_name text,
  image_url text NOT NULL,
  target_url text NOT NULL,
  alt_text text,
  priority integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ads_slot ON public.sponsor_ads (slot, is_active, priority DESC);
GRANT SELECT ON public.sponsor_ads TO anon, authenticated;
GRANT ALL ON public.sponsor_ads TO service_role;
ALTER TABLE public.sponsor_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads_public_read_active" ON public.sponsor_ads FOR SELECT USING (is_active = true);
CREATE POLICY "ads_admin_read_all" ON public.sponsor_ads FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "ads_admin_all" ON public.sponsor_ads FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER tg_ads_updated BEFORE UPDATE ON public.sponsor_ads FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- 8) RPC: create_promotion_order
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_promotion_order(
  _listing_id uuid, _package_id uuid, _method text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user uuid := auth.uid();
  _pkg public.promotion_packages%ROWTYPE;
  _promo_id uuid;
  _pay_id uuid;
  _ref text;
  _owner uuid;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF _method NOT IN ('shopier','bank_transfer') THEN RAISE EXCEPTION 'Invalid method'; END IF;
  SELECT user_id INTO _owner FROM public.listings WHERE id = _listing_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF;
  IF _owner <> _user THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO _pkg FROM public.promotion_packages WHERE id = _package_id AND is_active = true;
  IF _pkg.id IS NULL THEN RAISE EXCEPTION 'Package not available'; END IF;

  INSERT INTO public.listing_promotions (listing_id, user_id, package_id, status)
  VALUES (_listing_id, _user, _package_id, 'pending') RETURNING id INTO _promo_id;

  _ref := 'HA-' || upper(substr(replace(_promo_id::text,'-',''),1,8));
  INSERT INTO public.payments (user_id, amount_try, method, status, reference, promotion_id)
  VALUES (_user, _pkg.price_try, _method, 'pending', _ref, _promo_id) RETURNING id INTO _pay_id;

  RETURN jsonb_build_object(
    'promotion_id', _promo_id, 'payment_id', _pay_id,
    'reference', _ref, 'amount', _pkg.price_try, 'method', _method
  );
END; $$;
REVOKE ALL ON FUNCTION public.create_promotion_order(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_promotion_order(uuid,uuid,text) TO authenticated;

-- ============================================================
-- 9) RPC: activate_promotion (applies flags to listing)
-- ============================================================
CREATE OR REPLACE FUNCTION public.activate_promotion(_promotion_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _promo public.listing_promotions%ROWTYPE;
  _pkg public.promotion_packages%ROWTYPE;
  _end timestamptz;
BEGIN
  SELECT * INTO _promo FROM public.listing_promotions WHERE id = _promotion_id;
  IF _promo.id IS NULL THEN RAISE EXCEPTION 'Promotion not found'; END IF;
  SELECT * INTO _pkg FROM public.promotion_packages WHERE id = _promo.package_id;
  _end := now() + make_interval(hours => _pkg.duration_hours);

  UPDATE public.listing_promotions
    SET status = 'active', starts_at = now(), ends_at = _end
    WHERE id = _promotion_id;

  UPDATE public.listings SET
    is_featured = CASE WHEN _pkg.kind = 'featured' THEN true ELSE is_featured END,
    is_showcase = CASE WHEN _pkg.kind = 'showcase' THEN true ELSE is_showcase END,
    is_urgent = CASE WHEN _pkg.kind = 'urgent' THEN true ELSE is_urgent END,
    boost_score = GREATEST(boost_score, _pkg.boost_score),
    promoted_until = GREATEST(COALESCE(promoted_until, _end), _end)
  WHERE id = _promo.listing_id;
END; $$;
REVOKE ALL ON FUNCTION public.activate_promotion(uuid) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 10) RPC: admin_list_payments
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_list_payments(_status text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC) INTO result FROM (
    SELECT p.id, p.user_id, p.amount_try, p.method, p.status, p.reference,
      p.external_id, p.promotion_id, p.bank_note, p.admin_note, p.paid_at, p.created_at,
      pr.full_name AS user_name,
      pk.name AS package_name,
      lp.listing_id,
      l.title AS listing_title
    FROM public.payments p
    LEFT JOIN public.profiles pr ON pr.id = p.user_id
    LEFT JOIN public.listing_promotions lp ON lp.id = p.promotion_id
    LEFT JOIN public.promotion_packages pk ON pk.id = lp.package_id
    LEFT JOIN public.listings l ON l.id = lp.listing_id
    WHERE (_status IS NULL OR p.status = _status)
  ) t;
  RETURN COALESCE(result, '[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.admin_list_payments(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_payments(text) TO authenticated;

-- ============================================================
-- 11) RPC: admin_approve_bank_payment / admin_reject_payment
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_approve_bank_payment(_payment_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _promo uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.payments SET status='paid', paid_at=now(), admin_note=COALESCE(_note, admin_note)
    WHERE id=_payment_id AND status IN ('pending')
    RETURNING promotion_id INTO _promo;
  IF _promo IS NOT NULL THEN PERFORM public.activate_promotion(_promo); END IF;
  INSERT INTO public.mod_actions (actor_id, target_type, target_id, action, new_status, note)
  VALUES (auth.uid(), 'payment', _payment_id, 'approve', 'paid', _note);
END; $$;
REVOKE ALL ON FUNCTION public.admin_approve_bank_payment(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_bank_payment(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reject_payment(_payment_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.payments SET status='failed', admin_note=COALESCE(_note, admin_note) WHERE id=_payment_id;
  UPDATE public.listing_promotions SET status='cancelled'
    WHERE id = (SELECT promotion_id FROM public.payments WHERE id=_payment_id);
  INSERT INTO public.mod_actions (actor_id, target_type, target_id, action, new_status, note)
  VALUES (auth.uid(), 'payment', _payment_id, 'reject', 'failed', _note);
END; $$;
REVOKE ALL ON FUNCTION public.admin_reject_payment(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reject_payment(uuid,text) TO authenticated;

-- ============================================================
-- 12) RPC: track_ad_event & expire_promotions
-- ============================================================
CREATE OR REPLACE FUNCTION public.track_ad_event(_ad_id uuid, _event text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _event = 'impression' THEN
    UPDATE public.sponsor_ads SET impressions = impressions + 1 WHERE id = _ad_id;
  ELSIF _event = 'click' THEN
    UPDATE public.sponsor_ads SET clicks = clicks + 1 WHERE id = _ad_id;
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.track_ad_event(uuid,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.expire_promotions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count integer;
BEGIN
  WITH expired AS (
    UPDATE public.listing_promotions SET status='expired'
    WHERE status='active' AND ends_at IS NOT NULL AND ends_at < now()
    RETURNING listing_id
  )
  SELECT COUNT(*) INTO _count FROM expired;

  UPDATE public.listings SET
    is_featured = false, is_showcase = false, is_urgent = false, boost_score = 0
  WHERE promoted_until IS NOT NULL AND promoted_until < now();

  RETURN _count;
END; $$;
REVOKE ALL ON FUNCTION public.expire_promotions() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 13) SEED default packages
-- ============================================================
INSERT INTO public.promotion_packages (name, kind, duration_hours, price_try, boost_score, description, sort_order) VALUES
  ('Vitrin — 24 Saat', 'featured', 24, 29.90, 1000, 'İlanınız ana sayfa vitrininde 24 saat gösterilir.', 1),
  ('Vitrin — 7 Gün', 'featured', 168, 149.90, 1000, 'Ana sayfa vitrini + arama üstünde 7 gün.', 2),
  ('Öne Çıkan — 3 Gün', 'showcase', 72, 49.90, 500, 'Kategori sayfasında öne çıkan olarak gösterilir.', 3),
  ('Acil Rozet — 3 Gün', 'urgent', 72, 19.90, 300, 'İlanınıza dikkat çeken "Acil" rozeti eklenir.', 4),
  ('Üst Sıra — 24 Saat', 'top', 24, 14.90, 200, 'Aramalarda üst sıralarda gösterilir.', 5)
ON CONFLICT DO NOTHING;
