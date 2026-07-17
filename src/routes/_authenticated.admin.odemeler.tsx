import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, X } from "lucide-react";
import {
  adminListPayments, adminApproveBankPayment, adminRejectPayment,
  type Payment,
} from "@/lib/promotions.functions";

export const Route = createFileRoute("/_authenticated/admin/odemeler")({
  component: PaymentsAdmin,
  head: () => ({ meta: [{ title: "Ödemeler" }] }),
});

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "Bekliyor", color: "bg-amber-500" },
  paid: { label: "Ödendi", color: "bg-emerald-600" },
  failed: { label: "Reddedildi", color: "bg-red-500" },
  refunded: { label: "İade", color: "bg-gray-500" },
  cancelled: { label: "İptal", color: "bg-gray-400" },
};

function PaymentsAdmin() {
  const [tab, setTab] = useState("pending");
  const qc = useQueryClient();
  const fetchList = useServerFn(adminListPayments);
  const approve = useServerFn(adminApproveBankPayment);
  const reject = useServerFn(adminRejectPayment);

  const { data } = useQuery({
    queryKey: ["admin-payments", tab],
    queryFn: () => fetchList({ data: { status: tab === "all" ? undefined : tab } }),
  });

  const [confirmPay, setConfirmPay] = useState<Payment | null>(null);
  const [rejectPay, setRejectPay] = useState<Payment | null>(null);
  const [note, setNote] = useState("");

  const doApprove = async () => {
    if (!confirmPay) return;
    try {
      await approve({ data: { paymentId: confirmPay.id, note } });
      toast.success("Ödeme onaylandı, promosyon aktif edildi");
      setConfirmPay(null); setNote("");
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Hata"); }
  };

  const doReject = async () => {
    if (!rejectPay) return;
    try {
      await reject({ data: { paymentId: rejectPay.id, note } });
      toast.success("Ödeme reddedildi");
      setRejectPay(null); setNote("");
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Hata"); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Ödemeler</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Bekleyen</TabsTrigger>
          <TabsTrigger value="paid">Ödenen</TabsTrigger>
          <TabsTrigger value="failed">Reddedilen</TabsTrigger>
          <TabsTrigger value="all">Tümü</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-2 mt-4">
          {(data ?? []).map((p) => {
            const st = STATUS_LABEL[p.status];
            return (
              <div key={p.id} className="bg-card border rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge className={st?.color ?? ""}>{st?.label ?? p.status}</Badge>
                  <Badge variant="outline">{p.method === "shopier" ? "Shopier" : p.method === "bank_transfer" ? "Havale/EFT" : "Manuel"}</Badge>
                  <span className="font-mono text-sm">{p.reference}</span>
                  <span className="ml-auto font-bold text-brand tabular-nums">{Number(p.amount_try).toLocaleString("tr-TR")} ₺</span>
                </div>
                <div className="text-sm">
                  <strong>{p.user_name ?? "—"}</strong> • {p.package_name ?? "—"} • {p.listing_title ?? "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{new Date(p.created_at).toLocaleString("tr-TR")}</div>
                {p.admin_note && <div className="text-xs text-muted-foreground mt-1">Not: {p.admin_note}</div>}
                {p.status === "pending" && p.method === "bank_transfer" && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => setConfirmPay(p)} className="bg-emerald-600 hover:bg-emerald-700"><Check className="size-4 mr-1" />Onayla</Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => setRejectPay(p)}><X className="size-4 mr-1" />Reddet</Button>
                  </div>
                )}
              </div>
            );
          })}
          {(data?.length ?? 0) === 0 && <p className="text-center text-muted-foreground py-8">Kayıt yok.</p>}
        </TabsContent>
      </Tabs>

      <Dialog open={!!confirmPay} onOpenChange={(o) => { if (!o) { setConfirmPay(null); setNote(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ödeme Onayı</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong>{confirmPay?.reference}</strong> referanslı <strong>{Number(confirmPay?.amount_try).toLocaleString("tr-TR")}₺</strong> tutarındaki ödemeyi onaylıyorsunuz. Promosyon otomatik aktif edilecek.
          </p>
          <Textarea placeholder="Not (opsiyonel)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmPay(null)}>İptal</Button>
            <Button onClick={doApprove} className="bg-emerald-600 hover:bg-emerald-700">Onayla</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectPay} onOpenChange={(o) => { if (!o) { setRejectPay(null); setNote(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ödemeyi Reddet</DialogTitle></DialogHeader>
          <Textarea placeholder="Red nedeni" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectPay(null)}>Vazgeç</Button>
            <Button variant="destructive" onClick={doReject}>Reddet</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
