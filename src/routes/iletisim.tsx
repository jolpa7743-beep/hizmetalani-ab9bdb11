import { createFileRoute } from "@tanstack/react-router";

const DESC =
  "hizmetalanı.com iletişim: destek, iş birliği ve reklam talepleri için e-posta adresimiz ve yanıt süremiz.";

export const Route = createFileRoute("/iletisim")({
  component: () => (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-4">İletişim</h1>
      <p>Bize ulaşmak için: <a href="mailto:iletisim@hizmetalani.com" className="text-brand hover:underline">iletisim@hizmetalani.com</a></p>
    </div>
  ),
  head: () => ({
    meta: [
      { title: "İletişim — hizmetalanı.com" },
      { name: "description", content: DESC },
      { property: "og:title", content: "İletişim — hizmetalanı.com" },
      { property: "og:description", content: DESC },
      { property: "og:url", content: "https://hizmetalani.com/iletisim" },
    ],
    links: [{ rel: "canonical", href: "https://hizmetalani.com/iletisim" }],
  }),
});
