import { createFileRoute, Link } from "@tanstack/react-router";

const TITLE = "Bakıcı İlanları ve Ücretleri 2026 Rehberi";
const DESC =
  "Çocuk, yaşlı ve hasta bakıcısı ilanları için güncel 2026 ücret aralıkları, güvenilir bakıcı seçim kriterleri, sözleşme ve SGK yükümlülükleri. Türkiye geneli detaylı rehber.";
const URL = "https://hizmetalani.com/rehber/bakici-ucretleri";

export const Route = createFileRoute("/rehber/bakici-ucretleri")({
  component: Page,
  head: () => ({
    meta: [
      { title: `${TITLE} — HizmetAlanı` },
      { name: "description", content: DESC },
      { name: "keywords", content: "bakıcı ilanları, çocuk bakıcısı ücreti, yaşlı bakıcısı fiyat, hasta bakıcısı ücret, yatılı bakıcı, gündüz bakıcısı, bakıcı sözleşmesi, bakıcı SGK" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESC,
          inLanguage: "tr-TR",
          author: { "@type": "Organization", name: "HizmetAlanı" },
          publisher: { "@type": "Organization", name: "HizmetAlanı", url: "https://hizmetalani.com" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Bakıcı ücretleri 2026 ne kadar?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Türkiye'de gündüz çocuk bakıcısı ücretleri 250–450 TL/gün, yatılı çocuk bakıcısı 18.000–28.000 TL/ay, yaşlı bakıcısı 20.000–32.000 TL/ay, hasta bakıcısı ise 22.000–38.000 TL/ay aralığındadır. İstanbul, Ankara, İzmir'de ücretler %15–35 daha yüksektir.",
              },
            },
            {
              "@type": "Question",
              name: "Güvenilir bakıcı nasıl seçilir?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Doğrulanmış üye rozetine sahip profilleri tercih edin, en az 5 gerçek değerlendirme okuyun, referanslarını arayın, yüz yüze tanışın ve mutlaka yazılı sözleşme yapın.",
              },
            },
            {
              "@type": "Question",
              name: "Bakıcı için SGK zorunlu mudur?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Ayda 10 günden fazla çalıştırılan ev hizmetlisi bakıcılar için ev sahibi işveren sayılır ve SGK bildirimi (ev hizmetleri sigortası) yasal olarak zorunludur.",
              },
            },
          ],
        }),
      },
    ],
  }),
});

