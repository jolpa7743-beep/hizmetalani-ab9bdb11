import { Link } from "@tanstack/react-router";
import { Star, Sparkles, Rocket, Flame, TrendingUp } from "lucide-react";
import { CATEGORY_MAP, TYPE_LABEL, formatPrice, type CategoryKey, type ListingType } from "@/lib/categories";
import { listingSlug } from "@/lib/slug";

export type ListingRow = {
  id: string;
  slug?: string | null;
  user_id?: string;

  title: string;
  type: ListingType;
  category: CategoryKey;
  city: string;
  district: string | null;
  price: number | null;
  price_type: string;
  created_at: string;
  description: string;
  view_count?: number;
  is_featured?: boolean;
  is_showcase?: boolean;
  is_urgent?: boolean;
  is_boosted?: boolean;
  boost_score?: number;
};

function shortDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
}

export function ListingCard({
  item,
  ownerRating,
}: {
  item: ListingRow;
  ownerRating?: { avg: number; count: number };
}) {
  const cat = CATEGORY_MAP[item.category];
  const isOffering = item.type === "offering";

  // Kart stilleri — doping paketine göre farklı görünüm
  const isVitrin = !!item.is_featured;
  const isShowcase = !!item.is_showcase;
  const isBoosted = !!item.is_boosted;
  const isUrgent = !!item.is_urgent;

  const containerBase =
    "group flex flex-col overflow-hidden rounded-xl border shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] focus-visible:-translate-y-0.5";

  // Öncelik: Vitrin > Boosted > Showcase > Urgent > normal
  const containerStyle = isVitrin
    ? "border-amber-400/60 bg-gradient-to-br from-amber-50 via-orange-50 to-white ring-1 ring-amber-300/50 hover:border-amber-500/70"
    : isBoosted
      ? "border-orange-400/60 bg-gradient-to-br from-orange-50 to-white ring-1 ring-orange-300/40 hover:border-orange-500/70"
      : isShowcase
        ? "border-brand/50 bg-gradient-to-br from-brand/5 to-white hover:border-brand/70"
        : isUrgent
          ? "border-red-400/60 bg-gradient-to-br from-red-50 to-white hover:border-red-500/70"
          : "border-border bg-surface hover:border-brand/40";

  // Başlık stilleri (boost / vitrin → kalın ve renkli)
  const titleStyle = isVitrin
    ? "font-extrabold text-amber-900"
    : isBoosted
      ? "font-extrabold text-orange-900"
      : isShowcase
        ? "font-bold text-brand"
        : "font-semibold text-foreground";

  return (
    <Link
      to="/ilan/$id"
      params={{ id: listingSlug(item.title, item.id, item.slug) }}
      aria-label={`${item.title} — ${item.city}${item.district ? ` / ${item.district}` : ""}`}
      className={`${containerBase} ${containerStyle}`}
    >
      {/* Vitrin şeridi */}
      {isVitrin && (
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 animate-pulse" />
      )}

      <div className="flex flex-1 flex-col p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={
              "inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
              (isOffering ? "bg-brand text-brand-foreground" : "bg-success/90 text-success-foreground")
            }
          >
            {TYPE_LABEL[item.type]}
          </span>
          {isVitrin && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-gradient-to-r from-amber-500 to-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm animate-pulse">
              <Sparkles className="size-3" aria-hidden /> VİTRİN
            </span>
          )}
          {isBoosted && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-gradient-to-r from-orange-500 to-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              <TrendingUp className="size-3" aria-hidden /> ÖNE ÇIKAN
            </span>
          )}
          {isShowcase && !isVitrin && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-gradient-to-r from-brand to-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              <Rocket className="size-3" aria-hidden /> ÖNCELİKLİ
            </span>
          )}
          {isUrgent && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-gradient-to-r from-red-500 to-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm animate-pulse">
              <Flame className="size-3" aria-hidden /> ACİL
            </span>
          )}
          <span className="ml-auto text-[11px] text-muted-foreground">{cat?.short}</span>
        </div>

        <h3 className={`mt-2 text-[15px] leading-snug line-clamp-2 group-hover:text-brand ${titleStyle}`}>
          {item.title}
        </h3>

        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground min-w-0">
          <span className="truncate">{item.city}{item.district ? ` / ${item.district}` : ""}</span>
          {typeof item.view_count === "number" && item.view_count > 0 && (
            <span className="tabular-nums">{item.view_count} görüntülenme</span>
          )}
        </div>

        {ownerRating && ownerRating.count > 0 ? (
          <div className="mt-1.5 inline-flex items-center gap-1 text-xs" aria-label={`İlan sahibi puanı ${ownerRating.avg.toFixed(1)} / 5, ${ownerRating.count} değerlendirme`}>
            <span className="inline-flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={`size-3 ${n <= Math.round(ownerRating.avg) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
              ))}
            </span>
            <span className="font-semibold tabular-nums">{ownerRating.avg.toFixed(1)}</span>
            <span className="text-muted-foreground">({ownerRating.count})</span>
          </div>
        ) : (
          <div className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground/70" aria-label="Henüz değerlendirme yok">
            <span className="inline-flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className="size-3 text-muted-foreground/30" />
              ))}
            </span>
            <span>Yeni</span>
          </div>
        )}

        <div className="mt-3 flex items-end justify-between gap-2 pt-2 border-t border-border/60">
          <div className={`tabular-nums text-[15px] ${isVitrin || isBoosted ? "font-extrabold text-orange-700" : "font-bold text-brand"}`}>
            {formatPrice(item.price, item.price_type)}
          </div>
          <time dateTime={item.created_at} className="text-[11px] text-muted-foreground tabular-nums">
            {shortDate(item.created_at)}
          </time>
        </div>
      </div>
    </Link>
  );
}
