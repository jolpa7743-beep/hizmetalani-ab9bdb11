import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_url: string | null;
  category: string | null;
  tags: string[];
  status: "draft" | "published";
  author_id: string | null;
  meta_title: string | null;
  meta_description: string | null;
  view_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BlogListItem = Pick<
  BlogPost,
  "id" | "slug" | "title" | "excerpt" | "cover_url" | "category" | "tags" | "published_at" | "view_count"
>;

// ---- Public reads ----
export const listPublishedPosts = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("blog_posts")
    .select("id, slug, title, excerpt, cover_url, category, tags, published_at, view_count")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as BlogListItem[];
});

export const getPublishedPost = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: post, error } = await sb
      .from("blog_posts")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!post) return null;
    // bump view
    await sb.rpc("increment_blog_view", { _slug: data.slug });
    return post as BlogPost;
  });

// ---- Admin CRUD ----
export const adminListAllPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, cover_url, category, tags, status, published_at, view_count, updated_at")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminGetPost = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: p, error } = await context.supabase
      .from("blog_posts")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return p as BlogPost | null;
  });

export type PostInput = {
  id?: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  content: string;
  cover_url?: string | null;
  category?: string | null;
  tags?: string[];
  status: "draft" | "published";
  meta_title?: string | null;
  meta_description?: string | null;
};

function slugify(v: string) {
  return v
    .toLocaleLowerCase("tr")
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export const adminSavePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: PostInput) => d)
  .handler(async ({ data, context }) => {
    const slug = slugify(data.slug || data.title);
    if (!slug || !data.title.trim() || !data.content.trim()) {
      throw new Error("Başlık, slug ve içerik zorunlu.");
    }
    const payload = {
      slug,
      title: data.title.trim(),
      excerpt: data.excerpt?.trim() || null,
      content: data.content,
      cover_url: data.cover_url || null,
      category: data.category || null,
      tags: data.tags ?? [],
      status: data.status,
      meta_title: data.meta_title?.trim() || null,
      meta_description: data.meta_description?.trim() || null,
      author_id: context.userId,
      published_at:
        data.status === "published"
          ? data.id
            ? undefined // keep existing when editing
            : new Date().toISOString()
          : null,
    };
    if (data.id) {
      const { published_at, ...rest } = payload;
      const upd = published_at === undefined ? rest : { ...rest, published_at };
      const { error } = await context.supabase.from("blog_posts").update(upd).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    } else {
      const insertPayload = { ...payload, published_at: payload.published_at ?? null };
      const { data: ins, error } = await context.supabase
        .from("blog_posts")
        .insert(insertPayload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, id: ins.id };
    }
  });

export const adminDeletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("blog_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
