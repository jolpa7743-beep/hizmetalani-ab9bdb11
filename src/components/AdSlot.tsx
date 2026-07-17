import { useEffect, useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SiteSettings } from "@/lib/settings.functions";
import { getSponsorAd, trackAdEvent } from "@/lib/promotions.functions";

type SlotKey = "header" | "in_article" | "sidebar" | "footer";

interface Props {
  slot: SlotKey;
  /** CSS class for the outer container */
  className?: string;
  /** Format override (default: auto) */
  format?: "auto" | "fluid" | "rectangle" | "horizontal" | "vertical";
  /** Fluid layout key (for in-article ads) */
  layout?: "in-article";
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Cihaz genişliğine göre slot için önerilen min-height (px).
 * AdSense responsive reklamlarında container yüksekliği, hangi format doldurulacağını belirler.
 */
function slotMinHeight(slot: SlotKey, isMobile: boolean): number {
  if (isMobile) {
    switch (slot) {
      case "header":
      case "footer":
        return 100; // large mobile banner (320x100)
      case "sidebar":
        return 250; // medium rectangle on mobile
      case "in_article":
      default:
        return 250;
    }
  }
  switch (slot) {
    case "header":
    case "footer":
      return 90; // leaderboard (728x90)
    case "sidebar":
      return 600; // wide skyscraper alanı
    case "in_article":
    default:
      return 280;
  }
}

/**
 * Google AdSense reklam bloğu.
 * - Admin panelinden AdSense kapalıysa hiç render edilmez.
 * - Publisher ID veya slot ID eksikse render edilmez.
 * - Test modu açıksa AdSense yalnızca test reklamları döndürür (data-adtest="on").
 * - Mobil cihazda slot boyutları otomatik olarak küçük banner/rectangle'a düşer.
 */
export function AdSlot({ slot, className = "", format = "auto", layout }: Props) {
  const ref = useRef<HTMLModElement | null>(null);
  const isMobile = useIsMobile();

  // __root loader'ı site_settings'ı context'e koyuyor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = (useRouter().state.matches[0]?.loaderData ?? {}) as { settings?: SiteSettings | null };
  const s = ctx.settings ?? null;

  const publisher = s?.adsense_publisher_id?.trim();
  const enabled = !!s?.adsense_enabled;
  const testMode = !!s?.adsense_test_mode;
  const slotId = s?.[`adsense_slot_${slot}` as const]?.trim();

  // Önce sponsor reklamı dene
  const fetchAd = useServerFn(getSponsorAd);
  const trackEvent = useServerFn(trackAdEvent);
  const { data: sponsorAd } = useQuery({
    queryKey: ["sponsor-ad", slot],
    queryFn: () => fetchAd({ data: { slot } }),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (sponsorAd) {
      trackEvent({ data: { adId: sponsorAd.id, event: "impression" } }).catch(() => {});
      return;
    }
    if (!enabled || !publisher || !slotId) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ignore repeated push errors during dev */
    }
  }, [enabled, publisher, slotId, isMobile, sponsorAd, trackEvent]);

  // Sponsor reklam varsa onu göster
  if (sponsorAd) {
    return (
      <aside
        aria-label={`Sponsor: ${sponsorAd.sponsor_name ?? sponsorAd.title}`}
        className={`ad-slot my-6 flex justify-center ${className}`}
        data-slot={slot}
        data-sponsor="1"
      >
        <a
          href={sponsorAd.target_url}
          target="_blank"
          rel="noopener sponsored"
          onClick={() => {
            trackEvent({ data: { adId: sponsorAd.id, event: "click" } }).catch(() => {});
          }}
          className="block w-full max-w-4xl rounded-lg overflow-hidden border border-border/60 hover:border-brand/40 transition-colors relative group"
        >
          <img
            src={sponsorAd.image_url}
            alt={sponsorAd.alt_text ?? sponsorAd.title}
            className="w-full h-auto object-cover"
            loading="lazy"
          />
          <span className="absolute top-1 right-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
            Sponsor
          </span>
        </a>
      </aside>
    );
  }

  if (!enabled || !publisher || !slotId) return null;

  const minH = slotMinHeight(slot, isMobile);

  return (
    <aside
      aria-label={testMode ? "Test Reklam" : "Reklam"}
      className={`ad-slot my-6 flex justify-center overflow-hidden ${className}`}
      data-slot={slot}
      data-testmode={testMode ? "on" : undefined}
    >
      <ins
        ref={ref}
        className="adsbygoogle block w-full"
        style={{ display: "block", textAlign: "center", minHeight: minH }}
        data-ad-client={publisher}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-ad-layout={layout}
        data-full-width-responsive="true"
        {...(testMode ? { "data-adtest": "on" } : {})}
      />
    </aside>
  );
}
