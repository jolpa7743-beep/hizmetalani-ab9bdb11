import { createFileRoute } from "@tanstack/react-router";

const TITLE = "Evcil Hayvan Bakıcısı Fiyatları 2026 Rehberi";
const DESC =
  "Türkiye'de evcil hayvan bakıcısı fiyatları, güvenilir bakıcı bulma ipuçları, gün/gece ücretleri ve pet sitter seçerken dikkat edilecekler. Güncel 2026 fiyat aralıkları.";

export const Route = createFileRoute("/rehber/evcil-hayvan-bakimi-fiyatlari")({
  component: Page,
  head: () => ({
    meta: [
      { title: `${TITLE} — hizmetalanı.com` },
      { name: "description", content: DESC },
      { name: "keywords", content: "evcil hayvan bakıcısı fiyatları, pet sitter fiyat, köpek bakıcısı ücret, kedi bakıcısı fiyat, güvenilir bakıcı bulma" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://hizmetalani.com/rehber/evcil-hayvan-bakimi-fiyatlari" },
    ],
    links: [{ rel: "canonical", href: "https://hizmetalani.com/rehber/evcil-hayvan-bakimi-fiyatlari" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESC,
          inLanguage: "tr-TR",
          author: { "@type": "Organization", name: "hizmetalanı.com" },
          publisher: { "@type": "Organization", name: "hizmetalanı.com", url: "https://hizmetalani.com" },
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
              name: "Evcil hayvan bakıcısı fiyatları ne kadar?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Türkiye'de evcil hayvan bakıcısı fiyatları 2026 itibarıyla şehir, süre ve hayvan türüne göre değişir. Gündüz ziyaretleri ortalama 250–500 TL/gün, gece konaklamalı bakım 500–900 TL/gece, haftalık uzun süreli pet sitter hizmetleri ise 3.500–6.000 TL aralığındadır.",
              },
            },
            {
              "@type": "Question",
              name: "Fiyatı belirleyen faktörler nelerdir?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Şehir ve ilçe (İstanbul, Ankara, İzmir'de %20–40 daha yüksek), hayvan türü (köpek genellikle kediden pahalı), süre (uzun anlaşmalarda günlük ücret düşer) ve ek hizmetler (ilaç verme, veteriner takibi, tımar) fiyatı belirler.",
              },
            },
            {
              "@type": "Question",
              name: "Güvenilir bir pet sitter nasıl seçilir?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Profildeki puanlama ve yorumları okuyun (en az 5 gerçek değerlendirme), doğrulanmış üye rozetine bakın, kısa bir tanışma seansı yapın, yazılı anlaşma imzalayın ve ödemeyi hizmet öncesi %100 peşin göndermeyin.",
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

      <h2>Evcil hayvan bakıcısı fiyatları ne kadar?</h2>
      <p>
        Türkiye'de <strong>evcil hayvan bakıcısı fiyatları</strong> 2026 itibarıyla şehir, süre ve hayvan türüne göre değişir.
        Gündüz ziyaretleri ortalama <strong>250–500 TL/gün</strong>, gece konaklamalı bakım <strong>500–900 TL/gece</strong>,
        haftalık uzun süreli pet sitter hizmetleri ise <strong>3.500–6.000 TL</strong> aralığındadır.
      </p>

      <h2>Fiyatı belirleyen faktörler</h2>
      <ul>
        <li><strong>Şehir ve ilçe:</strong> İstanbul, Ankara ve İzmir'de ücretler taşra illerine göre %20–40 daha yüksektir.</li>
        <li><strong>Hayvan türü:</strong> Köpek bakımı genellikle kedi bakımından pahalıdır (yürüyüş gerekliliği).</li>
        <li><strong>Süre:</strong> Uzun süreli anlaşmalarda günlük ücret düşer.</li>
        <li><strong>Ek hizmetler:</strong> İlaç verme, veteriner takibi, tımar gibi hizmetler ek ücretlendirilir.</li>
      </ul>

      <h2>Güvenilir bakıcı bulma ipuçları</h2>
      <ol>
        <li>Profilde <strong>puanlama ve yorumları</strong> okuyun; en az 5 gerçek değerlendirme olmalı.</li>
        <li><strong>Doğrulanmış üye</strong> rozetine ve trust seviyesine bakın.</li>
        <li>İlk buluşmayı kısa bir <strong>tanışma seansı</strong> ile yapın; hayvanın davranışını gözlemleyin.</li>
        <li><strong>Yazılı anlaşma</strong> yapın: tarih, saat, ücret, acil durum iletişimi net olsun.</li>
        <li>Ödemeyi <strong>hizmet öncesi %100 peşin</strong> göndermeyin — platformda mesajlaşma üzerinden anlaşın.</li>
      </ol>

      <h2>Pet sitter seçerken sormanız gereken 5 soru</h2>
      <ol>
        <li>Kaç yıllık deneyiminiz var, hangi ırklarla çalıştınız?</li>
        <li>Aynı anda kaç hayvana bakıyorsunuz?</li>
        <li>Acil durumda hangi veterineri kullanıyorsunuz?</li>
        <li>Günde kaç kez yürüyüşe çıkarıyorsunuz?</li>
        <li>Referans ve önceki müşteri yorumu paylaşabilir misiniz?</li>
      </ol>

      <h2>hizmetalanı.com'da bakıcı bulun</h2>
      <p>
        Şehir ve ilçe bazlı filtreler, doğrulanmış profiller ve gerçek kullanıcı puanlamaları ile
        güvenilir evcil hayvan bakıcısına dakikalar içinde ulaşabilirsiniz.
      </p>
    </article>
  );
}
