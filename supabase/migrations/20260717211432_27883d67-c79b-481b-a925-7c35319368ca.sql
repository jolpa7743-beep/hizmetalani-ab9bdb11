
-- =========================================
-- 1) promotion_packages
-- =========================================
CREATE TABLE public.promotion_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('featured','showcase','urgent','top')),
  duration_hours integer NOT NULL CHECK (duration_hours > 0),
  price_try numeric(10,2) NOT NULL CHECK (price_try >= 0),
  boost_score integer NOT NULL DEFAULT 0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promotion_packages TO anon, authenticated;
GRANT ALL ON public.promotion_packages TO service_role;
ALTER TABLE public.promotion_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY pkg_public_read ON public.promotion_packages FOR SELECT TO anon, authenticated USING (is_active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY pkg_admin_write ON public.promotion_packages FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_pkg_updated_at BEFORE UPDATE ON public.promotion_packages FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed packages
INSERT INTO public.promotion_packages (name, kind, duration_hours, price_try, boost_score, description, sort_order) VALUES
 ('24 Saat Vitrin', 'featured', 24, 20.00, 100, 'İlanınız 24 saat boyunca ana sayfa vitrininde yer alır.', 10),
 ('7 Gün Vitrin', 'featured', 168, 90.00, 100, 'İlanınız 7 gün boyunca ana sayfa vitrininde yer alır.', 20),
 ('3 Gün Öne Çıkan', 'showcase', 72, 25.00, 50, 'İlanınız 3 gün boyunca arama sonuçlarında üst sıralarda gösterilir.', 30),
 ('7 Gün Öne Çıkan', 'showcase', 168, 50.00, 50, 'İlanınız 7 gün boyunca arama sonuçlarında üst sıralarda gösterilir.', 40),
 ('3 Gün Acil', 'urgent', 72, 15.00, 20, 'İlanınız "Acil" rozetiyle vurgulanır.', 50);

-- =========================================
-- 2) listings promotion columns
-- =========================================
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz,
  ADD COLUMN IF NOT EXISTS is_showcase boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS showcase_until timestamptz,
  ADD COLUMN IF NOT EXISTS urgent_until timestamptz,
  ADD COLUMN IF NOT EXISTS boost_score integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_listings_boost ON public.listings (is_featured DESC, is_showcase DESC, boost_score DESC, created_at DESC);

-- =========================================
-- 3) listing_promotions
-- =========================================
CREATE TABLE public.listing_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.promotion_packages(id),
  kind text NOT NULL,
  starts_at timestamptz,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','cancelled')),
  price_try numeric(10,2) NOT NULL,
  payment_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.listing_promotions TO authenticated;
GRANT ALL ON public.listing_promotions TO service_role;
ALTER TABLE public.listing_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY lp_owner_read ON public.listing_promotions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY lp_owner_insert ON public.listing_promotions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY lp_admin_update ON public.listing_promotions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_lp_updated_at BEFORE UPDATE ON public.listing_promotions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_lp_listing ON public.listing_promotions (listing_id);
CREATE INDEX idx_lp_user ON public.listing_promotions (user_id);
CREATE INDEX idx_lp_ends ON public.listing_promotions (ends_at) WHERE status = 'active';

