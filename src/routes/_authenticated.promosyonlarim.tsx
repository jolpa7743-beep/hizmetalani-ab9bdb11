import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, CheckCircle2, XCircle } from "lucide-react";
import { getMyPromotions } from "@/lib/promotions.functions";
import { listingSlug } from "@/lib/slug";


export const Route = createFileRoute("/_authenticated/promosyonlarim")({
  component: MyPromotions,
  head: () => ({ meta: [{ title: "Promosyonlarım" }] }),
});

type PromoRow = {
  id: string;
  status: "pending" | "active" | "expired" | "cancelled";
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  listing_id: string;
  promotion_packages: { name: string; kind: string } | null;
  listings: { title: string; slug: string | null } | null;
  payments: Array<{ status: string; method: string; reference: string }>;
};

const STATUS_META: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Ödeme Bekliyor", color: "bg-amber-500", icon: Clock },
  active: { label: "Aktif", color: "bg-emerald-600", icon: CheckCircle2 },
  expired: { label: "Süresi Doldu", color: "bg-gray-500", icon: XCircle },
  cancelled: { label: "İptal Edildi", color: "bg-red-500", icon: XCircle },
};

function MyPromotions() {
  const fetch = useServerFn(getMyPromotions);
  const { data } = useQuery({ queryKey: ["my-promotions"], queryFn: () => fetch() });
  const rows = (data ?? []) as unknown as PromoRow[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="size-6 text-amber-500" />
        <h1 className="text-2xl font-bold">Promosyonlarım</h1>
      </div>

      {rows.length === 0 && (
        <div className="text-center py-16 border border-dashed rounded-xl bg-surface">
          <p className="font-medium">Henüz promosyon geçmişiniz yok</p>
          <Link to="/ilanlarim" className="text-brand text-sm hover:underline">İlanlarım sayfasından ilanınızı öne çıkarabilirsiniz</Link>
        </div>
      )}

      <div className="space-y-2">
        {rows.map((r) => {
          const meta = STATUS_META[r.status] ?? STATUS_META.pending;
          const Icon = meta.icon;
          const pay = r.payments?.[0];
          return (
            <div key={r.id} className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Badge className={meta.color}><Icon className="size-3 mr-1" />{meta.label}</Badge>
                <Badge variant="outline">{r.promotion_packages?.name ?? "—"}</Badge>
                {pay && <span className="text-xs font-mono text-muted-foreground">{pay.reference}</span>}
              </div>
              <Link to="/ilan/$id" params={{ id: listingSlug(r.listings?.title, r.listing_id, r.listings?.slug) }} className="font-semibold hover:text-brand block truncate">
                {r.listings?.title ?? "—"}
              </Link>
              <div className="text-xs text-muted-foreground mt-1">
                {r.status === "active" && r.ends_at && <>Bitiş: {new Date(r.ends_at).toLocaleString("tr-TR")}</>}
                {r.status === "pending" && <>Oluşturulma: {new Date(r.created_at).toLocaleString("tr-TR")}</>}
                {r.status === "expired" && r.ends_at && <>Sona erdi: {new Date(r.ends_at).toLocaleString("tr-TR")}</>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
