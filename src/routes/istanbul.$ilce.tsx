import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { ISTANBUL_ILCELERI, getIlce } from "@/lib/istanbul-ilceler";
import { CATEGORIES } from "@/lib/categories";
import { Home, MapPin, ArrowRight, CheckCircle2 } from "lucide-react";

const BASE = "https://hizmetalani.lovable.app";

export const Route = createFileRoute("/istanbul/$ilce")({
  loader: ({ params }) => {
    const ilce = getIlce(params.ilce);
    if (!ilce) throw notFound();
    return ilce;
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) return { meta: [{ title: "İlçe bulunamadı" }, { name: "robots", content: "noindex" }] };
    const url = `${BASE}/istanbul/${params.ilce}`;
    const title = `${loaderData.name} Ev Hizmetleri — Temizlik, Bakıcı, Pet Sitter | HizmetAlanı`;
    const desc = `${loaderData.name} bölgesinde ev temizliği, çocuk/yaşlı bakıcısı, evcil hayvan bakımı ve daha fazlası. ${loaderData.ozet}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: `${BASE}/` },
              { "@type": "ListItem", position: 2, name: "İstanbul", item: `${BASE}/istanbul` },
              { "@type": "ListItem", position: 3, name: loaderData.name, item: url },
            ],
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: `${loaderData.name} Ev Hizmetleri`,
            description: desc,
            areaServed: {
              "@type": "Place",
              name: `${loaderData.name}, İstanbul`,
              containedInPlace: { "@type": "AdministrativeArea", name: "İstanbul" },
            },
            provider: { "@type": "Organization", name: "HizmetAlanı", url: BASE },
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
                name: `${loaderData.name}'da ev temizliği fiyatları ne kadar?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `${loaderData.name} bölgesinde 2+1 daire için ortalama 1.800-2.500 TL, 3+1 için 2.500-3.500 TL arası fiyatlar geçerlidir (2026).`,
                },
              },
              {
                "@type": "Question",
                name: `${loaderData.name}'da hangi ev hizmetleri sunuluyor?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `Ev temizliği, ofis temizliği, merdiven temizliği, çocuk ve yaşlı bakıcısı, evcil hayvan bakımı ve geçici yuvalık hizmetleri bulunmaktadır.`,
                },
              },
              {
                "@type": "Question",
                name: `${loaderData.name}'da güvenilir hizmet nasıl bulunur?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `HizmetAlanı üzerinden ilan verenlerin puan, yorum ve doğrulanmış üye rozetlerini inceleyerek güvenilir hizmet sağlayıcı seçebilirsiniz.`,
                },
              },
            ],
          }),
        },
      ],
    };
  },
  component: IlcePage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">İlçe bulunamadı</h1>
      <Link to="/istanbul" className="text-brand mt-4 inline-block">Tüm ilçeler</Link>
    </div>
  ),
  errorComponent: ({ reset }) => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Bir hata oluştu</h1>
      <button onClick={reset} className="mt-4 text-brand">Yeniden dene</button>
    </div>
  ),
});

