CREATE OR REPLACE FUNCTION public.create_promotion_order(_listing_id uuid, _package_id uuid, _method text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  INSERT INTO public.listing_promotions (listing_id, user_id, package_id, kind, status)
  VALUES (_listing_id, _user, _package_id, _pkg.kind, 'pending') RETURNING id INTO _promo_id;

  _ref := 'HA-' || upper(substr(replace(_promo_id::text,'-',''),1,8));
  INSERT INTO public.payments (user_id, amount_try, method, status, reference, promotion_id)
  VALUES (_user, _pkg.price_try, _method, 'pending', _ref, _promo_id) RETURNING id INTO _pay_id;

  RETURN jsonb_build_object(
    'promotion_id', _promo_id, 'payment_id', _pay_id,
    'reference', _ref, 'amount', _pkg.price_try, 'method', _method
  );
END; $function$;