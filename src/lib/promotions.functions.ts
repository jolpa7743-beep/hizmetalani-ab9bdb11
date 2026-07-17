import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============================================================
// TYPES
// ============================================================

export type PromotionKind = "featured" | "showcase" | "urgent" | "top";

export type PromotionPackage = {
  id: string;
  name: string;
  kind: PromotionKind;
  duration_hours: number;
  price_try: number;
  boost_score: number;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

export type BankAccount = {
  id: string;
  bank_name: string;
  account_holder: string;
  iban: string;
  branch: string | null;
  note: string | null;
  is_active: boolean;
  sort_order: number;
};

export type Payment = {
  id: string;
  user_id: string;
  amount_try: number;
  method: "shopier" | "bank_transfer" | "manual";
  status: "pending" | "paid" | "failed" | "refunded" | "cancelled";
  reference: string;
  external_id: string | null;
  promotion_id: string | null;
  bank_note: string | null;
  admin_note: string | null;
  paid_at: string | null;
  created_at: string;
  user_name?: string | null;
  package_name?: string | null;
  listing_id?: string | null;
  listing_title?: string | null;
};

export type SponsorAd = {
  id: string;
  slot: "header" | "sidebar" | "footer" | "in_article" | "home_hero" | "listing_inline";
  title: string;
  sponsor_name: string | null;
  image_url: string;
  target_url: string;
  alt_text: string | null;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  impressions: number;
  clicks: number;
};

// ============================================================
// PACKAGES (public read)
// ============================================================

export const getActivePackages = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const sb = createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb
    .from("promotion_packages")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PromotionPackage[];
});

export const adminListPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("promotion_packages" as never)
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as PromotionPackage[];
  });

export const adminSavePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<PromotionPackage> & { id?: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = { ...data } as Record<string, unknown>;
    delete payload.id;
    if (data.id) {
      const { error } = await supabaseAdmin.from("promotion_packages" as never).update(payload as never).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("promotion_packages" as never).insert(payload as never);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeletePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("promotion_packages" as never).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// USER PROMOTION FLOW
// ============================================================

export const createPromotionOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { listingId: string; packageId: string; method: "shopier" | "bank_transfer" }) => d)
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc("create_promotion_order" as never, {
      _listing_id: data.listingId,
      _package_id: data.packageId,
      _method: data.method,
    } as never);
    if (error) throw new Error(error.message);
    return res as {
      promotion_id: string;
      payment_id: string;
      reference: string;
      amount: number;
      method: string;
    };
  });

export const getMyPromotions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("listing_promotions" as never)
      .select("*, promotion_packages(name, kind), listings(title), payments(status, method, reference)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ============================================================
// BANK ACCOUNTS (public list of active)
// ============================================================

export const getActiveBankAccounts = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const sb = createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb
    .from("bank_accounts")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as BankAccount[];
});

export const adminListBankAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("bank_accounts" as never)
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as BankAccount[];
  });

export const adminSaveBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<BankAccount> & { id?: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = { ...data } as Record<string, unknown>;
    delete payload.id;
    if (data.id) {
      const { error } = await supabaseAdmin.from("bank_accounts" as never).update(payload as never).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("bank_accounts" as never).insert(payload as never);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeleteBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("bank_accounts" as never).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// PAYMENTS (admin)
// ============================================================

export const adminListPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("admin_list_payments" as never, {
      _status: data.status ?? null,
    } as never);
    if (error) throw new Error(error.message);
    return (rows ?? []) as Payment[];
  });

export const adminApproveBankPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { paymentId: string; note?: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_approve_bank_payment" as never, {
      _payment_id: data.paymentId,
      _note: data.note ?? null,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRejectPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { paymentId: string; note?: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_reject_payment" as never, {
      _payment_id: data.paymentId,
      _note: data.note ?? null,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// SHOPIER SETTINGS (admin only)
// ============================================================

export type ShopierSettings = {
  id: number;
  is_enabled: boolean;
  test_mode: boolean;
  api_key: string | null;
  api_secret: string | null;
  website_index: number | null;
  callback_url: string | null;
};

export const adminGetShopierSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("shopier_settings" as never)
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? null) as ShopierSettings | null;
  });

export const adminSaveShopierSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<Omit<ShopierSettings, "id">>) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("shopier_settings" as never)
      .update({ ...data, updated_at: new Date().toISOString() } as never)
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// SPONSOR ADS
// ============================================================

/** Returns one active ad for the given slot (weighted by priority). Public. */
export const getSponsorAd = createServerFn({ method: "GET" })
  .inputValidator((d: { slot: string }) => d)
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const sb = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const now = new Date().toISOString();
    const { data: ads, error } = await sb
      .from("sponsor_ads")
      .select("id, slot, title, sponsor_name, image_url, target_url, alt_text, priority, starts_at, ends_at")
      .eq("slot", data.slot)
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    const list = ((ads ?? []) as SponsorAd[]).filter((a) =>
      (!a.starts_at || a.starts_at <= now) && (!a.ends_at || a.ends_at >= now)
    );
    if (list.length === 0) return null;
    const total = list.reduce((s, a) => s + Math.max(1, a.priority + 1), 0);
    let r = Math.random() * total;
    for (const a of list) {
      r -= Math.max(1, a.priority + 1);
      if (r <= 0) return a;
    }
    return list[0];
  });

export const trackAdEvent = createServerFn({ method: "POST" })
  .inputValidator((d: { adId: string; event: "impression" | "click" }) => d)
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const sb = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await sb.rpc("track_ad_event", { _ad_id: data.adId, _event: data.event });
    return { ok: true };
  });

export const adminListSponsorAds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sponsor_ads" as never)
      .select("*")
      .order("slot", { ascending: true })
      .order("priority", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as SponsorAd[];
  });

export const adminSaveSponsorAd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<SponsorAd> & { id?: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = { ...data } as Record<string, unknown>;
    delete payload.id;
    delete payload.impressions;
    delete payload.clicks;
    if (data.id) {
      const { error } = await supabaseAdmin.from("sponsor_ads" as never).update(payload as never).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("sponsor_ads" as never).insert(payload as never);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeleteSponsorAd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("sponsor_ads" as never).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
