import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Flame, CalendarClock, Sparkles } from "lucide-react";
import { ListingCard, type ListingRow } from "@/components/ListingCard";
import { AdSlot } from "@/components/AdSlot";
import { getWeeklyDeals } from "@/lib/weekly-deals.functions";

export const Route = createFileRoute("/haftanin-firsatlari")({
  component: WeeklyDealsPage,
  head: () => ({
    meta: [
      { title: "Haftanın Fırsatları — Öne Çıkan Hizmet İlanları | hizmetalanı.com" },
      { name: "description", content: "Haftanın Fırsatı dopingiyle öne çıkarılan seçkin hizmet ilanları. Bakıcı, temizlik, tadilat ve daha fazlası için en avantajlı ilanları keşfedin." },
      { property: "og:title", content: "Haftanın Fırsatları — hizmetalanı.com" },
      { property: "og:description", content: "Bu hafta öne çıkan hizmet ilanları — indirimli, güvenilir ve doğrulanmış üyelerden." },
      { property: "og:url", content: "https://hizmetalani.com/haftanin-firsatlari" },
    ],
    links: [{ rel: "canonical", href: "https://hizmetalani.com/haftanin-firsatlari" }],
  }),
});

function nextMondayLabel() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun..6=Sat
  const daysToMon = (8 - day) % 7 || 7;
  const next = new Date(d);
  next.setDate(d.getDate() + daysToMon);
  next.setHours(0, 0, 0, 0);
  return next.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", weekday: "long" });
}

function WeeklyDealsPage() {
  const fetchList = useServerFn(getWeeklyDeals);
  const { data, isLoading } = useQuery({
    queryKey: ["weekly-deals"],
    queryFn: () => fetchList(),
  });

  return (
    <div>
      <section className="border-b border-border bg-gradient-to-br from-red-950 via-rose-900 to-orange-900 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 rounded-md bg-pink-600 px-2 py-0.5 text-xs font-bold">
              <Sparkles className="size-3" /> HAFTANIN DOPİNGİ
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            <Flame className="inline size-8 text-amber-300 mr-2" aria-hidden />
            Haftanın Fırsatları
          </h1>
          <p className="mt-3 text-white/85 max-w-3xl leading-relaxed">
            Haftanın Fırsatı doping paketiyle ilanınız, <strong>Haftanın Fırsatları</strong> sayfasında listelenir ve
            daha fazla kullanıcıya ulaşarak öne çıkar. Satın alınan dopingler, aynı haftanın sonunda
            <strong> Pazartesi 00:00</strong> aktif hale gelir ve seçtiğiniz süre boyunca geçerliliğini korur.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm">
            <CalendarClock className="size-4" /> Sonraki aktivasyon: <strong>{nextMondayLabel()}</strong>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6"><AdSlot slot="header" /></div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        {isLoading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-56 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && (data?.length ?? 0) > 0 && !data!.some((d) => d.weekly_ends_at) && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Bu hafta henüz Haftanın Fırsatı dopingi alınmadı. Bunun yerine sizin için öne çıkan seçkin ilanları listeliyoruz.
          </div>
        )}


        {!isLoading && (data?.length ?? 0) > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).map((l) => (
              <ListingCard key={l.id} item={l as unknown as ListingRow} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