-- =========================================
-- 4) payments
-- =========================================
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_try numeric(10,2) NOT NULL,
  method text NOT NULL CHECK (method IN ('shopier','bank_transfer','manual')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded','cancelled')),
  reference text UNIQUE NOT NULL DEFAULT ('HZM-' || upper(substring(replace(gen_random_uuid()::text,'-','') from 1 for 10))),
  external_id text,
  promotion_id uuid REFERENCES public.listing_promotions(id) ON DELETE SET NULL,
  bank_note text,
  admin_note text,
  raw jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY pay_owner_read ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY pay_owner_insert ON public.payments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY pay_admin_update ON public.payments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_pay_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_pay_user ON public.payments (user_id, created_at DESC);
CREATE INDEX idx_pay_status ON public.payments (status, created_at DESC);

ALTER TABLE public.listing_promotions
  ADD CONSTRAINT lp_payment_fk FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;

-- =========================================
-- 5) bank_accounts
-- =========================================
CREATE TABLE public.bank_accounts (
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
CREATE POLICY bank_public_read ON public.bank_accounts FOR SELECT TO anon, authenticated USING (is_active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY bank_admin_write ON public.bank_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_bank_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================
-- 6) shopier_settings
-- =========================================
CREATE TABLE public.shopier_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_enabled boolean NOT NULL DEFAULT false,
  test_mode boolean NOT NULL DEFAULT true,
  api_key text,
  api_secret text,
  website_index integer DEFAULT 1,
  callback_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.shopier_settings TO authenticated;
GRANT ALL ON public.shopier_settings TO service_role;
ALTER TABLE public.shopier_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY shopier_admin_all ON public.shopier_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_shopier_updated_at BEFORE UPDATE ON public.shopier_settings FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
INSERT INTO public.shopier_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- =========================================
-- 7) sponsor_ads
-- =========================================
CREATE TABLE public.sponsor_ads (
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
GRANT SELECT ON public.sponsor_ads TO anon, authenticated;
GRANT ALL ON public.sponsor_ads TO service_role;
ALTER TABLE public.sponsor_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY ad_public_read ON public.sponsor_ads FOR SELECT TO anon, authenticated USING (
  is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now())
  OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY ad_admin_write ON public.sponsor_ads FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_ad_updated_at BEFORE UPDATE ON public.sponsor_ads FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_ad_slot_active ON public.sponsor_ads (slot, is_active, priority DESC);

-- =========================================
-- 8) RPCs
-- =========================================

