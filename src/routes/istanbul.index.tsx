import { createFileRoute, Link } from "@tanstack/react-router";
import { ISTANBUL_ILCELERI } from "@/lib/istanbul-ilceler";
import { MapPin } from "lucide-react";

const BASE = "https://hizmetalani.lovable.app";
const URL = `${BASE}/istanbul`;

export const Route = createFileRoute("/istanbul")({
  head: () => ({
    meta: [
      { title: "İstanbul Ev Hizmetleri — 39 İlçede Temizlik, Bakıcı, Pet Sitter | HizmetAlanı" },
      { name: "description", content: "İstanbul'un 39 ilçesinde ev temizliği, çocuk ve yaşlı bakıcısı, evcil hayvan bakımı ve daha fazlası. İlçenize göre güvenilir hizmet sağlayıcılar." },
      { property: "og:title", content: "İstanbul Ev Hizmetleri — 39 İlçe" },
      { property: "og:description", content: "İstanbul'un tüm ilçelerinde güvenilir ev hizmetleri." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "İstanbul Ev Hizmetleri",
          url: URL,
          hasPart: ISTANBUL_ILCELERI.map((i) => ({
            "@type": "WebPage",
            name: `${i.name} Ev Hizmetleri`,
            url: `${BASE}/istanbul/${i.slug}`,
          })),
        }),
      },
    ],
  }),
  component: IstanbulIndex,
});

function IstanbulIndex() {
  const anadolu = ISTANBUL_ILCELERI.filter((i) => i.yaka === "Anadolu");
  const avrupa = ISTANBUL_ILCELERI.filter((i) => i.yaka === "Avrupa");
  return (
    <div className="min-h-screen bg-muted/10">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">İstanbul Ev Hizmetleri</h1>
          <p className="text-lg text-muted-foreground mt-2">
            İstanbul'un 39 ilçesinde ev temizliği, çocuk ve yaşlı bakıcısı, evcil hayvan bakımı, ofis temizliği ve daha
            birçok kategoride güvenilir hizmet sağlayıcıları bulun. Aşağıdan bulunduğunuz ilçeyi seçin.
          </p>
        </header>

        <Section title="Anadolu Yakası" ilceler={anadolu} />
        <Section title="Avrupa Yakası" ilceler={avrupa} />
      </div>
    </div>
  );
}

function Section({ title, ilceler }: { title: string; ilceler: typeof ISTANBUL_ILCELERI }) {
  return (
    <section className="mb-10">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <MapPin className="size-5 text-brand" /> {title}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {ilceler.map((i) => (
          <Link
            key={i.slug}
            to="/istanbul/$ilce"
            params={{ ilce: i.slug }}
            className="p-3 bg-card border rounded-lg hover:border-brand hover:shadow-sm transition-all"
          >
            <div className="font-medium">{i.name}</div>
            <div className="text-xs text-muted-foreground">{i.nufus}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
