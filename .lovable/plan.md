
## Amaç
Kullanıcılar ilanlarını ücretli olarak "vitrin / öne çıkan / acil" gibi paketlerle öne çıkarabilsin. Ödemeler Shopier (kredi kartı) veya havale/EFT ile alınsın. Admin hem Shopier ayarlarını hem de AdSense dışı sponsor reklam alanlarını panelden yönetsin.

## 1. Ücretli öne çıkarma (promosyon paketleri)

### Veritabanı
- `promotion_packages` — paket tanımları (ad, tip: `featured` | `showcase` | `urgent` | `top`, süre (saat), fiyat TRY, aktif mi, sıralama). Admin CRUD.
- `listings` tablosuna kolonlar:
  - `is_featured boolean`, `featured_until timestamptz` (vitrin)
  - `is_showcase boolean`, `showcase_until timestamptz` (öne çıkan)
  - `is_urgent boolean`, `urgent_until timestamptz` (acil)
  - `boost_score int` (sıralama için)
- `listing_promotions` — satın alma geçmişi (listing_id, user_id, package_id, ödeme yöntemi, tutar, başlangıç/bitiş, durum).
- `payments` — genel ödeme kayıtları (kullanıcı, tutar, yöntem: `shopier` | `bank_transfer`, referans, durum: `pending`/`paid`/`failed`/`refunded`, ilgili promotion_id).
- `bank_accounts` — admin panelinden yönetilen havale hesap bilgileri (banka, IBAN, hesap sahibi, aktif mi).
- Cron/temizlik: bitiş tarihi geçen promosyonları pasifleştiren SQL fonksiyonu + günlük tetiklenen `/api/public/cron/expire-promotions` route.

### UI
- İlan detay/panel sayfasında "Öne Çıkar" butonu → paket seçim ekranı → ödeme yöntemi seçimi.
- İlan listelemede vitrin/öne çıkan/acil rozetleri (renkli border + badge). Vitrin ilanlar arama sonuçlarının üstünde ayrı bir şerit, öne çıkanlar normal listede boost_score'a göre yukarıda.
- Kullanıcı panelinde "Promosyonlarım" sekmesi (aktif/geçmiş).

## 2. Ödeme entegrasyonu

### Shopier
- Admin panelinden `shopier_settings` (API key, secret, mağaza ID, test/canlı, aktif mi) yönetilebilsin. Secret sadece server tarafında okunur.
- `POST /api/public/payments/shopier/create` — sunucuda imzalı ödeme talebi oluşturur, Shopier redirect URL döner.
- `POST /api/public/webhooks/shopier` — Shopier callback'i imza doğrulaması ile alır, `payments` kaydını `paid` yapar ve ilgili promosyonu aktifleştirir.
- Server function `getShopierCheckoutUrl` — kullanıcının seçtiği paket için ödeme başlatır.

### Havale / EFT
- Kullanıcı paketi seçip "Havale ile öde"yi seçince `payments` kaydı `pending` olarak açılır, ekranda IBAN'lar ve referans kodu gösterilir.
- Admin panelinde "Bekleyen Havaleler" ekranı → tek tıkla "Onayla" (payment paid + promosyon aktif) veya "Reddet".

## 3. Sponsor reklam alanları (AdSense dışı)

### Veritabanı
- `sponsor_ads` — slot (`header` | `sidebar_left` | `sidebar_right` | `listing_inline` | `footer` | `home_hero`), başlık, görsel URL, hedef URL, başlangıç/bitiş, aktif mi, öncelik, tıklanma/gösterim sayaçları, sponsor adı.
- Var olan `AdSlot` bileşenini genişlet: eğer o slot için aktif bir `sponsor_ads` varsa AdSense yerine sponsoru göster (rotasyon: priority + tarih aralığı içindekiler arasından rasgele).
- `POST /api/public/ads/track` — impression/click event'i (rate-limited).

### Admin paneli
- `/_authenticated/admin/reklamlar` — sponsor reklamları CRUD + görsel yükleme (mevcut Supabase storage veya URL).
- İstatistik: her sponsorun toplam gösterim/tık, CTR.

## 4. Admin paneli eklemeleri
Mevcut accordion menüye "Kazanç" başlığı altında:
- Promosyon paketleri
- Bekleyen havaleler
- Ödeme geçmişi
- Shopier ayarları
- Havale hesapları
- Sponsor reklamları

## Teknik notlar
- Tüm yeni tablolara RLS: paketler/sponsorlar herkese SELECT (aktif olanlar), yazma sadece admin. `payments` ve `listing_promotions` sadece sahibine SELECT + admin'e tümü. Havale onayı/Shopier webhook için admin RPC + service_role kullanılacak.
- Shopier API secret'ı `add_secret` ile istenecek (webhook doğrulama için). Kullanıcı henüz Shopier hesabı yoksa ayar ekranı "boş" durumda kalır, sadece havale çalışır.
- Sıralama: `ORDER BY is_featured DESC, is_showcase DESC, boost_score DESC, created_at DESC`.
- Ücret gösterimi TRY. Para birimi şimdilik sabit.

## Sıralama (yapılış adımları)
1. Migration: yeni tablolar + `listings` kolonları + RLS + admin RPC'leri + seed paketler.
2. Kullanıcı akışı: paket seçim modalı, havale ekranı, "Promosyonlarım" sekmesi.
3. Shopier server fonksiyonları + webhook route + admin ayar ekranı.
4. Admin: paketler, bekleyen havaleler, ödemeler, Shopier, havale hesapları ekranları.
5. Sponsor reklam sistemi: tablo + admin CRUD + `AdSlot` entegrasyonu + tracking.
6. Listeleme sıralamasına promosyon boost'u + rozetler.

## Onayınıza sunulan sorular
- **Shopier hesabınız var mı?** Yoksa altyapıyı hazır bırakırım, sadece havale/EFT aktif başlar; Shopier API bilgilerini sonra girip aktif edebilirsiniz.
- **Sponsor reklam görselleri için**: admin panelinden dosya yükleme (Storage bucket açayım) mı yoksa sadece URL girme mi tercih edersiniz?
- **Paket örnekleri**: başlangıç için "24 saat vitrin — 20 TL", "7 gün öne çıkan — 50 TL", "3 gün acil — 15 TL" gibi seed'leyeyim mi, yoksa fiyatları siz mi belirlersiniz?