-- Kullanıcının kendi ilanı için pending promosyon oluşturur; payment yaratır.
CREATE OR REPLACE FUNCTION public.create_promotion_order(
  _listing_id uuid,
  _package_id uuid,
  _method text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _pkg public.promotion_packages%ROWTYPE;
  _listing public.listings%ROWTYPE;
  _promo_id uuid;
  _pay_id uuid;
  _ref text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Giriş gerekli'; END IF;
  IF _method NOT IN ('shopier','bank_transfer') THEN RAISE EXCEPTION 'Geçersiz ödeme yöntemi'; END IF;
  SELECT * INTO _listing FROM public.listings WHERE id = _listing_id;
  IF _listing.user_id IS DISTINCT FROM _uid THEN RAISE EXCEPTION 'İlan size ait değil'; END IF;
  SELECT * INTO _pkg FROM public.promotion_packages WHERE id = _package_id AND is_active = true;
  IF _pkg.id IS NULL THEN RAISE EXCEPTION 'Paket bulunamadı'; END IF;

  INSERT INTO public.listing_promotions (listing_id, user_id, package_id, kind, price_try, status)
  VALUES (_listing_id, _uid, _package_id, _pkg.kind, _pkg.price_try, 'pending')
  RETURNING id INTO _promo_id;

  INSERT INTO public.payments (user_id, amount_try, method, status, promotion_id)
  VALUES (_uid, _pkg.price_try, _method, 'pending', _promo_id)
  RETURNING id, reference INTO _pay_id, _ref;

  UPDATE public.listing_promotions SET payment_id = _pay_id WHERE id = _promo_id;

  RETURN jsonb_build_object('promotion_id', _promo_id, 'payment_id', _pay_id, 'reference', _ref, 'amount', _pkg.price_try, 'method', _method);
END; $$;
REVOKE EXECUTE ON FUNCTION public.create_promotion_order(uuid,uuid,text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_promotion_order(uuid,uuid,text) TO authenticated;

-- Ödeme paid işaretleyip promosyonu aktif eder (admin veya webhook)
CREATE OR REPLACE FUNCTION public.activate_paid_promotion(_payment_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _pay public.payments%ROWTYPE;
  _promo public.listing_promotions%ROWTYPE;
  _pkg public.promotion_packages%ROWTYPE;
  _start timestamptz := now();
  _end timestamptz;
BEGIN
  SELECT * INTO _pay FROM public.payments WHERE id = _payment_id FOR UPDATE;
  IF _pay.id IS NULL THEN RAISE EXCEPTION 'Ödeme bulunamadı'; END IF;
  IF _pay.status = 'paid' THEN RETURN; END IF;

  UPDATE public.payments SET status = 'paid', paid_at = now() WHERE id = _payment_id;

  IF _pay.promotion_id IS NULL THEN RETURN; END IF;
  SELECT * INTO _promo FROM public.listing_promotions WHERE id = _pay.promotion_id FOR UPDATE;
  SELECT * INTO _pkg FROM public.promotion_packages WHERE id = _promo.package_id;
  _end := _start + (_pkg.duration_hours || ' hours')::interval;

  UPDATE public.listing_promotions
    SET status = 'active', starts_at = _start, ends_at = _end
    WHERE id = _promo.id;

  IF _pkg.kind = 'featured' THEN
    UPDATE public.listings SET is_featured = true, featured_until = _end,
      boost_score = GREATEST(boost_score, _pkg.boost_score)
      WHERE id = _promo.listing_id;
  ELSIF _pkg.kind = 'showcase' THEN
    UPDATE public.listings SET is_showcase = true, showcase_until = _end,
      boost_score = GREATEST(boost_score, _pkg.boost_score)
      WHERE id = _promo.listing_id;
  ELSIF _pkg.kind = 'urgent' THEN
    UPDATE public.listings SET is_urgent = true, urgent_until = _end
      WHERE id = _promo.listing_id;
  ELSIF _pkg.kind = 'top' THEN
    UPDATE public.listings SET boost_score = GREATEST(boost_score, _pkg.boost_score)
      WHERE id = _promo.listing_id;
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.activate_paid_promotion(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_paid_promotion(uuid) TO authenticated;

-- Admin: bekleyen havaleyi onayla
CREATE OR REPLACE FUNCTION public.admin_approve_bank_payment(_payment_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.payments SET admin_note = COALESCE(_note, admin_note) WHERE id = _payment_id;
  PERFORM public.activate_paid_promotion(_payment_id);
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_approve_bank_payment(uuid,text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_bank_payment(uuid,text) TO authenticated;

-- Admin: ödemeyi reddet
CREATE OR REPLACE FUNCTION public.admin_reject_payment(_payment_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pay public.payments%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO _pay FROM public.payments WHERE id = _payment_id;
  UPDATE public.payments SET status = 'failed', admin_note = COALESCE(_note, admin_note) WHERE id = _payment_id;
  IF _pay.promotion_id IS NOT NULL THEN
    UPDATE public.listing_promotions SET status = 'cancelled' WHERE id = _pay.promotion_id;
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_reject_payment(uuid,text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reject_payment(uuid,text) TO authenticated;

-- Süresi dolmuş promosyonları temizle (cron ile çağrılır)
CREATE OR REPLACE FUNCTION public.expire_promotions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  UPDATE public.listings SET is_featured = false WHERE is_featured = true AND featured_until IS NOT NULL AND featured_until < now();
  UPDATE public.listings SET is_showcase = false WHERE is_showcase = true AND showcase_until IS NOT NULL AND showcase_until < now();
  UPDATE public.listings SET is_urgent = false WHERE is_urgent = true AND urgent_until IS NOT NULL AND urgent_until < now();
  UPDATE public.listings SET boost_score = 0
    WHERE boost_score > 0
      AND (featured_until IS NULL OR featured_until < now())
      AND (showcase_until IS NULL OR showcase_until < now());
  UPDATE public.listing_promotions SET status = 'expired' WHERE status = 'active' AND ends_at IS NOT NULL AND ends_at < now();
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END; $$;
REVOKE EXECUTE ON FUNCTION public.expire_promotions() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_promotions() TO service_role;

-- Sponsor reklam sayaç arttırma (public)
CREATE OR REPLACE FUNCTION public.track_ad_event(_ad_id uuid, _event text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _event = 'impression' THEN
    UPDATE public.sponsor_ads SET impressions = impressions + 1 WHERE id = _ad_id;
  ELSIF _event = 'click' THEN
    UPDATE public.sponsor_ads SET clicks = clicks + 1 WHERE id = _ad_id;
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.track_ad_event(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_ad_event(uuid,text) TO anon, authenticated;

-- Admin: bekleyen ödemeleri listele
CREATE OR REPLACE FUNCTION public.admin_list_payments(_status text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC),'[]'::jsonb) INTO result FROM (
    SELECT p.id, p.user_id, p.amount_try, p.method, p.status, p.reference, p.external_id,
      p.bank_note, p.admin_note, p.promotion_id, p.created_at, p.paid_at,
      pr.full_name AS user_name,
      pkg.name AS package_name,
      lp.listing_id,
      l.title AS listing_title
    FROM public.payments p
    LEFT JOIN public.profiles pr ON pr.id = p.user_id
    LEFT JOIN public.listing_promotions lp ON lp.id = p.promotion_id
    LEFT JOIN public.promotion_packages pkg ON pkg.id = lp.package_id
    LEFT JOIN public.listings l ON l.id = lp.listing_id
    WHERE (_status IS NULL OR p.status = _status)
  ) t;
  RETURN result;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_list_payments(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_payments(text) TO authenticated;
