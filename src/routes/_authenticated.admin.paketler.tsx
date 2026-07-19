import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  adminListPackages, adminSavePackage, adminDeletePackage,
  type PromotionPackage,
} from "@/lib/promotions.functions";

export const Route = createFileRoute("/_authenticated/admin/paketler")({
  component: PackagesAdmin,
  head: () => ({ meta: [{ title: "Öne Çıkarma Paketleri" }] }),
});

function PackagesAdmin() {
  const qc = useQueryClient();
  const fetchList = useServerFn(adminListPackages);
  const savePkg = useServerFn(adminSavePackage);
  const deletePkg = useServerFn(adminDeletePackage);

  const { data } = useQuery({ queryKey: ["admin-packages"], queryFn: () => fetchList() });

  const [editing, setEditing] = useState<Partial<PromotionPackage> | null>(null);

  const save = async () => {
    if (!editing?.name || !editing?.kind) return toast.error("İsim ve tür zorunlu");
    try {
      await savePkg({ data: editing as never });
      toast.success("Kaydedildi");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-packages"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Bu paketi silmek istiyor musunuz?")) return;
    await deletePkg({ data: { id } });
    qc.invalidateQueries({ queryKey: ["admin-packages"] });
    toast.success("Silindi");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Öne Çıkarma Paketleri</h1>
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({ kind: "featured", duration_hours: 24, price_try: 29.9, boost_score: 100, is_active: true, sort_order: 0 })}>
              <Plus className="size-4 mr-1" /> Yeni Paket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing?.id ? "Paketi Düzenle" : "Yeni Paket"}</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-3">
                <div><Label>Ad</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tür (kind)</Label>
                    <Select value={editing.kind} onValueChange={(v) => setEditing({ ...editing, kind: v as never })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="featured">Vitrin</SelectItem>
                        <SelectItem value="showcase">Öne Çıkan</SelectItem>
                        <SelectItem value="urgent">Acil</SelectItem>
                        <SelectItem value="top">Üst Sıra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Aile (family)</Label>
                    <Select value={editing.family ?? undefined} onValueChange={(v) => setEditing({ ...editing, family: v as never })}>
                      <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="search_showcase">Arama Vitrin</SelectItem>
                        <SelectItem value="weekly_deal">Haftanın Fırsatı</SelectItem>
                        <SelectItem value="home_showcase">Vitrin İlanı</SelectItem>
                        <SelectItem value="chat_showcase">Sohbet & Bildirim Vitrin</SelectItem>
                        <SelectItem value="market_showcase">Pazar Vitrini</SelectItem>
                        <SelectItem value="boost">İlanını Öne Çıkar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Süre (saat)</Label><Input type="number" value={editing.duration_hours ?? 24} onChange={(e) => setEditing({ ...editing, duration_hours: Number(e.target.value) })} /></div>
                  <div><Label>Fiyat (₺)</Label><Input type="number" step="0.01" value={editing.price_try ?? 0} onChange={(e) => setEditing({ ...editing, price_try: Number(e.target.value) })} /></div>
                  <div><Label>İndirim Öncesi Fiyat (₺)</Label><Input type="number" step="0.01" value={editing.original_price_try ?? ""} onChange={(e) => setEditing({ ...editing, original_price_try: e.target.value ? Number(e.target.value) : null })} /></div>
                  <div><Label>Boost Puanı</Label><Input type="number" value={editing.boost_score ?? 100} onChange={(e) => setEditing({ ...editing, boost_score: Number(e.target.value) })} /></div>
                  <div><Label>Sıra</Label><Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></div>
                  <div className="flex items-end gap-2"><input type="checkbox" id="pkg-active" checked={!!editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /><Label htmlFor="pkg-active">Aktif</Label></div>
                </div>
                <div><Label>Açıklama</Label><Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
                <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(null)}>İptal</Button><Button onClick={save}>Kaydet</Button></div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-2">
        {(data ?? []).map((p) => (
          <div key={p.id} className="bg-card border rounded-lg p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{p.name}</span>
                <Badge variant="outline">{p.kind}</Badge>
                {!p.is_active && <Badge variant="secondary">Pasif</Badge>}
              </div>
              <div className="text-sm text-muted-foreground">{p.duration_hours}s • {p.price_try}₺ • boost:{p.boost_score}</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(p)}><Pencil className="size-4" /></Button>
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => remove(p.id)}><Trash2 className="size-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