function IlcePage() {
  const ilce = Route.useLoaderData();
  const neighbors = ISTANBUL_ILCELERI.filter((i) => i.yaka === ilce.yaka && i.slug !== ilce.slug).slice(0, 8);

  return (
    <div className="min-h-screen bg-muted/10">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <nav className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
          <Link to="/" className="hover:text-foreground">Ana Sayfa</Link>
          <span>/</span>
          <Link to="/istanbul" className="hover:text-foreground">İstanbul</Link>
          <span>/</span>
          <span className="text-foreground">{ilce.name}</span>
        </nav>

        <header className="mb-8">
          <div className="inline-flex items-center gap-1.5 text-xs bg-brand/10 text-brand px-2.5 py-1 rounded-full mb-3">
            <MapPin className="size-3" /> {ilce.yaka} Yakası · İstanbul
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            {ilce.name} Ev Hizmetleri
          </h1>
          <p className="text-lg text-muted-foreground mt-3 max-w-3xl">
            {ilce.name}'da temizlik, bakıcı, evcil hayvan bakımı ve daha fazlası — güvenilir hizmet sağlayıcılarla tanışın.
            Nüfus: {ilce.nufus}.
          </p>
        </header>

        <section className="bg-card border rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-2">Neden {ilce.name} için HizmetAlanı?</h2>
          <p className="text-muted-foreground">{ilce.ozet}</p>
          <ul className="grid sm:grid-cols-2 gap-2 mt-4 text-sm">
            {[
              "Puanlanmış ve yorum alan üyeler",
              "Doğrulanmış hesap rozetleri",
              "Doğrudan mesajlaşma",
              "Şeffaf fiyatlandırma",
              "Şikayet ve iade süreçleri",
              "Ücretsiz ilan verme",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-brand shrink-0" /> {f}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4">{ilce.name}'da Sunulan Hizmetler</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {CATEGORIES.map((c) => (
              <Link
                key={c.key}
                to="/kategori/$category/$subcategory"
                params={{ category: c.slug, subcategory: `istanbul-${ilce.slug}` }}
                className="group flex items-center gap-3 p-4 bg-card border rounded-xl hover:border-brand hover:shadow-sm transition-all"
              >
                <div className="size-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                  <c.icon className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{c.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.seoDescription}</div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground group-hover:text-brand" />
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-10 prose max-w-none">
          <h2 className="text-2xl font-bold mb-4">{ilce.name}'da Ev Hizmetleri Rehberi</h2>
          <p className="text-muted-foreground leading-7">
            {ilce.name}, {ilce.yaka} Yakası'nın önemli ilçelerinden biri olarak {ilce.nufus} nüfusa ev sahipliği yapmaktadır.
            Bölge sakinleri; iş temposu, aile yapısı ve konut tipine göre farklı hizmet ihtiyaçlarına sahiptir.
            HizmetAlanı olarak {ilce.name} bölgesinde ilan veren yüzlerce güvenilir hizmet sağlayıcıyı tek platformda buluşturuyoruz.
          </p>
          <p className="text-muted-foreground leading-7 mt-3">
            <strong>Ev temizliği</strong> için haftalık, iki haftalık ya da tek seferlik hizmet arayan aileler; genel temizlik,
            derin temizlik, taşınma sonrası temizlik ve inşaat sonrası temizlik seçeneklerinden birini seçebilir.
            <strong> Bakıcı</strong> arayanlar için çocuk bakıcısı, yaşlı bakıcısı ve refakatçi ilanları bulunmaktadır.
            <strong> Evcil hayvan</strong> sahipleri; tatil dönemlerinde geçici yuvalık, pet sitter ve gezdirici hizmetleri alabilir.
          </p>
          <p className="text-muted-foreground leading-7 mt-3">
            {ilce.name}'da hizmet ilanı vermek de ücretsizdir. Üye olduktan sonra kategori seçip fotoğraf ve fiyat bilgisi ile
            ilanınızı yayınlayabilirsiniz. Doğrulanmış hesap rozeti almanız durumunda ilanınız listelerde öne çıkar.
          </p>
        </section>

        <section className="bg-card border rounded-xl p-6 mb-10">
          <h2 className="text-lg font-semibold mb-4">Sıkça Sorulan Sorular</h2>
          <div className="space-y-4">
            <details className="group">
              <summary className="cursor-pointer font-medium">{ilce.name}'da ev temizliği fiyatları ne kadar?</summary>
              <p className="text-sm text-muted-foreground mt-2">
                Ortalama olarak 2+1 daire için 1.800-2.500 TL, 3+1 için 2.500-3.500 TL arası fiyatlar geçerlidir (2026 yılı ortalamaları).
                Detaylı temizlik (buzdolabı, fırın, cam) için %30-50 zam beklenir.
              </p>
            </details>
            <details className="group">
              <summary className="cursor-pointer font-medium">{ilce.name}'da bakıcı için ne kadar ödemeliyim?</summary>
              <p className="text-sm text-muted-foreground mt-2">
                Gündüz çocuk bakıcısı 15.000-28.000 TL, yatılı bakıcı 25.000-45.000 TL aralığındadır. Tecrübe, sertifika ve
                referans durumu ücreti doğrudan etkiler.
              </p>
            </details>
            <details className="group">
              <summary className="cursor-pointer font-medium">{ilce.name}'da güvenilir bir hizmet sağlayıcıyı nasıl seçerim?</summary>
              <p className="text-sm text-muted-foreground mt-2">
                Üye profilindeki puan ortalamasına, geçmiş yorumlara ve doğrulanmış hesap rozetine bakın. En az 3 referansla telefon
                görüşmesi yapın, sözleşme imzalayın ve SGK kaydını mutlaka isteyin.
              </p>
            </details>
            <details className="group">
              <summary className="cursor-pointer font-medium">Tatilde evcil hayvanımı {ilce.name}'da bırakabileceğim güvenilir yer var mı?</summary>
              <p className="text-sm text-muted-foreground mt-2">
                Evet, {ilce.name}'da hem pansiyon hem de evde pet sitter hizmeti sunan üyelerimiz var. Kediler için genellikle evde
                bakım, köpekler için pansiyon önerilir.
              </p>
            </details>
          </div>
        </section>

        {neighbors.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-3">{ilce.yaka} Yakası'nın diğer ilçeleri</h2>
            <div className="flex flex-wrap gap-2">
              {neighbors.map((n) => (
                <Link
                  key={n.slug}
                  to="/istanbul/$ilce"
                  params={{ ilce: n.slug }}
                  className="text-sm px-3 py-1.5 bg-card border rounded-full hover:border-brand hover:text-brand transition-colors"
                >
                  {n.name}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
