import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SITE_URL = "https://hizmetalani.com";
const INDEXNOW_KEY = "2d53245dca587d60320dca64f43c185c";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

// ---------------- helpers ----------------

async function assertAdmin(context: { supabase: SupabaseCtx; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

type SupabaseCtx = { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>; from: (t: string) => { select: (c: string) => { eq: (k: string, v: unknown) => { order?: (c: string, o?: unknown) => Promise<{ data: unknown }> } } } };

function gcs(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${process.env.LOVABLE_API_KEY!}`);
  headers.set("X-Connection-Api-Key", process.env.GOOGLE_SEARCH_CONSOLE_API_KEY!);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(`${GATEWAY}${path}`, { ...init, headers });
}

// ---------------- GSC: list verified sites ----------------

export const gscListSites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const res = await gcs("/webmasters/v3/sites");
    if (!res.ok) {
      const body = await res.text();
      return { sites: [] as Array<{ siteUrl: string; permissionLevel?: string }>, error: `${res.status}: ${body}` };
    }
    const json = (await res.json()) as { siteEntry?: Array<{ siteUrl: string; permissionLevel?: string }> };
    return { sites: json.siteEntry ?? [], error: null as string | null };
  });

// ---------------- Site URLs from DB + static ----------------

const STATIC_PATHS = [
  "/",
  "/hakkimizda",
  "/iletisim",
  "/kurallar",
  "/gizlilik",
  "/haftanin-firsatlari",
  "/blog",
  "/rehber",
];

export const listSiteUrls = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const supabase = (context as { supabase: { from: (t: string) => { select: (c: string) => { eq: (k: string, v: unknown) => Promise<{ data: unknown }> } } } }).supabase;

    const urls: Array<{ url: string; type: string; label: string }> = STATIC_PATHS.map((p) => ({
      url: `${SITE_URL}${p}`,
      type: "static",
      label: p,
    }));

    const { data: listings } = (await supabase
      .from("listings")
      .select("slug, title")
      .eq("status", "active")) as { data: Array<{ slug: string; title: string }> | null };
    for (const l of listings ?? []) {
      if (!l.slug) continue;
      urls.push({ url: `${SITE_URL}/ilan/${l.slug}`, type: "listing", label: l.title ?? l.slug });
    }

    const { data: posts } = (await supabase
      .from("blog_posts")
      .select("slug, title")
      .eq("published", true)) as { data: Array<{ slug: string; title: string }> | null };
    for (const p of posts ?? []) {
      urls.push({ url: `${SITE_URL}/blog/${p.slug}`, type: "blog", label: p.title ?? p.slug });
    }

    return { urls };
  });

// ---------------- GSC: URL inspection (batch) ----------------

const inspectSchema = z.object({
  siteUrl: z.string().min(1),
  urls: z.array(z.string().url()).min(1).max(25),
});

type InspectResult = {
  url: string;
  coverageState?: string;
  verdict?: string;
  indexingState?: string;
  lastCrawlTime?: string;
  robotsTxtState?: string;
  pageFetchState?: string;
  googleCanonical?: string;
  userCanonical?: string;
  error?: string;
};

export const gscInspectBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inspectSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ results: InspectResult[] }> => {
    await assertAdmin(context as never);

    const inspectOne = async (url: string): Promise<InspectResult> => {
      const res = await gcs("/v1/urlInspection/index:inspect", {
        method: "POST",
        body: JSON.stringify({ inspectionUrl: url, siteUrl: data.siteUrl }),
      });
      if (!res.ok) {
        const t = await res.text();
        return { url, error: `${res.status}: ${t.slice(0, 200)}` };
      }
      const j = (await res.json()) as {
        inspectionResult?: {
          indexStatusResult?: {
            verdict?: string;
            coverageState?: string;
            indexingState?: string;
            lastCrawlTime?: string;
            robotsTxtState?: string;
            pageFetchState?: string;
            googleCanonical?: string;
            userCanonical?: string;
          };
        };
      };
      const r = j.inspectionResult?.indexStatusResult ?? {};
      return {
        url,
        verdict: r.verdict,
        coverageState: r.coverageState,
        indexingState: r.indexingState,
        lastCrawlTime: r.lastCrawlTime,
        robotsTxtState: r.robotsTxtState,
        pageFetchState: r.pageFetchState,
        googleCanonical: r.googleCanonical,
        userCanonical: r.userCanonical,
      };
    };

    // Concurrency: 4 in flight (GSC has QPM limits ~600/day/property)
    const results: InspectResult[] = [];
    const queue = [...data.urls];
    const workers = Array.from({ length: 4 }, async () => {
      while (queue.length) {
        const u = queue.shift();
        if (!u) return;
        results.push(await inspectOne(u));
      }
    });
    await Promise.all(workers);
    // Preserve input order
    const order = new Map(data.urls.map((u, i) => [u, i]));
    results.sort((a, b) => (order.get(a.url) ?? 0) - (order.get(b.url) ?? 0));
    return { results };
  });

// ---------------- IndexNow (Bing + Yandex) ----------------

const indexNowSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(10000),
});

export const submitIndexNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => indexNowSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);

    const host = new URL(SITE_URL).host;
    const body = {
      host,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: data.urls,
    };

    const endpoints = [
      "https://api.indexnow.org/indexnow",
      "https://www.bing.com/indexnow",
      "https://yandex.com/indexnow",
    ];

    const results = await Promise.all(
      endpoints.map(async (ep) => {
        try {
          const res = await fetch(ep, {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify(body),
          });
          return { endpoint: ep, status: res.status, ok: res.ok };
        } catch (e) {
          return { endpoint: ep, status: 0, ok: false, error: (e as Error).message };
        }
      }),
    );
    return { results, submitted: data.urls.length, key: INDEXNOW_KEY };
  });

// ---------------- GSC: sitemap submit ----------------

export const gscSubmitSitemap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ siteUrl: z.string(), sitemapUrl: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const path = `/webmasters/v3/sites/${encodeURIComponent(data.siteUrl)}/sitemaps/${encodeURIComponent(data.sitemapUrl)}`;
    const res = await gcs(path, { method: "PUT" });
    return { ok: res.ok, status: res.status };
  });
