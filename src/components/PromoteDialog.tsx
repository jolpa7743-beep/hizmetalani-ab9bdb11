import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles, CreditCard, Landmark, Copy, Check, Loader2, Rocket, Flame,
  Search, CalendarClock, MessageSquare, Store, TrendingUp,
} from "lucide-react";
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
  getShopierPublicStatus,
  type PromotionPackage,
  type PromotionFamily,
} from "@/lib/promotions.functions";

type FamilyMeta = {
  label: string;
  title: string;
  description: string;
  icon: typeof Rocket;
  gradient: string; // tailwind bg gradient utility
  accent: string;   // border/glow color
  tag?: string;     // like "Yeni Doping" / "En Çok Tercih"
  tagClass?: string;
};

const FAMILY_META: Record<PromotionFamily, FamilyMeta> = {
  search_showcase: {
    label: "Arama Vitrin İlanı",
    title: "Arama Vitrin İlanı",
    description: 'İlanınızı "Arama" kutusunda en üstte sergileyebilirsiniz. Arama vitrini sayesinde ilanınız, normal ilanlara göre %70 daha fazla görüntülenme alacaktır.',
    icon: Search,
    gradient: "from-fuchsia-950/80 to-purple-900/60",
    accent: "border-fuchsia-500/40",
    tag: "Yeni Doping",
    tagClass: "bg-pink-600 text-white",
  },
  weekly_deal: {
    label: "Haftanın Fırsatı İlanı",
    title: "Haftanın Fırsatı İlanı",
    description: "Haftanın Fırsatı doping paketiyle ilanınız, Haftanın Fırsatları sayfasında listelenir. Satın alınan dopingler, aynı haftanın sonunda (Pazartesi 00:00) aktif hale gelir.",
    icon: CalendarClock,
    gradient: "from-purple-950/80 to-indigo-900/60",
    accent: "border-purple-500/40",
    tag: "Yeni Doping",
    tagClass: "bg-pink-600 text-white",
  },
  home_showcase: {
    label: "Vitrin İlanı",
    title: "Vitrin İlanı",
    description: "Vitrin dopingi ile ilanınız ana sayfa vitrininde en üstte sergilenir. Yeni bir vitrin dopingi satın alınmasında süre üzerine eklenecektir.",
    icon: Rocket,
    gradient: "from-slate-900/80 to-cyan-950/60",
    accent: "border-cyan-500/40",
    tag: "En Çok Tercih Edilen",
    tagClass: "bg-red-600 text-white",
  },
  chat_showcase: {
    label: "Sohbet & Bildirim Vitrin İlanı",
    title: "Sohbet & Bildirim Vitrin İlanı",
    description: "Sohbet & Bildirim vitrini sayesinde ilanınız mesajlarım ve bildirimlerim sayfasının altında listelenecek ve %75'e yakın oranda daha fazla görüntülenme alacaktır.",
    icon: MessageSquare,
    gradient: "from-emerald-950/80 to-teal-900/60",
    accent: "border-emerald-500/40",
  },
  market_showcase: {
    label: "Pazar Vitrini",
    title: "Pazar Vitrini",
    description: 'Bu dopingi satın alarak ilanınızı "İlan Pazarı" sayfasında en üstte sergileyebilirsiniz. Pazar vitrini sayesinde %70 daha fazla görüntülenme.',
    icon: Store,
    gradient: "from-indigo-950/80 to-blue-900/60",
    accent: "border-indigo-500/40",
  },
  boost: {
    label: "İlanını Öne Çıkar",
    title: "İlanını Öne Çıkar",
    description: "Öne çıkarılan ilanlar diğer ilanlardan daha fazla ilgi çekmektedir ve %80 oranında daha hızlı satılmaktadır. Organik sıralamanız korunur; başlık kalınlığı, arkaplan rengi vs. özel stiller uygulanır.",
    icon: TrendingUp,
    gradient: "from-amber-950/80 to-orange-900/60",
    accent: "border-amber-500/40",
  },
};

const FAMILY_ORDER: PromotionFamily[] = [
  "search_showcase", "weekly_deal", "home_showcase", "chat_showcase", "market_showcase", "boost",
];

