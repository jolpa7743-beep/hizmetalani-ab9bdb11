import { createServerFn } from "@tanstack/react-start";

export type WeeklyDealListing = {
  id: string;
  slug: string | null;
  user_id: string;
  title: string;
  type: "offering" | "seeking";
  category: string;
  city: string;
  district: string | null;
  price: number | null;
  price_type: string;
  created_at: string;
  description: string;
  view_count: number | null;
  is_featured: boolean;
  is_showcase: boolean;
  is_urgent: boolean;
  is_boosted: boolean;
  boost_score: number;
  weekly_ends_at: string | null;
};

export const getWeeklyDeals = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const sb = createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });

  // Aktif weekly_deal promosyon id/bitiş listesi (SECURITY DEFINER RPC ile anon erişimi)
  const { data: promos, error: pErr } = await sb.rpc("public_weekly_deal_listings");
  if (pErr) throw new Error(pErr.message);

  const rows = (promos ?? []) as Array<{ listing_id: string; ends_at: string | null }>;
  const ids = Array.from(new Set(rows.map((p) => p.listing_id)));
  if (ids.length === 0) return [] as WeeklyDealListing[];

  const endsMap = new Map<string, string | null>();
  for (const p of rows) endsMap.set(p.listing_id, p.ends_at);

  const { data: listings, error: lErr } = await sb
    .from("listings")
    .select("id, slug, user_id, title, type, category, city, district, price, price_type, created_at, description, view_count, is_featured, is_showcase, is_urgent, is_boosted, boost_score")
    .in("id", ids)
    .eq("status", "active")
    .order("boost_score", { ascending: false })
    .order("created_at", { ascending: false });
  if (lErr) throw new Error(lErr.message);

  return ((listings ?? []) as unknown as WeeklyDealListing[]).map((l) => ({
    ...l,
    weekly_ends_at: endsMap.get(l.id) ?? null,
  }));
});
