import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALLOWED_TABLES = [
  "profiles", "listings", "reviews", "review_reports", "messages", "conversations",
  "payments", "listing_promotions", "promotion_packages", "bank_accounts",
  "sponsor_ads", "shopier_settings", "smtp_settings", "site_settings",
  "announcements", "tickets", "ticket_messages", "mod_actions", "app_logs",
  "category_groups", "category_overrides", "user_roles", "verification_codes",
  "blog_posts",
] as const;

export type AllowedTable = (typeof ALLOWED_TABLES)[number];
export const TABLES: AllowedTable[] = [...ALLOWED_TABLES];

export const adminTableCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_table_counts");
    if (error) throw new Error(error.message);
    return (data ?? {}) as Record<string, number>;
  });

export const adminTableRows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { table: string; limit?: number }) => d)
  .handler(async ({ data, context }) => {
    if (!ALLOWED_TABLES.includes(data.table as AllowedTable)) {
      throw new Error("Tablo listede yok.");
    }
    const { data: rows, error } = await context.supabase.rpc("admin_table_rows", {
      _table: data.table,
      _limit: Math.min(Math.max(data.limit ?? 100, 1), 500),
    });
    if (error) throw new Error(error.message);
    type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
    return (rows ?? []) as Array<{ [k: string]: Json }>;
  });

// ---- Storage manager ----
export const adminListBuckets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.storage.listBuckets();
    if (error) throw new Error(error.message);
    return (data ?? []).map((b) => ({ name: b.name, public: b.public, created_at: b.created_at }));
  });

export const adminListBucketFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { bucket: string; prefix?: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: files, error } = await supabaseAdmin.storage
      .from(data.bucket)
      .list(data.prefix ?? "", { limit: 500, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw new Error(error.message);
    return (files ?? []).map((f) => ({
      name: f.name,
      size: (f.metadata as { size?: number } | null)?.size ?? 0,
      mimetype: (f.metadata as { mimetype?: string } | null)?.mimetype ?? "",
      created_at: f.created_at,
      updated_at: f.updated_at,
      id: f.id,
    }));
  });

export const adminSignedFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { bucket: string; path: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from(data.bucket)
      .createSignedUrl(data.path, 60 * 30);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const adminDeleteFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { bucket: string; path: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage.from(data.bucket).remove([data.path]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
