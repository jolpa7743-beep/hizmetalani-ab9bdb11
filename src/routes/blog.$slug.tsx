import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getPublishedPost } from "@/lib/blog.functions";
import { renderMarkdown } from "@/lib/markdown";
import { Calendar, Eye, ArrowLeft } from "lucide-react";

const BASE = "https://hizmetalani.lovable.app";

const postQuery = (slug: string) =>
  queryOptions({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const p = await getPublishedPost({ data: { slug } });
      if (!p) throw notFound();
      return p;
    },
  });

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params, context }) => context.queryClient.ensureQueryData(postQuery(params.slug)),
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Yazı bulunamadı" }, { name: "robots", content: "noindex" }] };
    }
    const url = `${BASE}/blog/${params.slug}`;
    const title = loaderData.meta_title || `${loaderData.title} | HizmetAlanı Blog`;
    const desc = loaderData.meta_description || loaderData.excerpt || loaderData.title;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(loaderData.cover_url ? [{ property: "og:image", content: loaderData.cover_url }] : []),
        { property: "article:published_time", content: loaderData.published_at ?? "" },
        { name: "twitter:card", content: loaderData.cover_url ? "summary_large_image" : "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: loaderData.title,
            description: desc,
            datePublished: loaderData.published_at,
            dateModified: loaderData.updated_at,
            mainEntityOfPage: url,
            image: loaderData.cover_url || undefined,
            author: { "@type": "Organization", name: "HizmetAlanı" },
            publisher: {
              "@type": "Organization",
              name: "HizmetAlanı",
              logo: { "@type": "ImageObject", url: `${BASE}/favicon.ico` },
            },
            keywords: (loaderData.tags ?? []).join(", "),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: `${BASE}/` },
              { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE}/blog` },
              { "@type": "ListItem", position: 3, name: loaderData.title, item: url },
            ],
          }),
        },
      ],
    };
  },
  component: PostView,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Yazı bulunamadı</h1>
      <Link to="/blog" className="text-brand mt-4 inline-block">Bloga dön</Link>
    </div>
  ),
  errorComponent: ({ reset }) => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Bir hata oluştu</h1>
      <button onClick={reset} className="mt-4 text-brand">Yeniden dene</button>
    </div>
  ),
});

function PostView() {
  const params = Route.useParams();
  const { data: post } = useSuspenseQuery(postQuery(params.slug));

  return (
    <article className="min-h-screen bg-muted/10">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="size-4" /> Tüm yazılar
        </Link>

        <header className="mb-8">
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            {post.category && <span className="bg-brand/10 text-brand px-2 py-0.5 rounded-full">{post.category}</span>}
            {post.published_at && (
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                {new Date(post.published_at).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            )}
            <span className="flex items-center gap-1"><Eye className="size-3" /> {post.view_count} görüntülenme</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight leading-tight">{post.title}</h1>
          {post.excerpt && <p className="text-lg text-muted-foreground mt-4">{post.excerpt}</p>}
        </header>

        {post.cover_url && (
          <img src={post.cover_url} alt={post.title} className="w-full rounded-xl mb-8" loading="lazy" />
        )}

        <div
          className="prose prose-slate max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
        />

        {post.tags.length > 0 && (
          <div className="mt-10 pt-6 border-t flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <span key={t} className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">#{t}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
