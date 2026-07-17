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
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  adminListBankAccounts, adminSaveBankAccount, adminDeleteBankAccount,
  type BankAccount,
} from "@/lib/promotions.functions";

export const Route = createFileRoute("/_authenticated/admin/havale")({
  component: BankAdmin,
  head: () => ({ meta: [{ title: "Banka Hesapları" }] }),
});

function BankAdmin() {
  const qc = useQueryClient();
  const fetchList = useServerFn(adminListBankAccounts);
  const save = useServerFn(adminSaveBankAccount);
  const del = useServerFn(adminDeleteBankAccount);
  const { data } = useQuery({ queryKey: ["admin-banks"], queryFn: () => fetchList() });
  const [editing, setEditing] = useState<Partial<BankAccount> | null>(null);

  const submit = async () => {
    if (!editing?.bank_name || !editing?.iban || !editing?.account_holder) return toast.error("Zorunlu alanları doldurun");
    try {
      await save({ data: editing as never });
      toast.success("Kaydedildi");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-banks"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Hata"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Silmek istiyor musunuz?")) return;
    await del({ data: { id } });
    qc.invalidateQueries({ queryKey: ["admin-banks"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Havale/EFT Banka Hesapları</h1>
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({ is_active: true, sort_order: 0 })}><Plus className="size-4 mr-1" /> Yeni Hesap</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? "Hesap Düzenle" : "Yeni Hesap"}</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-3">
                <div><Label>Banka</Label><Input value={editing.bank_name ?? ""} onChange={(e) => setEditing({ ...editing, bank_name: e.target.value })} /></div>
                <div><Label>Hesap Sahibi</Label><Input value={editing.account_holder ?? ""} onChange={(e) => setEditing({ ...editing, account_holder: e.target.value })} /></div>
                <div><Label>IBAN</Label><Input value={editing.iban ?? ""} onChange={(e) => setEditing({ ...editing, iban: e.target.value })} /></div>
                <div><Label>Şube</Label><Input value={editing.branch ?? ""} onChange={(e) => setEditing({ ...editing, branch: e.target.value })} /></div>
                <div><Label>Not</Label><Textarea value={editing.note ?? ""} onChange={(e) => setEditing({ ...editing, note: e.target.value })} /></div>
                <div className="flex items-center gap-2"><input type="checkbox" id="ba-active" checked={!!editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /><Label htmlFor="ba-active">Aktif</Label></div>
                <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(null)}>İptal</Button><Button onClick={submit}>Kaydet</Button></div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-2">
        {(data ?? []).map((b) => (
          <div key={b.id} className="bg-card border rounded-lg p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 font-semibold">{b.bank_name} {!b.is_active && <Badge variant="secondary">Pasif</Badge>}</div>
              <div className="text-sm text-muted-foreground">{b.account_holder} • <span className="font-mono">{b.iban}</span></div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(b)}><Pencil className="size-4" /></Button>
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => remove(b.id)}><Trash2 className="size-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