function formatDuration(hours: number) {
  const days = Math.round(hours / 24);
  return `${days} gün`;
}

export function PromoteDialog({ listingId, listingTitle }: { listingId: string; listingTitle: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"pick" | "method" | "bank">("pick");
  // per-family selected package id (only one duration per family)
  const [selectedByFamily, setSelectedByFamily] = useState<Record<string, string>>({});
  const [ref, setRef] = useState<string | null>(null);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchPkgs = useServerFn(getActivePackages);
  const fetchBanks = useServerFn(getActiveBankAccounts);
  const createOrder = useServerFn(createPromotionOrder);
  const fetchShopierStatus = useServerFn(getShopierPublicStatus);

  const { data: shopierStatus } = useQuery({
    queryKey: ["shopier-public-status"],
    queryFn: () => fetchShopierStatus(),
    enabled: open && step === "method",
    staleTime: 60_000,
  });
  const shopierEnabled = !!shopierStatus?.enabled;

  const { data: packages } = useQuery({
    queryKey: ["promo-packages"],
    queryFn: () => fetchPkgs(),
    enabled: open,
  });

  const grouped = useMemo(() => {
    const map: Partial<Record<PromotionFamily, PromotionPackage[]>> = {};
    for (const p of packages ?? []) {
      const fam = (p.family ?? "boost") as PromotionFamily;
      (map[fam] ||= []).push(p);
    }
    for (const fam of Object.keys(map)) {
      map[fam as PromotionFamily]!.sort((a, b) => a.duration_hours - b.duration_hours);
    }
    return map;
  }, [packages]);

  const selectedPackages = useMemo(
    () => (packages ?? []).filter((p) => Object.values(selectedByFamily).includes(p.id)),
    [packages, selectedByFamily],
  );
  const total = selectedPackages.reduce((s, p) => s + Number(p.price_try), 0);

  const { data: banks } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: () => fetchBanks(),
    enabled: open && step === "bank",
  });

  const reset = () => {
    setStep("pick");
    setSelectedByFamily({});
    setRef(null);
    setCopied(false);
    setTotalAmount(0);
  };

  const toggleDuration = (family: PromotionFamily, pkgId: string) => {
    setSelectedByFamily((prev) => {
      const next = { ...prev };
      if (next[family] === pkgId) delete next[family];
      else next[family] = pkgId;
      return next;
    });
  };

  const clearFamily = (family: PromotionFamily) => {
    setSelectedByFamily((prev) => {
      const n = { ...prev }; delete n[family]; return n;
    });
  };

  const handleMethod = async (method: "shopier" | "bank_transfer") => {
    if (selectedPackages.length === 0) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        selectedPackages.map((p) => createOrder({ data: { listingId, packageId: p.id, method } })),
      );
      if (method === "bank_transfer") {
        setRef(results.map((r) => r.reference).join(", "));
        setTotalAmount(total);
        setStep("bank");
      } else {
        // Shopier: kullanıcı birden fazla paket seçmişse ilk ödeme için yönlendirilir,
        // diğerleri pending kalır (kullanıcı ilanlarım sayfasından tek tek ödeyebilir).
        const first = results[0];
        if (!first) throw new Error("Ödeme oluşturulamadı");
        window.location.href = `/api/public/shopier/redirect?paymentId=${encodeURIComponent(first.payment_id)}`;
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
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto p-0">
        <DialogHeader className="p-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2"><Flame className="size-5 text-amber-500" /> İlanı Öne Çıkar / Doping Al</DialogTitle>
          <p className="text-sm text-muted-foreground truncate">{listingTitle}</p>
        </DialogHeader>

        {step === "pick" && (
          <div className="p-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              Her paketten <strong>bir süre</strong> seçin. Birden fazla farklı doping alabilirsiniz — hepsi birlikte aktifleşir.
            </p>

            {FAMILY_ORDER.map((fam) => {
              const meta = FAMILY_META[fam];
              const list = grouped[fam] ?? [];
              if (list.length === 0) return null;
              const Icon = meta.icon;
              const selectedId = selectedByFamily[fam];

              return (
                <div
                  key={fam}
                  className={`relative rounded-xl border ${meta.accent} bg-gradient-to-br ${meta.gradient} text-white p-4 shadow-sm`}
                >
                  {meta.tag && (
                    <div className={`absolute -top-2 left-4 rounded-md px-2 py-0.5 text-[10px] font-semibold shadow ${meta.tagClass}`}>
                      {meta.tag}
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 size-12 rounded-xl bg-white/10 flex items-center justify-center ring-1 ring-white/10">
                      <Icon className="size-6 text-white/90" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{meta.title}</div>
                      <p className="text-xs text-white/70 mt-0.5 leading-relaxed">{meta.description}</p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => clearFamily(fam)}
                          className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${
                            selectedId
                              ? "border-white/20 bg-white/5 text-white/70 hover:bg-white/10"
                              : "border-emerald-400/60 bg-emerald-500/20 text-emerald-100"
                          }`}
                        >
                          {!selectedId && <Check className="size-3.5" />}
                          {fam === "boost" || fam === "search_showcase" || fam === "weekly_deal"
                            ? "Öne çıkartmak istemiyorum"
                            : "Vitrin ilanı istemiyorum"}
                        </button>

                        {list.map((p) => {
                          const active = selectedId === p.id;
                          const hasDiscount = p.original_price_try && Number(p.original_price_try) > Number(p.price_try);
                          return (
                            <button
                              key={p.id}
                              onClick={() => toggleDuration(fam, p.id)}
                              className={`rounded-md px-3 py-1.5 text-xs font-medium border transition-all ${
                                active
                                  ? "border-brand bg-brand text-white ring-2 ring-brand/40"
                                  : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                              }`}
                            >
                              <span className="opacity-90">{formatDuration(p.duration_hours)}</span>{" "}
                              <span className="opacity-70">(</span>
                              {hasDiscount && (
                                <span className="line-through opacity-50 mr-1">
                                  {Number(p.original_price_try).toLocaleString("tr-TR")}₺
                                </span>
                              )}
                              <span className="font-semibold">
                                {Number(p.price_try).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}₺
                              </span>
                              <span className="opacity-70">)</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {(packages?.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Henüz aktif paket yok.</p>
            )}

            <div className="sticky bottom-0 -mx-4 mt-4 border-t bg-background/95 backdrop-blur px-4 py-3 flex items-center justify-between">
              <div className="text-sm">
                {selectedPackages.length > 0 ? (
                  <>
                    <span className="text-muted-foreground">{selectedPackages.length} paket seçildi · </span>
                    <span className="font-bold text-brand text-base tabular-nums">{total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Bir veya daha fazla paket seçin</span>
                )}
              </div>
              <Button
                disabled={selectedPackages.length === 0}
                onClick={() => setStep("method")}
                className="bg-brand hover:bg-brand/90"
              >
                Devam Et
              </Button>
            </div>
          </div>
        )}

        {step === "method" && selectedPackages.length > 0 && (
          <div className="p-5 space-y-3">
            <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
              {selectedPackages.map((p) => (
                <div key={p.id} className="flex justify-between">
                  <span>{p.name}</span>
                  <span className="tabular-nums">{Number(p.price_try).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</span>
                </div>
              ))}
              <div className="flex justify-between border-t pt-1 mt-1 font-bold">
                <span>Toplam</span>
                <span className="text-brand tabular-nums">{total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</span>
              </div>
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

        {step === "bank" && ref && (
          <div className="p-5 space-y-4">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
              <div className="font-semibold mb-1">Ödemenizi tamamlayın</div>
              <p>Aşağıdaki hesaplardan birine <strong>{totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</strong> tutarını gönderin. Açıklama kısmına referans kod(lar)ını yazmayı unutmayın.</p>
            </div>

            <div className="rounded-lg border p-3 flex items-center justify-between bg-brand/5">
              <div>
                <div className="text-xs text-muted-foreground">Referans Kod(ları)</div>
                <div className="font-mono font-bold text-sm break-all">{ref}</div>
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
