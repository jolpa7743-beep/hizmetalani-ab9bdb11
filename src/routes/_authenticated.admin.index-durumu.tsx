import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Send, Zap, CheckCircle2, XCircle, AlertCircle, ExternalLink } from "lucide-react";
import {
  gscListSites,
  listSiteUrls,
  gscInspectBatch,
  submitIndexNow,
  gscSubmitSitemap,
} from "@/lib/indexing.functions";

export const Route = createFileRoute("/_authenticated/admin/index-durumu")({
  component: IndexDurumuPage,
  head: () => ({ meta: [{ title: "Google İndex Durumu" }] }),
});

type Inspection = {
  url: string;
  verdict?: string;
  coverageState?: string;
  indexingState?: string;
  lastCrawlTime?: string;
  error?: string;
};

const PAGE_SIZE = 20;

function IndexDurumuPage() {
  const qc = useQueryClient();
  const fetchSites = useServerFn(gscListSites);
  const fetchUrls = useServerFn(listSiteUrls);
  const inspect = useServerFn(gscInspectBatch);
  const indexnow = useServerFn(submitIndexNow);
  const submitSitemap = useServerFn(gscSubmitSitemap);

  const sitesQ = useQuery({ queryKey: ["gsc-sites"], queryFn: () => fetchSites() });
  const urlsQ = useQuery({ queryKey: ["site-urls"], queryFn: () => fetchUrls() });

  const [siteUrl, setSiteUrl] = useState<string>("");
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "static" | "listing" | "blog">("all");
  const [page, setPage] = useState(0);
  const [inspections, setInspections] = useState<Record<string, Inspection>>({});

  const activeSite = siteUrl || sitesQ.data?.sites[0]?.siteUrl || "";

  const filteredUrls = useMemo(() => {
    const all = urlsQ.data?.urls ?? [];
    return all.filter((u) => {
      if (typeFilter !== "all" && u.type !== typeFilter) return false;
      if (filter && !u.url.toLowerCase().includes(filter.toLowerCase()) && !u.label.toLowerCase().includes(filter.toLowerCase())) return false;
      return true;
    });
  }, [urlsQ.data, filter, typeFilter]);

  const pageUrls = useMemo(
    () => filteredUrls.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredUrls, page],
  );

  const totalPages = Math.max(1, Math.ceil(filteredUrls.length / PAGE_SIZE));

  const inspectMutation = useMutation({
    mutationFn: async (urls: string[]) => inspect({ data: { siteUrl: activeSite, urls } }),
    onSuccess: (res) => {
      setInspections((prev) => {
        const next = { ...prev };
        for (const r of res.results) next[r.url] = r;
        return next;
      });
      toast.success(`${res.results.length} URL kontrol edildi`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const indexnowMutation = useMutation({
    mutationFn: async (urls: string[]) => indexnow({ data: { urls } }),
    onSuccess: (res) => {
      const ok = res.results.filter((r) => r.ok).length;
      toast.success(`IndexNow: ${ok}/${res.results.length} servise ${res.submitted} URL gönderildi`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sitemapMutation = useMutation({
    mutationFn: async () => submitSitemap({ data: { siteUrl: activeSite, sitemapUrl: "https://hizmetalani.com/sitemap.xml" } }),
    onSuccess: () => toast.success("Sitemap Google'a bildirildi"),
    onError: (e: Error) => toast.error(e.message),
  });

  // Summary
  const summary = useMemo(() => {
    const values = Object.values(inspections);
    const indexed = values.filter((v) => v.coverageState?.toLowerCase().includes("submitted and indexed") || v.verdict === "PASS").length;
    const notIndexed = values.filter((v) => v.verdict && v.verdict !== "PASS").length;
    const errors = values.filter((v) => v.error).length;
    return { checked: values.length, indexed, notIndexed, errors };
  }, [inspections]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Google İndex Durumu</h1>
          <p className="text-sm text-muted-foreground">
            Google Search Console entegrasyonu ile sayfalarınızın indeks durumunu görüntüleyin ve IndexNow ile Bing/Yandex'e anında bildirim gönderin.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => sitemapMutation.mutate()} disabled={!activeSite || sitemapMutation.isPending}>
            {sitemapMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Sitemap gönder
          </Button>
          <Button
            onClick={() => indexnowMutation.mutate(filteredUrls.map((u) => u.url))}
            disabled={indexnowMutation.isPending || filteredUrls.length === 0}
          >
            {indexnowMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
            IndexNow ile tümünü bildir
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Toplam URL" value={urlsQ.data?.urls.length ?? 0} />
        <StatCard label="Kontrol Edilen" value={summary.checked} />
        <StatCard label="İndekste" value={summary.indexed} tone="success" />
        <StatCard label="Sorunlu" value={summary.notIndexed + summary.errors} tone="warn" />
      </div>

      {/* Site + filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ayarlar</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Search Console mülkü</label>
            {sitesQ.isLoading ? (
              <div className="text-sm mt-1"><Loader2 className="inline size-3 animate-spin mr-1" /> Yükleniyor…</div>
            ) : sitesQ.data?.error ? (
              <div className="text-xs text-destructive mt-1">Hata: {sitesQ.data.error}</div>
            ) : (sitesQ.data?.sites.length ?? 0) === 0 ? (
              <div className="text-xs text-muted-foreground mt-1">
                Search Console'da doğrulanmış mülk yok. Önce Google Search Console'da hizmetalani.com'u doğrulayın.
              </div>
            ) : (
              <Select value={activeSite} onValueChange={setSiteUrl}>
                <SelectTrigger><SelectValue placeholder="Site seçin" /></SelectTrigger>
                <SelectContent>
                  {sitesQ.data?.sites.map((s) => (
                    <SelectItem key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tür</label>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as typeof typeFilter); setPage(0); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="static">Sabit sayfalar</SelectItem>
                <SelectItem value="listing">İlanlar</SelectItem>
                <SelectItem value="blog">Blog</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Ara</label>
            <Input placeholder="URL veya başlık…" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }} />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">
            URL'ler ({filteredUrls.length}) — Sayfa {page + 1}/{totalPages}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => inspectMutation.mutate(pageUrls.map((u) => u.url))}
              disabled={!activeSite || inspectMutation.isPending || pageUrls.length === 0}
            >
              {inspectMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              Bu sayfayı kontrol et
            </Button>
            <Button
              size="sm"
              onClick={() => indexnowMutation.mutate(pageUrls.map((u) => u.url))}
              disabled={indexnowMutation.isPending || pageUrls.length === 0}
              variant="secondary"
            >
              <Zap className="size-3.5" /> IndexNow gönder
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">URL</th>
                  <th className="text-left px-3 py-2">Tür</th>
                  <th className="text-left px-3 py-2">Durum</th>
                  <th className="text-left px-3 py-2">Kapsam</th>
                  <th className="text-left px-3 py-2">Son tarama</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {urlsQ.isLoading ? (
                  <tr><td colSpan={6} className="p-6 text-center"><Loader2 className="inline size-4 animate-spin" /></td></tr>
                ) : pageUrls.length === 0 ? (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Kayıt yok</td></tr>
                ) : pageUrls.map((u) => {
                  const insp = inspections[u.url];
                  return (
                    <tr key={u.url} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 max-w-[380px]">
                        <a href={u.url} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline inline-flex items-center gap-1 truncate">
                          <span className="truncate">{u.label}</span>
                          <ExternalLink className="size-3 shrink-0" />
                        </a>
                        <div className="text-[11px] text-muted-foreground truncate">{u.url}</div>
                      </td>
                      <td className="px-3 py-2"><TypeBadge type={u.type} /></td>
                      <td className="px-3 py-2">{insp ? <VerdictBadge insp={insp} /> : <span className="text-muted-foreground text-xs">—</span>}</td>
                      <td className="px-3 py-2 text-xs">{insp?.coverageState ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">{insp?.lastCrawlTime ? new Date(insp.lastCrawlTime).toLocaleDateString("tr-TR") : "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => inspectMutation.mutate([u.url])}
                          disabled={!activeSite || inspectMutation.isPending}
                        >
                          <RefreshCw className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between p-3 border-t">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Önceki</Button>
            <span className="text-xs text-muted-foreground">Sayfa {page + 1} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Sonraki</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Nasıl çalışır?</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>• <strong>Google Search Console</strong> ile URL denetimi yapılır: her URL için Google'ın en son indeks durumu, kapsam ve son tarama tarihi çekilir. (Günlük 2000 sorgu limiti vardır.)</p>
          <p>• <strong>IndexNow</strong> tek tıkla Bing ve Yandex'e URL bildirir; onaylı anahtarınız <code>/{`${'2d53245dca587d60320dca64f43c185c'}.txt`}</code> adresinde barındırılıyor.</p>
          <p>• <strong>Sitemap gönder</strong> butonu <code>/sitemap.xml</code> dosyasını Search Console'a resmi olarak kaydeder.</p>
          <p>• Google, IndexNow'ı desteklemez; Google için sitemap + URL inceleme + kaliteli iç linkleme kullanın.</p>
        </CardContent>
      </Card>

      <button className="hidden" onClick={() => qc.invalidateQueries()} />
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "success" | "warn" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold ${tone === "success" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    static: "bg-slate-100 text-slate-700",
    listing: "bg-blue-100 text-blue-700",
    blog: "bg-purple-100 text-purple-700",
  };
  const label: Record<string, string> = { static: "Sabit", listing: "İlan", blog: "Blog" };
  return <span className={`text-[11px] px-2 py-0.5 rounded ${map[type] ?? "bg-muted"}`}>{label[type] ?? type}</span>;
}

function VerdictBadge({ insp }: { insp: Inspection }) {
  if (insp.error) return <Badge variant="destructive" className="gap-1"><AlertCircle className="size-3" /> Hata</Badge>;
  if (insp.verdict === "PASS") return <Badge className="bg-emerald-600 gap-1"><CheckCircle2 className="size-3" /> İndekste</Badge>;
  if (insp.verdict === "PARTIAL") return <Badge className="bg-amber-500 gap-1"><AlertCircle className="size-3" /> Kısmi</Badge>;
  if (insp.verdict === "FAIL") return <Badge variant="destructive" className="gap-1"><XCircle className="size-3" /> Yok</Badge>;
  return <Badge variant="secondary">{insp.verdict ?? "?"}</Badge>;
}
