import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { ISTANBUL_ILCELERI } from "@/lib/istanbul-ilceler";
import { listingSlug } from "@/lib/slug";

const BASE_URL = "https://hizmetalani.com";

const STATIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/blog", changefreq: "daily", priority: "0.9" },
  { path: "/istanbul", changefreq: "weekly", priority: "0.9" },
  { path: "/hakkimizda", changefreq: "monthly", priority: "0.7" },
  { path: "/iletisim", changefreq: "monthly", priority: "0.6" },
  { path: "/nasil-calisir", changefreq: "monthly", priority: "0.6" },
  { path: "/guvenlik", changefreq: "monthly", priority: "0.6" },
  { path: "/auth", changefreq: "monthly", priority: "0.4" },
  { path: "/gizlilik", changefreq: "monthly", priority: "0.4" },
  { path: "/kullanim-kosullari", changefreq: "monthly", priority: "0.4" },
  { path: "/kvkk", changefreq: "monthly", priority: "0.4" },
  { path: "/cerez-politikasi", changefreq: "monthly", priority: "0.4" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        let listings: Array<{ id: string; title: string | null; updated_at: string | null }> = [];
        try {
          const { data } = await supabase
            .from("listings")
            .select("id, title, updated_at")
            .eq("status", "active")
            .order("updated_at", { ascending: false })
            .limit(5000);
          listings = (data ?? []) as typeof listings;
        } catch {}

        let posts: Array<{ slug: string; updated_at: string | null }> = [];
        try {
          const { data } = await supabase
            .from("blog_posts")
            .select("slug, updated_at")
            .eq("status", "published")
            .order("updated_at", { ascending: false })
            .limit(1000);
          posts = (data ?? []) as typeof posts;
        } catch {}

        const entries: Array<{ path: string; lastmod?: string; changefreq?: string; priority?: string }> = [
          ...STATIC_ROUTES,
        ];
        // İstanbul ilçe sayfaları — SEO odaklı
        for (const i of ISTANBUL_ILCELERI) {
          entries.push({ path: `/istanbul/${i.slug}`, changefreq: "weekly", priority: "0.85" });
        }
        // Blog yazıları
        for (const p of posts) {
          entries.push({ path: `/blog/${p.slug}`, lastmod: p.updated_at ?? undefined, changefreq: "weekly", priority: "0.8" });
        }
        // İlanlar — SEO dostu slug'lı URL
        for (const l of listings) {
          entries.push({
            path: `/ilan/${listingSlug(l.title, l.id)}`,
            lastmod: l.updated_at ?? undefined,
            changefreq: "weekly",
            priority: "0.7",
          });
        }


        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=1800",
          },
        });
      },
    },
  },
});
