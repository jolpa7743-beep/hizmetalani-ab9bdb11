import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CreditCard } from "lucide-react";
import {
  adminGetShopierSettings, adminSaveShopierSettings,
  type ShopierSettings,
} from "@/lib/promotions.functions";

export const Route = createFileRoute("/_authenticated/admin/shopier")({
  component: ShopierAdmin,
  head: () => ({ meta: [{ title: "Shopier Ayarları" }] }),
});

function ShopierAdmin() {
  const fetchSettings = useServerFn(adminGetShopierSettings);
  const save = useServerFn(adminSaveShopierSettings);
  const { data } = useQuery({ queryKey: ["shopier-settings"], queryFn: () => fetchSettings() });
  const [form, setForm] = useState<Partial<ShopierSettings>>({});

  useEffect(() => { if (data) setForm(data); }, [data]);

  const submit = async () => {
    try {
      await save({ data: form });
      toast.success("Ayarlar kaydedildi");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Hata"); }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard className="size-6 text-brand" />
        <h1 className="text-2xl font-bold">Shopier Ödeme Ayarları</h1>
      </div>
      <p className="text-sm text-muted-foreground">Shopier hesap bilgilerinizi girin. API anahtarı ve gizli anahtar Shopier panelinizden alınır.</p>

      <div className="bg-card border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div><Label>Aktif</Label><p className="text-xs text-muted-foreground">Kullanıcılar Shopier ile ödeme yapabilir</p></div>
          <Switch checked={!!form.is_enabled} onCheckedChange={(v) => setForm({ ...form, is_enabled: v })} />
        </div>
        <div className="flex items-center justify-between">
          <div><Label>Test Modu</Label><p className="text-xs text-muted-foreground">Gerçek ödeme alınmaz, sadece test</p></div>
          <Switch checked={!!form.test_mode} onCheckedChange={(v) => setForm({ ...form, test_mode: v })} />
        </div>
        <div><Label>API Key</Label><Input value={form.api_key ?? ""} onChange={(e) => setForm({ ...form, api_key: e.target.value })} placeholder="Shopier API Anahtarı" /></div>
        <div><Label>API Secret</Label><Input type="password" value={form.api_secret ?? ""} onChange={(e) => setForm({ ...form, api_secret: e.target.value })} placeholder="Shopier Gizli Anahtar" /></div>
        <div><Label>Website Index</Label><Input type="number" value={form.website_index ?? ""} onChange={(e) => setForm({ ...form, website_index: e.target.value ? Number(e.target.value) : null })} /></div>
        <div><Label>Callback URL</Label><Input value={form.callback_url ?? ""} onChange={(e) => setForm({ ...form, callback_url: e.target.value })} placeholder="https://hizmetalani.com/api/public/shopier/callback" /></div>
        <div className="flex justify-end"><Button onClick={submit}>Kaydet</Button></div>
      </div>

      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <strong>Not:</strong> Shopier ödeme akışı, callback URL'i üzerinden webhook ile onaylanır. Kullanıcı ödemeyi tamamladığında Shopier bize otomatik bildirim gönderir ve ilgili promosyon aktif edilir.
      </div>
    </div>
  );
}
