import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminListBuckets, adminListBucketFiles, adminSignedFileUrl, adminDeleteFile } from "@/lib/admin-data.functions";
import { HardDrive, Trash2, ExternalLink, File as FileIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/dosyalar")({
  component: FileManager,
  head: () => ({ meta: [{ title: "Dosya Yöneticisi — Panel" }] }),
});

function FileManager() {
  const bucketsFn = useServerFn(adminListBuckets);
  const filesFn = useServerFn(adminListBucketFiles);
  const urlFn = useServerFn(adminSignedFileUrl);
  const delFn = useServerFn(adminDeleteFile);
  const qc = useQueryClient();

  const [bucket, setBucket] = useState<string>("");

  const { data: buckets = [] } = useQuery({
    queryKey: ["admin-buckets"],
    queryFn: () => bucketsFn(),
  });

  if (!bucket && buckets[0]) setBucket(buckets[0].name);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["admin-bucket-files", bucket],
    queryFn: () => filesFn({ data: { bucket } }),
    enabled: !!bucket,
  });

  const openMut = useMutation({
    mutationFn: (path: string) => urlFn({ data: { bucket, path } }),
    onSuccess: ({ url }) => window.open(url, "_blank"),
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (path: string) => delFn({ data: { bucket, path } }),
    onSuccess: () => {
      toast.success("Silindi");
      qc.invalidateQueries({ queryKey: ["admin-bucket-files", bucket] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HardDrive className="size-6" /> Dosya Yöneticisi
        </h1>
        <p className="text-sm text-muted-foreground">Depolama alanlarındaki dosyaları görüntüleyin, imzalı bağlantı ile indirin veya silin.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {buckets.map((b) => (
          <button
            key={b.name}
            onClick={() => setBucket(b.name)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              bucket === b.name ? "bg-brand text-white border-brand" : "hover:bg-muted"
            }`}
          >
            {b.name} <span className="text-[10px] opacity-70">{b.public ? "public" : "private"}</span>
          </button>
        ))}
      </div>

      <div className="border rounded-xl overflow-hidden bg-card">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Yükleniyor...</div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Bu bucket'ta dosya yok.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Dosya</th>
                <th className="text-left px-4 py-2 font-semibold">Tip</th>
                <th className="text-right px-4 py-2 font-semibold">Boyut</th>
                <th className="text-left px-4 py-2 font-semibold">Tarih</th>
                <th className="text-right px-4 py-2 font-semibold">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.name} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2 flex items-center gap-2">
                    <FileIcon className="size-4 text-muted-foreground" /> {f.name}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{f.mimetype || "-"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatSize(f.size)}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    {f.created_at ? new Date(f.created_at).toLocaleDateString("tr-TR") : "-"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => openMut.mutate(f.name)}
                        className="p-1.5 hover:bg-muted rounded"
                        title="İndir / Aç"
                      >
                        <ExternalLink className="size-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`"${f.name}" silinsin mi?`)) delMut.mutate(f.name);
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
        )}
      </div>
    </div>
  );
}

function formatSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
