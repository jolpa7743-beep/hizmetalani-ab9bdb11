
-- 1) is_boosted bayrağı
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS is_boosted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS boosted_until timestamptz;

-- activate_promotion güncellemesi: 'top' için is_boosted, weekly_deal için özel işlem gerekmiyor (family paket tarafında)
CREATE OR REPLACE FUNCTION public.activate_promotion(_promotion_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
    is_featured  = CASE WHEN _pkg.kind = 'featured' THEN true ELSE is_featured END,
    is_showcase  = CASE WHEN _pkg.kind = 'showcase' THEN true ELSE is_showcase END,
    is_urgent    = CASE WHEN _pkg.kind = 'urgent'   THEN true ELSE is_urgent END,
    is_boosted   = CASE WHEN _pkg.kind = 'top'      THEN true ELSE is_boosted END,
    boosted_until = CASE WHEN _pkg.kind = 'top'
                         THEN GREATEST(COALESCE(boosted_until, _end), _end)
                         ELSE boosted_until END,
    boost_score  = GREATEST(boost_score, _pkg.boost_score),
    promoted_until = GREATEST(COALESCE(promoted_until, _end), _end)
  WHERE id = _promo.listing_id;
END; $$;

-- expire_promotions güncellemesi
CREATE OR REPLACE FUNCTION public.expire_promotions()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _count integer;
BEGIN
  WITH expired AS (
    UPDATE public.listing_promotions SET status='expired'
    WHERE status='active' AND ends_at IS NOT NULL AND ends_at < now()
    RETURNING listing_id
  )
  SELECT COUNT(*) INTO _count FROM expired;

  UPDATE public.listings SET
    is_featured = false, is_showcase = false, is_urgent = false, is_boosted = false, boost_score = 0
  WHERE promoted_until IS NOT NULL AND promoted_until < now();

  RETURN _count;
END; $$;

-- 2) Bildirimler
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,          -- 'message' | 'review' | 'promotion' | 'system'
  title text NOT NULL,
  body  text,
  link  text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx  ON public.notifications(user_id) WHERE is_read = false;

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_own_select" ON public.notifications;
CREATE POLICY "notifications_own_select" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_own_update" ON public.notifications;
CREATE POLICY "notifications_own_update" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_own_delete" ON public.notifications;
CREATE POLICY "notifications_own_delete" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Insert yalnızca sistemsel: RLS insert policy YOK; service_role & security definer trigger ile eklenecek.

-- Yeni mesaj → alıcıya bildirim
CREATE OR REPLACE FUNCTION public.tg_notify_new_message()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _conv public.conversations%ROWTYPE; _recipient uuid; _sender_name text;
BEGIN
  SELECT * INTO _conv FROM public.conversations WHERE id = NEW.conversation_id;
  _recipient := CASE WHEN _conv.user_a = NEW.sender_id THEN _conv.user_b ELSE _conv.user_a END;
  IF _recipient IS NULL OR _recipient = NEW.sender_id THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, 'Bir kullanıcı') INTO _sender_name FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications (user_id, kind, title, body, link)
  VALUES (_recipient, 'message', 'Yeni mesaj: ' || _sender_name, LEFT(NEW.body, 140), '/mesajlar/' || NEW.conversation_id::text);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;
CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_message();

-- Yeni değerlendirme → değerlendirilen kullanıcıya bildirim
CREATE OR REPLACE FUNCTION public.tg_notify_new_review()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _reviewer_name text;
BEGIN
  IF NEW.reviewee_id IS NULL OR NEW.reviewee_id = NEW.reviewer_id THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, 'Bir üye') INTO _reviewer_name FROM public.profiles WHERE id = NEW.reviewer_id;
  INSERT INTO public.notifications (user_id, kind, title, body, link)
  VALUES (NEW.reviewee_id, 'review',
    _reviewer_name || ' size ' || NEW.rating::text || '★ verdi',
    LEFT(COALESCE(NEW.comment,''), 140),
    '/uye/' || NEW.reviewee_id::text);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_new_review ON public.reviews;
CREATE TRIGGER trg_notify_new_review
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_review();

-- Sayaç
CREATE OR REPLACE FUNCTION public.notifications_unread_count()
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COUNT(*)::int FROM public.notifications WHERE user_id = auth.uid() AND is_read = false;
$$;

CREATE OR REPLACE FUNCTION public.mark_notifications_read(_ids uuid[] DEFAULT NULL)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _n integer;
BEGIN
  IF _ids IS NULL THEN
    UPDATE public.notifications SET is_read = true WHERE user_id = auth.uid() AND is_read = false;
  ELSE
    UPDATE public.notifications SET is_read = true WHERE user_id = auth.uid() AND id = ANY(_ids);
  END IF;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END; $$;

REVOKE EXECUTE ON FUNCTION public.notifications_unread_count() FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.notifications_unread_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated;
