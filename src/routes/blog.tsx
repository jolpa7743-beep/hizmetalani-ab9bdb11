import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listPublishedPosts, type BlogListItem } from "@/lib/blog.functions";
import { Calendar, Eye, ArrowRight } from "lucide-react";

const CANONICAL = "https://hizmetalani.lovable.app/blog";

const postsQuery = queryOptions({
  queryKey: ["blog-published"],
  queryFn: () => listPublishedPosts(),
});

export const Route = createFileRoute("/blog")({
  loader: ({ context }) => context.queryClient.ensureQueryData(postsQuery),
  head: () => ({
    meta: [
      { title: "Ev Hizmetleri Blog — İpuçları, Fiyatlar ve Rehberler | HizmetAlanı" },
      { name: "description", content: "Ev temizliği, bakıcı, evcil hayvan bakımı ve İstanbul'da güvenilir ev hizmetleri için 2026 rehberleri, fiyat listeleri ve pratik ipuçları." },
      { property: "og:title", content: "Ev Hizmetleri Blog — HizmetAlanı" },
      { property: "og:description", content: "Ev temizliği, bakıcı, pet sitter ve İstanbul rehberleri." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const { data: posts } = useSuspenseQuery(postsQuery);
  return (
    <div className="min-h-screen bg-muted/20">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Ev Hizmetleri Blog</h1>
          <p className="text-lg text-muted-foreground mt-2">
            İstanbul'da ev temizliği, bakıcı ve evcil hayvan bakımı üzerine güncel rehberler, fiyatlar ve ipuçları.
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="border rounded-xl p-12 text-center text-muted-foreground">Henüz yazı yok.</div>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function PostCard({ post }: { post: BlogListItem }) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className="block bg-card border rounded-xl p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
        {post.category && <span className="bg-brand/10 text-brand px-2 py-0.5 rounded-full">{post.category}</span>}
        {post.published_at && (
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            {new Date(post.published_at).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" })}
          </span>
        )}
        <span className="flex items-center gap-1"><Eye className="size-3" /> {post.view_count}</span>
      </div>
      <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
      {post.excerpt && <p className="text-muted-foreground text-sm line-clamp-2">{post.excerpt}</p>}
      <div className="flex items-center gap-1 text-brand text-sm font-medium mt-3">
        Devamını oku <ArrowRight className="size-4" />
      </div>
    </Link>
  );
}
