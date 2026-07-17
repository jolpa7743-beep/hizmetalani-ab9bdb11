
-- BLOG POSTS
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  content text NOT NULL DEFAULT '',
  cover_url text,
  category text,
  tags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  meta_title text,
  meta_description text,
  view_count integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published posts"
  ON public.blog_posts FOR SELECT
  USING (status = 'published' OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins can insert posts"
  ON public.blog_posts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins can update posts"
  ON public.blog_posts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins can delete posts"
  ON public.blog_posts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX blog_posts_status_pub_idx ON public.blog_posts (status, published_at DESC);
CREATE INDEX blog_posts_category_idx ON public.blog_posts (category);

CREATE TRIGGER blog_posts_updated BEFORE UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Increment view counter (public, safe)
CREATE OR REPLACE FUNCTION public.increment_blog_view(_slug text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.blog_posts SET view_count = view_count + 1
  WHERE slug = _slug AND status = 'published';
$$;
REVOKE ALL ON FUNCTION public.increment_blog_view(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_blog_view(text) TO anon, authenticated;

-- Admin DB row viewer helper (read-only, allowlisted)
CREATE OR REPLACE FUNCTION public.admin_table_rows(_table text, _limit int DEFAULT 100)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _sql text; _res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _table !~ '^[a-z_][a-z0-9_]*$' THEN RAISE EXCEPTION 'Invalid table name'; END IF;
  IF _table NOT IN (
    'profiles','listings','reviews','review_reports','messages','conversations',
    'payments','listing_promotions','promotion_packages','bank_accounts',
    'sponsor_ads','shopier_settings','smtp_settings','site_settings',
    'announcements','tickets','ticket_messages','mod_actions','app_logs',
    'category_groups','category_overrides','user_roles','verification_codes',
    'blog_posts'
  ) THEN
    RAISE EXCEPTION 'Table not allowed';
  END IF;
  _sql := format('SELECT COALESCE(jsonb_agg(row_to_json(t)),''[]''::jsonb) FROM (SELECT * FROM public.%I ORDER BY 1 DESC LIMIT %s) t', _table, LEAST(GREATEST(_limit,1),500));
  EXECUTE _sql INTO _res;
  RETURN _res;
END; $$;
REVOKE ALL ON FUNCTION public.admin_table_rows(text,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_table_rows(text,int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_table_counts()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_object_agg(t, c) INTO _res FROM (
    SELECT 'profiles' t, (SELECT count(*) FROM public.profiles) c
    UNION ALL SELECT 'listings', (SELECT count(*) FROM public.listings)
    UNION ALL SELECT 'reviews', (SELECT count(*) FROM public.reviews)
    UNION ALL SELECT 'messages', (SELECT count(*) FROM public.messages)
    UNION ALL SELECT 'payments', (SELECT count(*) FROM public.payments)
    UNION ALL SELECT 'tickets', (SELECT count(*) FROM public.tickets)
    UNION ALL SELECT 'blog_posts', (SELECT count(*) FROM public.blog_posts)
    UNION ALL SELECT 'sponsor_ads', (SELECT count(*) FROM public.sponsor_ads)
  ) s;
  RETURN _res;
END; $$;
REVOKE ALL ON FUNCTION public.admin_table_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_table_counts() TO authenticated;

-- SEED 5 blog posts (published)
INSERT INTO public.blog_posts (slug, title, excerpt, content, category, tags, status, published_at, meta_title, meta_description) VALUES
('kartal-ev-temizligi-fiyatlari-2026',
 'Kartal Ev Temizliği Fiyatları 2026: Metrekareye Göre Güncel Ücret Rehberi',
 'Kartal''da ev temizliği kaç TL? Metrekare, oda sayısı ve hizmet türüne göre 2026 fiyat aralıkları, gizli ücretler ve pazarlık ipuçları.',
E'# Kartal Ev Temizliği Fiyatları 2026\n\nKartal''da yaşıyor ve ev temizliği için ne kadar ödemeniz gerektiğini merak ediyorsanız, doğru rehberdesiniz. 2026 için Kartal ve çevresindeki (Maltepe, Pendik, Kadıköy) güncel piyasa fiyatlarını, hizmet tiplerine göre kırdık.\n\n## Kartal Ev Temizliği Ortalama Fiyatları\n\n| Ev Tipi | Metrekare | Ortalama Ücret |\n|---|---|---|\n| 1+1 | 50-70 m² | 1.200 - 1.800 TL |\n| 2+1 | 90-110 m² | 1.800 - 2.500 TL |\n| 3+1 | 120-150 m² | 2.500 - 3.500 TL |\n| 4+1 / Dubleks | 180+ m² | 3.500 - 5.500 TL |\n\nBu rakamlar **genel temizlik** için geçerlidir. Detaylı temizlik (buzdolabı içi, fırın, cam silme dahil) %30-50 daha pahalıdır.\n\n## Fiyatı Etkileyen 6 Faktör\n\n1. **Evin durumu:** Uzun süredir temizlenmemiş ev, standart hizmetin 1.5-2 katı fiyata mal olur.\n2. **Kirli yüzey sayısı:** Cam, fırın, buzdolabı içi, banyo derz temizliği ekstradır.\n3. **Ulaşım:** Kartal içi ek ücret yoktur ancak Pendik-Tuzla üstü %10-15 zam beklenir.\n4. **Hafta sonu:** Cumartesi-Pazar için %15-20 zam standarttır.\n5. **Malzeme kimden?** Firmanın kendi malzemeleriyle gelmesi 200-400 TL fark yaratır.\n6. **Personel sayısı:** 2 kişilik ekip tek kişinin 1.7 katı fiyatlıdır ama iş süresi yarıya iner.\n\n## Kartal''da Güvenilir Firma Nasıl Seçilir?\n\n- **Sözleşme isteyin:** Kayıt dışı çalışan kişilerle hasar/sigorta problemi yaşarsınız.\n- **Referans sorun:** En az 3 mahalle referansı verebilmeli.\n- **Sigorta:** Personel iş kazası sigortalı olmalı.\n- **Ön ödeme yapmayın:** İş tamamlandıktan sonra ödeme standarttır.\n\n## Sıkça Sorulan Sorular\n\n**Kartal''da 2+1 daire temizliği ne kadar?** 2026 için ortalama 1.800-2.500 TL arası.\n**Kaç saat sürer?** 2+1 için 2 kişilik ekip 4-5 saatte tamamlar.\n**Hangi mahallelerde hizmet var?** Yakacık, Soğanlık, Cevizli, Orhantepe, Kordonboyu başta olmak üzere tüm Kartal mahalleleri.\n\nKartal''daki güvenilir temizlik hizmetleri için [İstanbul/Kartal sayfamıza](/istanbul/kartal) göz atın.',
 'ev-temizligi', ARRAY['kartal','ev temizligi','fiyat','2026','istanbul'],
 'published', now(),
 'Kartal Ev Temizliği Fiyatları 2026 - Güncel Ücret Listesi',
 'Kartal ev temizliği 2026 fiyatları: 1+1, 2+1, 3+1 daire için güncel ücretler, gizli maliyetler ve güvenilir firma seçimi rehberi.'),

('ev-temizligi-kontrol-listesi',
 'Ev Temizliği Kontrol Listesi: Firmadan İş Aldığınızda Bunları Kontrol Edin',
 'Temizlik firmasından hizmet aldığınızda unutulan 27 nokta. Yazıcı olarak indirilebilir kontrol listesi.',
E'# Ev Temizliği Kontrol Listesi\n\nTemizlik firması geldiğinde çoğu insan "her yer temiz görünüyor" der ve öder. Sonra bir hafta içinde kirin geri döndüğünü görür — çünkü **görünen yerler** temizlendi, **kir kaynakları** değil.\n\nİşte firmadan hizmet aldığınızda mutlaka kontrol etmeniz gereken 27 nokta:\n\n## Mutfak (9 madde)\n- [ ] Ocak altı ve yan yüzeyler\n- [ ] Aspiratör filtresi (yağ katmanı)\n- [ ] Fırın içi ve cam kapı\n- [ ] Buzdolabı üstü ve arkası\n- [ ] Dolap içleri boşaltıldı mı?\n- [ ] Derzler (fayans arası siyah çizgi)\n- [ ] Musluk kireç sökülmüş mü?\n- [ ] Çöp kovası dip yıkaması\n- [ ] Lavabo süzgeci temizliği\n\n## Banyo (7 madde)\n- [ ] Duşakabin cam kireç\n- [ ] Klozet arkası ve altı\n- [ ] Havlupan arası\n- [ ] Ayna ve armatürler leke bırakmadan\n- [ ] Fayans derz beyazlığı\n- [ ] Ventilatör tozu\n- [ ] Sifon dip temizliği\n\n## Genel Alanlar (11 madde)\n- [ ] Perde arkası ve pervaz üstü\n- [ ] Klima filtresi\n- [ ] Priz ve anahtar yüzeyleri\n- [ ] Kapı üstleri (parmak izi + toz)\n- [ ] Dolap üstü toz\n- [ ] Halı altına süpürge girmiş mi?\n- [ ] Yatak altı toz\n- [ ] Cam çerçeveleri\n- [ ] Radyatör arası\n- [ ] Balkon ızgara ve gider\n- [ ] Ayakkabılık iç dezenfeksiyon\n\n## Kontrol İpuçları\n\n**Beyaz eldiven testi:** Firmanın gitmesinden 1 saat önce dolap üstlerine parmağınızı sürün.\n**Koku testi:** Mutfak lavabosu ve banyo giderinde koku kalmamalı.\n**Cam testi:** Aynalara güneş ışığı vurunca leke görülmemeli.',
 'temizlik-rehberi', ARRAY['temizlik','kontrol listesi','ipucu'],
 'published', now(),
 'Ev Temizliği Kontrol Listesi - 27 Madde ile Denetim',
 'Temizlik firmasından hizmet aldığınızda kontrol etmeniz gereken 27 kritik nokta. Mutfak, banyo ve genel alan denetim rehberi.'),

('istanbul-bakici-hizmeti-nasil-secilir',
 'İstanbul''da Güvenilir Bakıcı Nasıl Seçilir? 2026 Rehberi',
 'Çocuk ve yaşlı bakıcısı seçerken referans kontrolü, sözleşme, sigortalılık ve deneme günü nasıl işler.',
E'# İstanbul''da Güvenilir Bakıcı Nasıl Seçilir?\n\nİstanbul gibi 16 milyonluk bir şehirde bakıcı bulmak kolay, güvenilir bakıcı bulmak zor. Bu rehberde 15 yıllık deneyime dayanan seçim kriterlerini paylaşıyoruz.\n\n## Bakıcı Türlerine Göre Yaklaşım\n\n### Çocuk Bakıcısı\n- **0-1 yaş:** Sertifikalı bebek bakıcısı (BebekMed, Anne Okulu vb.) tercih edilmeli.\n- **1-3 yaş:** Çocuk gelişimi eğitimi almış, tercihen kendi çocuğu olmuş kişi.\n- **3-6 yaş:** Okul öncesi öğretmenliği mezunu ideal.\n\n### Yaşlı Bakıcısı\n- **Yatalak hasta:** Sağlık meslek lisesi mezunu veya hastane deneyimli.\n- **Aktif yaşlı:** Refakatçi düzeyinde deneyim yeterli.\n- **Alzheimer/Demans:** Mutlaka bu alanda deneyimli kişi.\n\n## Referans Kontrolü — En Kritik Adım\n\nAdayı almadan önce **en az 3 aile ile telefon görüşmesi** yapın. Şu 5 soruyu sorun:\n\n1. Kaç ay/yıl çalıştı, neden ayrıldı?\n2. Çocuğunuz/yakınınız onunla nasıl bir bağ kurdu?\n3. Beklenmedik bir durumda (hastalık, kaza) tepkisi nasıldı?\n4. Ev düzenine, kurallara uydu mu?\n5. Tekrar aynı kişiyi işe alır mısınız?\n\nBu son soru en önemlisidir. "Alırım" ile "Bilmiyorum" arasındaki fark her şeyi anlatır.\n\n## Sözleşme Zorunlu\n\nİstanbul''da bakıcıyla sözlü anlaşma yapmak, yasal ve pratik risktir. Sözleşmede olması gerekenler:\n\n- Görev tanımı (temizlik dahil mi? yemek pişirme dahil mi?)\n- Çalışma saatleri ve fazla mesai ücreti\n- Yıllık izin ve resmi tatiller\n- İş kazası sigortası (SGK zorunlu)\n- Fesih koşulları ve ihbar süresi\n- Gizlilik maddesi (ev fotoğrafı paylaşımı yasağı vb.)\n\n## Deneme Haftası\n\nİlk 1 hafta **evde siz varken** çalıştırın. Şunları gözlemleyin:\n- Çocuk/yaşlı ile ilk 10 dakikadaki iletişimi\n- Ekran süresine tutumu\n- Yemek/ilaç saatlerine sadakati\n- Ev kurallarına (ayakkabı, ses, misafir) uyumu\n\n## Sıkça Sorulan Sorular\n\n**İstanbul''da bakıcı maaşları ne kadar?** Yatılı çocuk bakıcısı 25.000-45.000 TL, gündüz 15.000-28.000 TL (2026).\n**SGK''sı olmayan bakıcı alabilir miyim?** Yasal riskleri size ait olmak üzere alabilirsiniz ancak iş kazası durumunda tüm sorumluluk sizin.\n**Yabancı uyruklu bakıcı yasal mı?** Çalışma izni olan yabancılar yasaldır. Kaçak istihdam ağır cezaya tabidir.',
 'bakim', ARRAY['bakici','cocuk bakimi','yasli bakimi','istanbul'],
 'published', now(),
 'İstanbul Bakıcı Seçimi Rehberi 2026 - Güvenilir Bakıcı Nasıl Bulunur',
 'İstanbul''da çocuk ve yaşlı bakıcısı seçerken referans, sözleşme, sigorta ve deneme haftası ipuçları. 2026 güncel maaş bilgileri.'),

('gecici-hayvan-yuvasi-bakimi',
 'Geçici Hayvan Yuvalığı ve Otel Bakımı: Tatile Çıkarken Doğru Seçim',
 'İstanbul''da geçici hayvan bakımı yaptırırken pansiyon, evde bakıcı ve komşu seçenekleri karşılaştırması.',
E'# Geçici Hayvan Yuvalığı ve Otel Bakımı\n\nTatile çıkarken kedi veya köpeğinizi bırakmak, hayvan sahiplerinin en büyük stres kaynaklarından biri. İstanbul''da 3 ana seçenek var — hangisi sizin için doğru?\n\n## 1. Hayvan Pansiyonu (Otel)\n\n**Avantajları:**\n- 24 saat gözetim\n- Veteriner desteği\n- Diğer hayvanlarla sosyalleşme (köpekler için)\n\n**Dezavantajları:**\n- Ev ortamından uzak, stres yaratabilir (özellikle kediler)\n- Bulaşıcı hastalık riski\n- Günlük 250-600 TL arası ücret\n\n**Kontrol edin:** Sağlık karnesi zorunluluğu, tekli kafes vs ortak alan, kamera erişimi.\n\n## 2. Evde Bakıcı (Pet Sitter)\n\n**Avantajları:**\n- Hayvan kendi evinde kalır — en düşük stres seviyesi\n- Bitkileriniz de sulanır, posta alınır\n- Kedilere en uygun seçenek\n\n**Dezavantajları:**\n- Referans doğrulaması zor\n- Anahtar teslim güven meselesi\n- Günlük 300-700 TL (2 saat ziyaret)\n\n**Kontrol edin:** Görüşmeyi hayvanınızla birlikte yapın, hayvanın ilk 5 dakikadaki tepkisine güvenin.\n\n## 3. Komşu / Arkadaş\n\n**Avantajları:**\n- Ücretsiz veya sembolik\n- Güven en yüksek\n\n**Dezavantajları:**\n- Sorumluluk çakışması durumunda profesyonel bakım kaybolur\n- Acil durum (hastalık) yönetimi zayıf\n\n## Hangi Durumda Hangisi?\n\n| Durum | Öneri |\n|---|---|\n| 1-3 günlük ayrılık, kedi | Evde bakıcı veya komşu |\n| 1-3 günlük ayrılık, köpek | Evde bakıcı |\n| 1 haftadan uzun | Pansiyon (rutin oluşur) |\n| Yaşlı/hasta hayvan | Ev + veteriner erişimli bakıcı |\n| Enerjik köpek | Pansiyon (sosyalleşme) |\n\n## Ayrılmadan Önce Yapılacaklar\n\n- Aşı ve iç/dış parazit tedavisi güncel olmalı\n- Mama, ilaç, sevdiği oyuncak paketlenmeli\n- Veteriner ile acil durum protokolü yazılı bırakılmalı\n- Bakıcıya günlük fotoğraf isteyin — sizin için sadece kontrol değil, hayvan için de sizi hatırlatır',
 'hayvan-bakimi', ARRAY['hayvan bakimi','pet sitter','pansiyon','tatil'],
 'published', now(),
 'Geçici Hayvan Yuvalığı ve Pet Sitter Rehberi - İstanbul',
 'İstanbul''da hayvan pansiyonu, evde pet sitter ve komşu seçeneklerinin karşılaştırması. Fiyatlar, avantajlar, kontrol listesi.'),

('istanbul-ilcelerine-gore-hizmet-yogunlugu',
 'İstanbul''un 39 İlçesinde Ev Hizmetleri: Yoğunluk Haritası ve İpuçları',
 'İstanbul''un her ilçesinde en çok talep edilen ev hizmetleri, en zor bulunan hizmetler ve ilçeye özel ipuçları.',
E'# İstanbul''un 39 İlçesinde Ev Hizmetleri\n\nİstanbul''un her ilçesinde ihtiyaç aynı değildir. Kadıköy''de çocuk bakıcısı talebi Silivri''nin 4 katıyken, Silivri''de bahçıvan talebi Kadıköy''ün 6 katı. Bu yazı, ilçenizde hangi hizmetin bol, hangisinin kıt olduğunu ve nerelere yönelmeniz gerektiğini anlatıyor.\n\n## Anadolu Yakası\n\n### Kadıköy, Ataşehir, Üsküdar\nApartman yoğunluğu yüksek, çalışan aileler çok. **En çok talep:** ev temizliği, çocuk bakıcısı, ders arkadaşı. **Zor bulunan:** bahçıvan, tadilat ustası (küçük iş için gelmez).\n\n### Kartal, Maltepe, Pendik\nSitelerde yoğunluk, geniş metrekare. **En çok talep:** haftalık ev temizliği, cam silme, klima bakımı. **Fırsat alanı:** yaşlı bakıcısı — sahil bandında yaşlı nüfus arttı.\n\n### Tuzla, Sancaktepe, Sultanbeyli, Çekmeköy\nMüstakil ev oranı yüksek. **En çok talep:** bahçe bakımı, boya-badana, hamallık. **Zor bulunan:** yatılı yaşlı bakıcısı.\n\n### Beykoz, Şile\nYazlık + kalıcı ikamet karışımı. **En çok talep:** sezonluk açılış-kapanış temizliği, kombi bakımı.\n\n## Avrupa Yakası\n\n### Beşiktaş, Şişli, Kağıthane, Sarıyer\nYüksek gelir, apartman. **En çok talep:** haftalık düzenli temizlik, uzman evcil hayvan gezdiricisi, özel şoför. **Zor bulunan:** hızlı tadilat ustası (fiyatlar yüksek).\n\n### Beyoğlu, Fatih, Eyüpsultan\nTarihi bölge, dar sokak. **En çok talep:** tadilat, tesisatçı, elektrikçi. **İpucu:** eski binalarda kablo/borular dikkat gerektirir, deneyimli usta seçin.\n\n### Bakırköy, Bahçelievler, Zeytinburnu, Güngören\nOrta gelir, apartman. **En çok talep:** ev temizliği, çamaşır ütü.\n\n### Esenyurt, Beylikdüzü, Başakşehir, Küçükçekmece\nGenç aileler, yeni siteler. **En çok talep:** çocuk bakıcısı, düzenli temizlik, site içi taşıma.\n\n### Silivri, Çatalca, Arnavutköy, Büyükçekmece\nMüstakil + tarım karışımı. **En çok talep:** bahçe bakımı, mevsimlik işçi, tadilat.\n\n## İlçenize Özel Sayfalar\n\nHer ilçenin detay sayfasında o bölgede ilan veren firmaları ve mahalle bazında hizmetleri görebilirsiniz. İstanbul ilçe listesi için sitenin üst menüsündeki **İlçeler** bölümünü kullanabilirsiniz.',
 'istanbul-rehberi', ARRAY['istanbul','ilceler','hizmet','rehber'],
 'published', now(),
 'İstanbul 39 İlçe Ev Hizmetleri Rehberi - Talep Yoğunluğu',
 'İstanbul''un 39 ilçesinde en çok aranan ev hizmetleri, bölgesel farklar ve ilçenize göre ipuçları. Anadolu ve Avrupa yakası karşılaştırması.');
