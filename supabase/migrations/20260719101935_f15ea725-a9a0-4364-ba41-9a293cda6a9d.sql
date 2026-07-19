
ALTER TABLE public.promotion_packages
  ADD COLUMN IF NOT EXISTS family text,
  ADD COLUMN IF NOT EXISTS original_price_try numeric(10,2);

-- Sadece hiçbir aktif promosyon/ödemeyle ilişkisi olmayan eski paketleri temizle
DELETE FROM public.promotion_packages
WHERE id NOT IN (SELECT DISTINCT package_id FROM public.listing_promotions WHERE package_id IS NOT NULL);

-- Yeni paketler
INSERT INTO public.promotion_packages
  (name, kind, family, duration_hours, price_try, original_price_try, boost_score, description, is_active, sort_order)
VALUES
  -- 1) Arama Vitrin İlanı
  ('Arama Vitrin - 1 Gün',  'featured', 'search_showcase',  24, 15.00,  30.00, 700, 'İlanınızı "Arama" kutusunda en üstte sergileyin. %70 daha fazla görüntülenme.', true, 101),
  ('Arama Vitrin - 3 Gün',  'featured', 'search_showcase',  72, 45.00,  90.00, 700, 'İlanınızı "Arama" kutusunda en üstte sergileyin. %70 daha fazla görüntülenme.', true, 102),
  ('Arama Vitrin - 7 Gün',  'featured', 'search_showcase', 168, 90.00, 210.00, 700, 'İlanınızı "Arama" kutusunda en üstte sergileyin. %70 daha fazla görüntülenme.', true, 103),

  -- 2) Haftanın Fırsatı
  ('Haftanın Fırsatı - 7 Gün', 'featured', 'weekly_deal', 168, 50.00, 100.00, 800, 'Haftanın Fırsatları sayfasında listelenir. Pazartesi 00:00 itibarıyla aktifleşir.', true, 201),

  -- 3) Vitrin İlanı
  ('Vitrin - 1 Gün',  'featured', 'home_showcase',  24,  18.00, NULL, 1000, 'Ana sayfa vitrininde sergilenir.', true, 301),
  ('Vitrin - 2 Gün',  'featured', 'home_showcase',  48,  36.00, NULL, 1000, 'Ana sayfa vitrininde sergilenir.', true, 302),
  ('Vitrin - 3 Gün',  'featured', 'home_showcase',  72,  54.00, NULL, 1000, 'Ana sayfa vitrininde sergilenir.', true, 303),
  ('Vitrin - 7 Gün',  'featured', 'home_showcase', 168, 115.00, NULL, 1000, 'Ana sayfa vitrininde sergilenir.', true, 304),
  ('Vitrin - 14 Gün', 'featured', 'home_showcase', 336, 210.00, NULL, 1000, 'Ana sayfa vitrininde sergilenir.', true, 305),
  ('Vitrin - 30 Gün', 'featured', 'home_showcase', 720, 375.00, NULL, 1000, 'Ana sayfa vitrininde sergilenir.', true, 306),

  -- 4) Sohbet & Bildirim Vitrin
  ('Sohbet & Bildirim Vitrin - 1 Gün',  'showcase', 'chat_showcase',  24,  12.00, NULL, 400, 'Mesajlar ve bildirimler sayfasının altında listelenir. %75 daha fazla görüntülenme.', true, 401),
  ('Sohbet & Bildirim Vitrin - 2 Gün',  'showcase', 'chat_showcase',  48,  21.50, NULL, 400, 'Mesajlar ve bildirimler sayfasının altında listelenir. %75 daha fazla görüntülenme.', true, 402),
  ('Sohbet & Bildirim Vitrin - 3 Gün',  'showcase', 'chat_showcase',  72,  33.50, NULL, 400, 'Mesajlar ve bildirimler sayfasının altında listelenir. %75 daha fazla görüntülenme.', true, 403),
  ('Sohbet & Bildirim Vitrin - 7 Gün',  'showcase', 'chat_showcase', 168,  60.00, NULL, 400, 'Mesajlar ve bildirimler sayfasının altında listelenir. %75 daha fazla görüntülenme.', true, 404),
  ('Sohbet & Bildirim Vitrin - 30 Gün', 'showcase', 'chat_showcase', 720, 150.00, NULL, 400, 'Mesajlar ve bildirimler sayfasının altında listelenir. %75 daha fazla görüntülenme.', true, 405),

  -- 5) Pazar Vitrini
  ('Pazar Vitrini - 1 Gün',  'showcase', 'market_showcase',  24,   9.00, NULL, 300, 'İlan Pazarı sayfasında en üstte sergilenir. %70 daha fazla görüntülenme.', true, 501),
  ('Pazar Vitrini - 2 Gün',  'showcase', 'market_showcase',  48,  15.00, NULL, 300, 'İlan Pazarı sayfasında en üstte sergilenir.', true, 502),
  ('Pazar Vitrini - 3 Gün',  'showcase', 'market_showcase',  72,  25.00, NULL, 300, 'İlan Pazarı sayfasında en üstte sergilenir.', true, 503),
  ('Pazar Vitrini - 7 Gün',  'showcase', 'market_showcase', 168,  45.00, NULL, 300, 'İlan Pazarı sayfasında en üstte sergilenir.', true, 504),
  ('Pazar Vitrini - 30 Gün', 'showcase', 'market_showcase', 720, 110.00, NULL, 300, 'İlan Pazarı sayfasında en üstte sergilenir.', true, 505),

  -- 6) İlanını Öne Çıkar
  ('Öne Çıkar - 1 Gün',  'top', 'boost',  24,  13.00, NULL, 200, 'Öne çıkarılan ilanlar %80 daha hızlı satılır. Organik sırada kalır fakat özel stiller ile öne çıkar.', true, 601),
  ('Öne Çıkar - 2 Gün',  'top', 'boost',  48,  26.00, NULL, 200, 'Öne çıkarılan ilanlar %80 daha hızlı satılır.', true, 602),
  ('Öne Çıkar - 3 Gün',  'top', 'boost',  72,  39.00, NULL, 200, 'Öne çıkarılan ilanlar %80 daha hızlı satılır.', true, 603),
  ('Öne Çıkar - 7 Gün',  'top', 'boost', 168,  85.00, NULL, 200, 'Öne çıkarılan ilanlar %80 daha hızlı satılır.', true, 604),
  ('Öne Çıkar - 14 Gün', 'top', 'boost', 336, 150.00, NULL, 200, 'Öne çıkarılan ilanlar %80 daha hızlı satılır.', true, 605),
  ('Öne Çıkar - 30 Gün', 'top', 'boost', 720, 275.00, NULL, 200, 'Öne çıkarılan ilanlar %80 daha hızlı satılır.', true, 606);
