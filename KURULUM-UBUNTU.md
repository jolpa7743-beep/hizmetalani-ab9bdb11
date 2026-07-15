# hizmetalani.com — Ubuntu VDS Kurulum Rehberi

Bu rehber, projeyi **Ubuntu 24.04 LTS** üzerinde çalıştırıp `hizmetalani.com` domainine bağlar. Site: React + TanStack Start (Node.js sunucu). Veritabanı Lovable Cloud'da kalır (Supabase). Yani VDS sadece web uygulamasını çalıştırır.

> **NOT:** cPanel değil, düz Ubuntu VDS gerekli. cPanel PHP hostingi içindir, bu proje Node.js.

---

## 0. Neye ihtiyacın var

- Ubuntu 24.04 LTS kurulu VDS (min. 2 GB RAM, 20 GB disk, root/sudo erişimi)
- Bir SSH istemcisi (Windows'ta PuTTY veya PowerShell, Mac/Linux'ta terminal)
- `hizmetalani.com` domaininin DNS panel erişimi (aldığın firma — GoDaddy, Natro, İsimtescil vb.)
- Proje kaynak kodunun bir kopyası (git repo veya zip)

---

## 1. Sunucuya bağlan

```bash
ssh root@SUNUCU_IP
# örn: ssh root@188.132.xxx.xxx
```

İlk şifreyi hosting firması vermiş olur. Bağlanınca sistemi güncelle:

```bash
apt update && apt upgrade -y
```

---

## 2. Node.js 20 kur

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git build-essential
node -v   # v20.x.x görmelisin
npm -v
```

Bun yerine npm ile de çalışır — Bun istersen:

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun -v
```

---

## 3. PM2 kur (uygulamayı arka planda tutar)

```bash
npm install -g pm2
```

---

## 4. Nginx + SSL araçlarını kur

```bash
apt install -y nginx certbot python3-certbot-nginx ufw
```

---

## 5. Güvenlik duvarı

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

---

## 6. Projeyi sunucuya al

**Yöntem A — Git ile (önerilen):**

Önce Lovable'da sağ üstten **GitHub → Connect to GitHub** ile projeyi GitHub'a bağla. Sonra sunucuda:

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/KULLANICI/REPO.git hizmetalani
cd hizmetalani
```

**Yöntem B — Zip ile:**

Bilgisayarında Lovable'dan **... → Export code (zip)** indir, WinSCP / FileZilla ile `/var/www/hizmetalani/` klasörüne yükle.

---

## 7. Ortam değişkenlerini ayarla

Proje köküne `.env` dosyası oluştur:

```bash
cd /var/www/hizmetalani
nano .env
```

İçine yapıştır (Lovable'daki `.env` ile aynı):

```env
SUPABASE_PROJECT_ID=kilinvffhpnwyigwitjy
SUPABASE_PUBLISHABLE_KEY=sb_publishable_T5voZL2f5luNbW23GMmhow_TzzgiAM_
SUPABASE_URL=https://kilinvffhpnwyigwitjy.supabase.co
VITE_SUPABASE_PROJECT_ID=kilinvffhpnwyigwitjy
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_T5voZL2f5luNbW23GMmhow_TzzgiAM_
VITE_SUPABASE_URL=https://kilinvffhpnwyigwitjy.supabase.co
```

CTRL+O, Enter, CTRL+X ile kaydet.

> Servis-rol anahtarı ve LOVABLE_API_KEY gibi gizli değerler Lovable Cloud'da kalır — VDS'ye kopyalaman gerekmiyor, çünkü admin işlemler için server function'lar Lovable üzerinde çalışıyor. VDS sadece **frontend + public server fn**'leri çalıştırır. **Bu mimari sınırlı çalışır**: admin panel, giriş vs. Lovable üzerinden gitmesi gereken bazı akışlar VDS'de çalışmayabilir. Tavsiye kısmına bak (en altta).

---

## 8. Bağımlılıkları kur ve build al

```bash
cd /var/www/hizmetalani
npm install          # ya da: bun install
npm run build        # ya da: bun run build
```

Build 1-3 dakika sürebilir. Bittikten sonra `.output/` klasörü oluşur.

---

## 9. PM2 ile uygulamayı başlat

```bash
cd /var/www/hizmetalani
PORT=3000 pm2 start ".output/server/index.mjs" --name hizmetalani
pm2 save
pm2 startup systemd
# çıktıda verilen komutu kopyala ve çalıştır (sunucu yeniden başlarken otomatik açılsın)
```

Kontrol:

```bash
pm2 status
curl http://localhost:3000     # HTML dönüyorsa çalışıyor
```

---

## 10. Nginx reverse proxy

```bash
nano /etc/nginx/sites-available/hizmetalani.com
```

İçine yapıştır:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name hizmetalani.com www.hizmetalani.com;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
```

Etkinleştir:

