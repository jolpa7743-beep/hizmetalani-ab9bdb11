import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, CreditCard, Landmark, Copy, Check, Loader2, Rocket, Flame, Star as StarIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getActivePackages,
  createPromotionOrder,
  getActiveBankAccounts,
  type PromotionPackage,
  type PromotionKind,
} from "@/lib/promotions.functions";

const KIND_META: Record<PromotionKind, { label: string; icon: typeof Rocket; color: string }> = {
  featured: { label: "Vitrin", icon: Sparkles, color: "bg-amber-500" },
  showcase: { label: "Öne Çıkan", icon: StarIcon, color: "bg-brand" },
  urgent: { label: "Acil", icon: Flame, color: "bg-red-500" },
  top: { label: "Üst Sıra", icon: Rocket, color: "bg-purple-500" },
};

export function PromoteDialog({ listingId, listingTitle }: { listingId: string; listingTitle: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"pick" | "method" | "bank">("pick");
  const [selected, setSelected] = useState<PromotionPackage | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchPkgs = useServerFn(getActivePackages);
  const fetchBanks = useServerFn(getActiveBankAccounts);
  const createOrder = useServerFn(createPromotionOrder);

  const { data: packages } = useQuery({
    queryKey: ["promo-packages"],
    queryFn: () => fetchPkgs(),
    enabled: open,
  });

  const { data: banks } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: () => fetchBanks(),
    enabled: open && step === "bank",
  });

  const reset = () => {
    setStep("pick");
    setSelected(null);
    setRef(null);
    setCopied(false);
  };

  const handleMethod = async (method: "shopier" | "bank_transfer") => {
    if (!selected) return;
    setLoading(true);
    try {
      const result = await createOrder({ data: { listingId, packageId: selected.id, method } });
      if (method === "bank_transfer") {
        setRef(result.reference);
        setStep("bank");
      } else {
        // Shopier akışı — henüz aktif değilse kullanıcıya bilgi ver
        toast.info("Shopier ödeme entegrasyonu yakında aktif olacak. Şimdilik havale/EFT'yi kullanabilirsiniz.");
        setStep("method");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const copyRef = () => {
    if (!ref) return;
    navigator.clipboard.writeText(ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-amber-500/50 text-amber-600 hover:bg-amber-50 hover:text-amber-700">
          <Sparkles className="size-4 mr-1" /> Öne Çıkar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>İlanı Öne Çıkar</DialogTitle>
          <p className="text-sm text-muted-foreground truncate">{listingTitle}</p>
        </DialogHeader>

        {step === "pick" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Bir paket seçin — ilanınız daha fazla kişiye ulaşsın.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(packages ?? []).map((p) => {
                const meta = KIND_META[p.kind];
                const Icon = meta.icon;
                const isSel = selected?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className={`text-left rounded-lg border-2 p-3 transition-all ${isSel ? "border-brand bg-brand/5" : "border-border hover:border-brand/30"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex size-6 items-center justify-center rounded ${meta.color} text-white`}>
                        <Icon className="size-3.5" />
                      </span>
                      <Badge variant="secondary" className="text-[10px]">{meta.label}</Badge>
                    </div>
                    <div className="font-semibold text-sm">{p.name}</div>
                    {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                    <div className="mt-2 text-lg font-bold text-brand tabular-nums">{p.price_try.toLocaleString("tr-TR")} ₺</div>
                    <div className="text-[11px] text-muted-foreground">{p.duration_hours} saat</div>
                  </button>
                );
              })}
            </div>
            {(packages?.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Henüz aktif paket yok.</p>
            )}
            <div className="flex justify-end pt-2">
              <Button
                disabled={!selected}
                onClick={() => setStep("method")}
                className="bg-brand hover:bg-brand/90"
              >
                Devam Et
              </Button>
            </div>
          </div>
        )}

        {step === "method" && selected && (
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <div className="font-medium">{selected.name}</div>
              <div className="text-muted-foreground">{selected.duration_hours} saat • <span className="font-bold text-brand">{selected.price_try.toLocaleString("tr-TR")} ₺</span></div>
            </div>
            <p className="text-sm text-muted-foreground">Ödeme yöntemini seçin:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => handleMethod("shopier")}
                disabled={loading}
                className="rounded-lg border-2 border-border p-4 text-left hover:border-brand/40 transition-all"
              >
                <CreditCard className="size-6 text-brand mb-2" />
                <div className="font-semibold text-sm">Kredi Kartı (Shopier)</div>
                <p className="text-xs text-muted-foreground mt-1">Anında aktifleşir</p>
              </button>
              <button
                onClick={() => handleMethod("bank_transfer")}
                disabled={loading}
                className="rounded-lg border-2 border-border p-4 text-left hover:border-brand/40 transition-all"
              >
                <Landmark className="size-6 text-brand mb-2" />
                <div className="font-semibold text-sm">Havale / EFT</div>
                <p className="text-xs text-muted-foreground mt-1">Onay sonrası aktifleşir</p>
              </button>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep("pick")}>Geri</Button>
              {loading && <Loader2 className="size-5 animate-spin text-brand" />}
            </div>
          </div>
        )}

        {step === "bank" && ref && selected && (
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
              <div className="font-semibold mb-1">Ödemenizi tamamlayın</div>
              <p>Aşağıdaki hesaplardan birine <strong>{selected.price_try.toLocaleString("tr-TR")} ₺</strong> tutarını gönderin. Açıklama kısmına referans kodunu yazmayı unutmayın.</p>
            </div>

            <div className="rounded-lg border p-3 flex items-center justify-between bg-brand/5">
              <div>
                <div className="text-xs text-muted-foreground">Referans Kodu</div>
                <div className="font-mono font-bold text-lg">{ref}</div>
              </div>
              <Button size="sm" variant="outline" onClick={copyRef}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>

            <div className="space-y-2">
              {(banks ?? []).map((b) => (
                <div key={b.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">{b.bank_name}</div>
                    <Badge variant="outline" className="text-[10px]">{b.account_holder}</Badge>
                  </div>
                  <div className="mt-1 font-mono text-sm select-all">{b.iban}</div>
                  {b.branch && <div className="text-xs text-muted-foreground">{b.branch}</div>}
                </div>
              ))}
              {(banks?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Henüz banka hesabı tanımlanmamış. Lütfen site yöneticisiyle iletişime geçin.</p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Ödemeniz onaylandığında ilanınız otomatik olarak aktifleşecektir. "Promosyonlarım" sayfasından durumu takip edebilirsiniz.
            </p>

            <div className="flex justify-end">
              <Button onClick={() => setOpen(false)} className="bg-brand hover:bg-brand/90">Tamam</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
