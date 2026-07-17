import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import {
  adminListSponsorAds, adminSaveSponsorAd, adminDeleteSponsorAd,
  type SponsorAd,
} from "@/lib/promotions.functions";

export const Route = createFileRoute("/_authenticated/admin/reklamlar")({
  component: AdsAdmin,
  head: () => ({ meta: [{ title: "Sponsor Reklamlar" }] }),
});

const SLOT_LABELS: Record<string, string> = {
  header: "Header (üst)", sidebar: "Sidebar", footer: "Footer (alt)",
  in_article: "Yazı içi", home_hero: "Ana sayfa hero", listing_inline: "İlan içi",
};

function AdsAdmin() {
  const qc = useQueryClient();
  const fetchList = useServerFn(adminListSponsorAds);
  const save = useServerFn(adminSaveSponsorAd);
  const del = useServerFn(adminDeleteSponsorAd);
  const { data } = useQuery({ queryKey: ["admin-ads"], queryFn: () => fetchList() });
  const [editing, setEditing] = useState<Partial<SponsorAd> | null>(null);

  const submit = async () => {
    if (!editing?.title || !editing?.image_url || !editing?.target_url || !editing?.slot) return toast.error("Zorunlu alanları doldurun");
    try {
      await save({ data: editing as never });
      toast.success("Kaydedildi");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-ads"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Hata"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Reklamı silmek istiyor musunuz?")) return;
    await del({ data: { id } });
    qc.invalidateQueries({ queryKey: ["admin-ads"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sponsor Reklamlar</h1>
          <p className="text-sm text-muted-foreground">AdSense dışında özel banner reklamlar. Sponsor reklamı varsa AdSense yerine gösterilir.</p>
        </div>
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({ slot: "header", is_active: true, priority: 0 })}><Plus className="size-4 mr-1" /> Yeni Reklam</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing?.id ? "Reklam Düzenle" : "Yeni Reklam"}</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-3">
                <div><Label>Başlık</Label><Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
                <div><Label>Sponsor Adı</Label><Input value={editing.sponsor_name ?? ""} onChange={(e) => setEditing({ ...editing, sponsor_name: e.target.value })} /></div>
                <div>
                  <Label>Slot</Label>
                  <Select value={editing.slot} onValueChange={(v) => setEditing({ ...editing, slot: v as never })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SLOT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Görsel URL</Label><Input value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://..." /></div>
                <div><Label>Hedef URL</Label><Input value={editing.target_url ?? ""} onChange={(e) => setEditing({ ...editing, target_url: e.target.value })} placeholder="https://..." /></div>
                <div><Label>Alt Metin</Label><Input value={editing.alt_text ?? ""} onChange={(e) => setEditing({ ...editing, alt_text: e.target.value })} /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label>Öncelik</Label><Input type="number" value={editing.priority ?? 0} onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })} /></div>
                  <div><Label>Başlangıç</Label><Input type="datetime-local" value={editing.starts_at?.slice(0, 16) ?? ""} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
                  <div><Label>Bitiş</Label><Input type="datetime-local" value={editing.ends_at?.slice(0, 16) ?? ""} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
                </div>
                <div className="flex items-center gap-2"><input type="checkbox" id="ad-active" checked={!!editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /><Label htmlFor="ad-active">Aktif</Label></div>
                <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(null)}>İptal</Button><Button onClick={submit}>Kaydet</Button></div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-2">
        {(data ?? []).map((a) => (
          <div key={a.id} className="bg-card border rounded-lg p-3 flex items-center gap-3">
            <img src={a.image_url} alt="" className="w-20 h-12 object-cover rounded border" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold truncate">{a.title}</span>
                <Badge variant="outline">{SLOT_LABELS[a.slot] ?? a.slot}</Badge>
                {!a.is_active && <Badge variant="secondary">Pasif</Badge>}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {a.sponsor_name && <>👤 {a.sponsor_name} • </>}
                Öncelik: {a.priority} • Gösterim: {a.impressions} • Tık: {a.clicks}
              </div>
            </div>
            <a href={a.target_url} target="_blank" rel="noopener noreferrer" className="p-2 hover:text-brand"><ExternalLink className="size-4" /></a>
            <Button variant="outline" size="sm" onClick={() => setEditing(a)}><Pencil className="size-4" /></Button>
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => remove(a.id)}><Trash2 className="size-4" /></Button>
          </div>
        ))}
        {(data?.length ?? 0) === 0 && <p className="text-center text-muted-foreground py-8">Henüz sponsor reklam yok.</p>}
      </div>
    </div>
  );
}
