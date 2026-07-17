import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminListAllPosts, adminSavePost, adminDeletePost, adminGetPost, type PostInput } from "@/lib/blog.functions";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/blog")({
  component: BlogAdmin,
  head: () => ({ meta: [{ title: "Blog Yönetimi — Panel" }] }),
});

function BlogAdmin() {
  const list = useServerFn(adminListAllPosts);
  const del = useServerFn(adminDeletePost);
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: () => list(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Yazı silindi");
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = () => {
    setEditingId(null);
    setShowEditor(true);
  };
  const openEdit = (id: string) => {
    setEditingId(id);
    setShowEditor(true);
  };

  if (showEditor) {
    return <PostEditor id={editingId} onClose={() => { setShowEditor(false); qc.invalidateQueries({ queryKey: ["admin-blog-posts"] }); }} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Blog Yönetimi</h1>
          <p className="text-sm text-muted-foreground">SEO odaklı blog yazılarını buradan yönetin.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg font-medium hover:opacity-90">
          <Plus className="size-4" /> Yeni Yazı
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Yükleniyor...</div>
      ) : posts.length === 0 ? (
        <div className="border rounded-xl p-8 text-center text-muted-foreground">Henüz yazı yok.</div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Başlık</th>
                <th className="text-left px-4 py-2 font-semibold">Durum</th>
                <th className="text-left px-4 py-2 font-semibold">Kategori</th>
                <th className="text-right px-4 py-2 font-semibold">Görüntülenme</th>
                <th className="text-right px-4 py-2 font-semibold">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2">
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">/blog/{p.slug}</div>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "published" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {p.status === "published" ? "Yayında" : "Taslak"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{p.category ?? "-"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{p.view_count}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex gap-1">
                      {p.status === "published" && (
                        <Link to="/blog/$slug" params={{ slug: p.slug }} className="p-1.5 hover:bg-muted rounded" title="Görüntüle">
                          <Eye className="size-4" />
                        </Link>
                      )}
                      <button onClick={() => openEdit(p.id)} className="p-1.5 hover:bg-muted rounded" title="Düzenle">
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`"${p.title}" silinsin mi?`)) deleteMut.mutate(p.id);
                        }}
                        className="p-1.5 hover:bg-muted rounded text-red-600"
                        title="Sil"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PostEditor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const getFn = useServerFn(adminGetPost);
  const saveFn = useServerFn(adminSavePost);
  const navigate = useNavigate();

  const { data: existing } = useQuery({
    queryKey: ["admin-blog-post", id],
    queryFn: () => (id ? getFn({ data: { id } }) : Promise.resolve(null)),
    enabled: !!id,
  });

  const [form, setForm] = useState<PostInput>({
    slug: "",
    title: "",
    excerpt: "",
    content: "",
    cover_url: "",
    category: "",
    tags: [],
    status: "draft",
    meta_title: "",
    meta_description: "",
  });

  const [loaded, setLoaded] = useState(false);
  if (existing && !loaded) {
    setForm({
      id: existing.id,
      slug: existing.slug,
      title: existing.title,
      excerpt: existing.excerpt ?? "",
      content: existing.content,
      cover_url: existing.cover_url ?? "",
      category: existing.category ?? "",
      tags: existing.tags ?? [],
      status: existing.status,
      meta_title: existing.meta_title ?? "",
      meta_description: existing.meta_description ?? "",
    });
    setLoaded(true);
  }

  const saveMut = useMutation({
    mutationFn: () => saveFn({ data: form }),
    onSuccess: () => {
      toast.success(form.status === "published" ? "Yayınlandı" : "Kaydedildi");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = <K extends keyof PostInput>(k: K, v: PostInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{id ? "Yazıyı Düzenle" : "Yeni Yazı"}</h1>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border hover:bg-muted">Vazgeç</button>
          <button
            onClick={() => {
              update("status", "draft");
              setTimeout(() => saveMut.mutate(), 0);
            }}
            disabled={saveMut.isPending}
            className="px-4 py-2 rounded-lg border hover:bg-muted"
          >
            Taslak Kaydet
          </button>
          <button
            onClick={() => {
              update("status", "published");
              setTimeout(() => saveMut.mutate(), 0);
            }}
            disabled={saveMut.isPending}
            className="px-4 py-2 rounded-lg bg-brand text-white hover:opacity-90"
          >
            Yayınla
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Başlık</label>
            <input
              className="w-full mt-1 px-3 py-2 border rounded-lg"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              maxLength={160}
              placeholder="Kartal Ev Temizliği Fiyatları 2026"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Slug (URL)</label>
            <input
              className="w-full mt-1 px-3 py-2 border rounded-lg font-mono text-sm"
              value={form.slug}
              onChange={(e) => update("slug", e.target.value)}
              placeholder="kartal-ev-temizligi-fiyatlari-2026"
            />
            <p className="text-xs text-muted-foreground mt-1">Boş bırakırsanız başlıktan üretilir. Bir kez yayına aldıktan sonra değiştirmemeye çalışın.</p>
          </div>
          <div>
            <label className="text-sm font-medium">Özet</label>
            <textarea
              className="w-full mt-1 px-3 py-2 border rounded-lg"
              rows={2}
              value={form.excerpt ?? ""}
              onChange={(e) => update("excerpt", e.target.value)}
              maxLength={320}
              placeholder="Kısa, çekici bir özet (160-220 karakter ideal)."
            />
          </div>
          <div>
            <label className="text-sm font-medium">İçerik (Markdown)</label>
            <textarea
              className="w-full mt-1 px-3 py-2 border rounded-lg font-mono text-sm"
              rows={22}
              value={form.content}
              onChange={(e) => update("content", e.target.value)}
              placeholder="# Başlık&#10;&#10;Metin buraya... Markdown başlıkları (##), listeler (-), **kalın** ve *italik* desteklenir."
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
            <div className="text-sm font-semibold">SEO</div>
            <div>
              <label className="text-xs font-medium">Meta Başlık</label>
              <input
                className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
                value={form.meta_title ?? ""}
                onChange={(e) => update("meta_title", e.target.value)}
                maxLength={70}
                placeholder="60 karakteri geçmeyin"
              />
              <div className="text-[10px] text-muted-foreground text-right">{(form.meta_title ?? "").length}/60</div>
            </div>
            <div>
              <label className="text-xs font-medium">Meta Açıklama</label>
              <textarea
                className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
                rows={3}
                value={form.meta_description ?? ""}
                onChange={(e) => update("meta_description", e.target.value)}
                maxLength={200}
                placeholder="155 karakteri geçmeyin"
              />
              <div className="text-[10px] text-muted-foreground text-right">{(form.meta_description ?? "").length}/155</div>
            </div>
          </div>

          <div className="border rounded-lg p-3 space-y-3">
            <div>
              <label className="text-xs font-medium">Kategori</label>
              <input
                className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
                value={form.category ?? ""}
                onChange={(e) => update("category", e.target.value)}
                placeholder="ev-temizligi"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Etiketler (virgülle)</label>
              <input
                className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
                value={(form.tags ?? []).join(", ")}
                onChange={(e) =>
                  update(
                    "tags",
                    e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  )
                }
                placeholder="kartal, ev temizligi, fiyat"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Kapak Görseli URL</label>
              <input
                className="w-full mt-1 px-2 py-1.5 border rounded text-sm"
                value={form.cover_url ?? ""}
                onChange={(e) => update("cover_url", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          {form.slug && (
            <a
              href={`/blog/${form.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
              onClick={(e) => {
                if (form.status !== "published") {
                  e.preventDefault();
                  toast.info("Önce yayınlayın");
                }
              }}
            >
              Yayında görüntüle <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