```bash
ln -s /etc/nginx/sites-available/hizmetalani.com /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default   # varsayılan sayfayı kaldır
nginx -t                              # OK dönmeli
systemctl reload nginx
```

---

## 11. Domain DNS ayarları

Domainini aldığın firmanın panelinde (Natro, GoDaddy, İsimtescil, Cloudflare vb.) **DNS Yönetimi** kısmına gir. Sunucunun IP'si `SUNUCU_IP` olsun.

Şu kayıtları ekle (varsa eskilerini sil):

| Tip | Ad / Host | Değer          | TTL   |
|-----|-----------|----------------|-------|
| A   | @         | `SUNUCU_IP`    | 3600  |
| A   | www       | `SUNUCU_IP`    | 3600  |

DNS yayılması: genelde 10-60 dakika, en fazla 24-72 saat.

Kontrol:
```bash
dig hizmetalani.com +short          # IP'yi görmelisin
dig www.hizmetalani.com +short
```

---

## 12. SSL (https) kur — Let's Encrypt

DNS yayıldıktan sonra:

```bash
certbot --nginx -d hizmetalani.com -d www.hizmetalani.com
```

Certbot email ister, kabul et → HTTPS'e otomatik yönlendirme için **2** seç. Sertifika kurulur, Nginx conf'u güncellenir.

Otomatik yenileme testi:

```bash
certbot renew --dry-run
```

Artık `https://hizmetalani.com` çalışıyor olmalı.

---

## 13. Güncelleme (yeni sürüm yayınlama)

Lovable'da değişiklik yapınca GitHub'a otomatik push oluyorsa:

```bash
cd /var/www/hizmetalani
git pull
npm install
npm run build
pm2 restart hizmetalani
```

Bu komutları tek satırda çalıştırmak için `/root/deploy.sh`:

```bash
#!/bin/bash
set -e
cd /var/www/hizmetalani
git pull
npm install
npm run build
pm2 restart hizmetalani
echo "Deploy tamam."
```

```bash
chmod +x /root/deploy.sh
# Kullanım: /root/deploy.sh
```

---

## 14. Log ve sorun giderme

```bash
pm2 logs hizmetalani           # uygulama logları
pm2 restart hizmetalani        # yeniden başlat
tail -f /var/log/nginx/error.log
systemctl status nginx
```

**502 Bad Gateway** → PM2 uygulaması düşmüş, `pm2 logs` bak.
**Domain açılmıyor** → `dig` ile DNS doğru mu kontrol et.
**SSL hatası** → `certbot certificates` ile sertifika durumunu gör.

---

## 15. Önemli uyarı — Bu mimarinin sınırı

Bu kurulumda **veritabanı Lovable Cloud'da** kalıyor. Yani:

- ✅ Site tamamen VDS'nde çalışır, kendi domaininde
- ✅ Görünürde her şey senin sunucunda
- ⚠️ Kullanıcı verileri, girişler, ilanlar hâlâ Lovable Cloud (Supabase) veritabanında
- ⚠️ Lovable Cloud aboneliği biterse: veritabanı erişimi kesilir → site veri gösteremez
- ⚠️ Admin panelindeki bazı işlemler `LOVABLE_API_KEY` ve `SUPABASE_SERVICE_ROLE_KEY` istiyor. Bunlar Lovable Cloud'a özel, sana verilemiyor. Yani admin panelinin bazı özellikleri VDS'de çalışmaz.

**Tam bağımsız olmak istiyorsan** ek olarak:
1. Kendi Supabase hesabını aç (ücretsiz plan var)
2. Bu projeden şema dökümünü çıkar → yeni Supabase'e uygula
3. `.env`'deki URL/anahtarları yeni Supabase ile değiştir
4. Kendi service_role key'ini `.env`'e ekle: `SUPABASE_SERVICE_ROLE_KEY=...`

Bu ikinci aşamayı istersen ayrı bir rehber yaparım.

---

## Özet — sıraya konulmuş komut listesi

```bash
# 1-5. adım tek tek
ssh root@SUNUCU_IP
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git build-essential nginx certbot python3-certbot-nginx ufw
npm install -g pm2
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable

# 6-9. proje
mkdir -p /var/www && cd /var/www
git clone https://github.com/KULLANICI/REPO.git hizmetalani
cd hizmetalani
nano .env         # değerleri yapıştır
npm install
npm run build
PORT=3000 pm2 start ".output/server/index.mjs" --name hizmetalani
pm2 save && pm2 startup systemd

# 10. nginx
nano /etc/nginx/sites-available/hizmetalani.com   # yukarıdaki conf
ln -s /etc/nginx/sites-available/hizmetalani.com /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 11. DNS panelinde A kayıtlarını ekle (hosting firmanın panelinde)

# 12. DNS yayıldıktan sonra SSL
certbot --nginx -d hizmetalani.com -d www.hizmetalani.com
```

---

Takıldığın adımda **hangi adım + hata mesajı** yazarsan çözeriz.
