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
      <p className="text-sm text-muted-foreground">Shopier panelinizden aldığınız <strong>Kişisel Erişim Anahtarı</strong>'nı girin. Tek bir token yeterlidir; ayrıca API Key veya Secret gerekmez.</p>

      <div className="bg-card border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div><Label>Aktif</Label><p className="text-xs text-muted-foreground">Kullanıcılar Shopier ile ödeme yapabilir</p></div>
          <Switch checked={!!form.is_enabled} onCheckedChange={(v) => setForm({ ...form, is_enabled: v })} />
        </div>
        <div className="flex items-center justify-between">
          <div><Label>Test Modu</Label><p className="text-xs text-muted-foreground">Gerçek ödeme alınmaz, sadece test</p></div>
          <Switch checked={!!form.test_mode} onCheckedChange={(v) => setForm({ ...form, test_mode: v })} />
        </div>
        <div>
          <Label>Kişisel Erişim Anahtarı</Label>
          <Input
            type="password"
            value={form.personal_access_token ?? ""}
            onChange={(e) => setForm({ ...form, personal_access_token: e.target.value })}
            placeholder="Shopier Kişisel Erişim Anahtarı (Personal Access Token)"
          />
          <p className="text-xs text-muted-foreground mt-1">Shopier &rarr; Ayarlar &rarr; Geliştirici / Kişisel Erişim Anahtarı bölümünden alabilirsiniz.</p>
        </div>
        <div><Label>Callback URL</Label><Input value={form.callback_url ?? ""} onChange={(e) => setForm({ ...form, callback_url: e.target.value })} placeholder="https://hizmetalani.com/api/public/shopier/callback" /></div>
        <div className="flex justify-end"><Button onClick={submit}>Kaydet</Button></div>
      </div>

      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <strong>Not:</strong> Ödeme çağrıları, girdiğiniz Kişisel Erişim Anahtarı ile <code>Authorization: Bearer</code> başlığı üzerinden yapılır. Anahtar yalnızca sunucu tarafında okunur, hiçbir zaman tarayıcıya gönderilmez.
      </div>

    </div>
  );
}