function Page() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 prose prose-neutral">
      <h1>{TITLE}</h1>
      <p className="lead">{DESC}</p>

      <h2>Bakıcı ücretleri 2026 — güncel fiyat aralıkları</h2>
      <p>
        <strong>Bakıcı ilanları</strong> arasında en çok aranan üç kategori çocuk, yaşlı ve hasta bakımıdır.
        2026 itibarıyla Türkiye geneli ortalama ücretler şöyledir:
      </p>
      <ul>
        <li><strong>Gündüz çocuk bakıcısı:</strong> 250–450 TL/gün</li>
        <li><strong>Yatılı çocuk bakıcısı:</strong> 18.000–28.000 TL/ay</li>
        <li><strong>Yaşlı bakıcısı (gündüz):</strong> 350–600 TL/gün</li>
        <li><strong>Yaşlı bakıcısı (yatılı):</strong> 20.000–32.000 TL/ay</li>
        <li><strong>Hasta bakıcısı:</strong> 22.000–38.000 TL/ay (nitelik ve tıbbi ihtiyaca göre)</li>
      </ul>
      <p>
        İstanbul, Ankara ve İzmir gibi büyükşehirlerde ücretler ortalamanın <strong>%15–35 üzerindedir</strong>.
        Yabancı dil bilen, ilk yardım sertifikalı veya hemşirelik geçmişi olan bakıcılar üst bantta yer alır.
      </p>

      <h2>Ücreti belirleyen faktörler</h2>
      <ol>
        <li><strong>Deneyim ve sertifika:</strong> Çocuk gelişimi, ilk yardım, hasta bakımı sertifikaları ücreti artırır.</li>
        <li><strong>Çalışma saati:</strong> Gündüz / yatılı / hafta sonu farkı %30'a kadar değişir.</li>
        <li><strong>Şehir ve ilçe:</strong> Büyükşehir merkez ilçeleri daha pahalıdır.</li>
        <li><strong>Ek görevler:</strong> Yemek, ütü, çocuğu okula götürme gibi görevler pazarlığa girer.</li>
        <li><strong>SGK bildirimi:</strong> Sigortalı çalıştırma toplam maliyeti yaklaşık %20 artırır.</li>
      </ol>

      <h2>Güvenilir bakıcı seçerken 6 kritik adım</h2>
      <ol>
        <li><strong>Doğrulanmış üye rozetine</strong> sahip profilleri filtreleyin.</li>
        <li>Profilde en az <strong>5 gerçek puanlama ve yorum</strong> arayın.</li>
        <li><strong>Referansları arayın</strong> — önceki iki ailenin görüşünü dinleyin.</li>
        <li>Aile ortamında <strong>yüz yüze tanışma</strong> yapın; çocuk / hasta ile uyumu gözlemleyin.</li>
        <li><strong>Yazılı sözleşme</strong> hazırlayın: görevler, ücret, izin günleri, fesih koşulları net olsun.</li>
        <li>Ödeme akışını platformdan <strong>mesajlaşarak</strong> netleştirin; peşin toplu ödeme yapmayın.</li>
      </ol>

      <h2>Bakıcı sözleşmesinde bulunması gerekenler</h2>
      <ul>
        <li>Çalışma günleri, saatleri ve dinlenme günü</li>
        <li>Aylık / günlük net ücret ve ödeme tarihi</li>
        <li>Görev tanımı (bakım + ek hizmetler)</li>
        <li>Yıllık izin, resmi tatil ve hastalık izni</li>
        <li>SGK bildirimi ve prim payı</li>
        <li>Gizlilik ve güvenlik kuralları (kamera, ziyaretçi vb.)</li>
        <li>Fesih bildirim süresi (genellikle 15 gün)</li>
      </ul>

      <h2>SGK ve yasal yükümlülükler</h2>
      <p>
        Ev hizmetlerinde <strong>ayda 10 gün ve üzeri</strong> çalıştırılan bakıcılar için ev sahibi
        işveren statüsündedir. <strong>Ev Hizmetlerinde Sigortalılık (5510/EK-9)</strong> kapsamında
        bakıcı SGK'ya bildirilmeli, prim ödenmelidir. 10 günün altındaki çalışmalarda yalnızca iş
        kazası ve meslek hastalığı primi ödenir. Sözleşmesiz ve bildirimsiz çalıştırmak, kaza veya
        anlaşmazlık halinde ciddi hukuki risk doğurur.
      </p>

      <h2>Şehir bazlı bakıcı ilanları</h2>
      <p>
        HizmetAlanı üzerinden İstanbul, Ankara, İzmir başta olmak üzere 81 ilde
        <strong> doğrulanmış bakıcı ilanları</strong> arasında ilçe, saat ve deneyim filtresiyle arama yapabilirsiniz.
        Kartal, Pendik, Ümraniye, Ataşehir, Bahçelievler ve Kadıköy gibi ilçelerde yüzlerce aktif ilan mevcuttur.
      </p>

      <h2>HizmetAlanı'nda bakıcı bulun</h2>
      <p>
        Komisyonsuz, ücretsiz ve doğrulanmış üye rozetiyle güvenli bakıcı ilanlarına ulaşmak için
        {" "}<Link to="/" className="text-brand underline">ana sayfadaki filtreleri</Link> kullanın veya
        {" "}<Link to="/ilan-ver" className="text-brand underline">kendi ilanınızı ücretsiz yayınlayın</Link>.
      </p>
    </article>
  );
}
