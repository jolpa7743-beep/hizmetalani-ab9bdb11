import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CATEGORY_MAP, TYPE_LABEL, formatPrice, type CategoryKey, type ListingType } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MapPin, Clock, ShieldCheck, MessageSquare, ArrowLeft, Eye, Tag, Building2, User as UserIcon, ShieldAlert, CalendarDays, BadgeCheck, Sparkles, Flame, Star as StarIcon, Pencil, Rocket } from "lucide-react";
import { toast } from "sonner";
import { AdSlot } from "@/components/AdSlot";
import { StarRow } from "@/components/UserReviews";
import { getUserReviews } from "@/lib/reviews.functions";
import { getSiteSettings } from "@/lib/settings.functions";
import { trustBadgesFor, type BadgeVisibility } from "@/lib/trust";
import { PromoteDialog } from "@/components/PromoteDialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { extractListingId, isUuid, listingSlug } from "@/lib/slug";

// Loader ile ilan verisini önden çekip head() içinde title/description/OG üretiyoruz.
const listingQueryOptions = (slugParam: string) => ({
  queryKey: ["listing", slugParam],
  queryFn: async () => {
    if (!slugParam) return null;
    const cols = "id,user_id,title,slug,description,type,category,city,district,price,price_type,created_at,view_count,work_type,available_days,off_days,available_hours,salary_min,salary_max,salary_period,experience_years,education_level,requirements,benefits,is_remote,is_urgent,is_featured,is_showcase,boost_score,promoted_until";
    let listing: Listing | null = null;
    if (isUuid(slugParam)) {
      const { data, error } = await supabase.from("listings").select(cols).eq("id", slugParam).maybeSingle();
      if (error) throw error;
      listing = (data as unknown as Listing) ?? null;
    } else {
      const { data, error } = await supabase.from("listings").select(cols).eq("slug", slugParam).maybeSingle();
      if (error) throw error;
      listing = (data as unknown as Listing) ?? null;
    }
    if (!listing) return null;
    const { data: profile } = await supabase
      .from("profiles_public" as never)
      .select("full_name,avatar_url,is_verified,trust_level,city,district,created_at")
      .eq("id", listing.user_id)
      .maybeSingle();
    return { listing, profile: (profile ?? null) as Profile | null };
  },
});


function truncate(s: string, n: number) {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n - 1).trimEnd() + "…" : clean;
}

export const Route = createFileRoute("/ilan/$id")({
  component: ListingDetail,
  loader: ({ params, context }) => context.queryClient.ensureQueryData(listingQueryOptions(params.id)),
  head: ({ loaderData }) => {
    const l = loaderData?.listing;
    const p = loaderData?.profile;
    if (!l) {
      return {
        meta: [
          { title: "İlan bulunamadı — hizmetalanı.com" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const loc = `${l.city}${l.district ? " / " + l.district : ""}`;
    const catLabel = CATEGORY_MAP[l.category]?.label ?? "";
    const typeLabel = TYPE_LABEL[l.type];
    const priceStr = formatPrice(l.price, l.price_type);
    const title = truncate(`${l.title} — ${loc} | ${catLabel} | hizmetalanı.com`, 60);
    const description = truncate(
      `${typeLabel} · ${catLabel} · ${loc}${priceStr ? " · " + priceStr : ""} — ${l.description}`,
      160,
    );
    const ogTitle = truncate(`${l.title} — ${loc}`, 60);
    const path = `https://hizmetalani.com/ilan/${listingSlug(l.title, l.id, l.slug)}`;
    // JSON-LD (JobPosting) — Google Jobs uyumu
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: l.title,
      description: l.description,
      datePosted: l.created_at,
      employmentType: l.work_type ?? undefined,
      jobLocationType: l.is_remote ? "TELECOMMUTE" : undefined,
      jobLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressLocality: l.district ?? undefined,
          addressRegion: l.city,
          addressCountry: "TR",
        },
      },
      hiringOrganization: {
        "@type": "Organization",
        name: p?.full_name ?? "hizmetalanı.com kullanıcısı",
      },
      baseSalary:
        l.salary_min || l.salary_max
          ? {
              "@type": "MonetaryAmount",
              currency: "TRY",
              value: {
                "@type": "QuantitativeValue",
                minValue: l.salary_min ?? undefined,
                maxValue: l.salary_max ?? undefined,
                unitText: (l.salary_period ?? "MONTH").toUpperCase(),
              },
            }
          : undefined,
    };
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: ogTitle },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: path },
        { property: "og:site_name", content: "hizmetalanı.com" },
        { property: "og:locale", content: "tr_TR" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: ogTitle },
        { name: "twitter:description", content: description },
        { name: "keywords", content: `${l.title}, ${catLabel}, ${l.city}, ${l.district ?? ""}, ${typeLabel}, ilan, iş`.replace(/, ,/g, ",") },
      ],
      links: [{ rel: "canonical", href: path }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
    };
  },
});

type Listing = {
  id: string;
  user_id: string;
  slug: string;

  title: string;
  description: string;
  type: ListingType;
  category: CategoryKey;
  city: string;
  district: string | null;
  price: number | null;
  price_type: string;
  created_at: string;
  view_count: number;
  work_type: string | null;
  available_days: string[] | null;
  off_days: string[] | null;
  available_hours: { start: string | null; end: string | null } | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_period: string | null;
  experience_years: number | null;
  education_level: string | null;
  requirements: string[] | null;
  benefits: string[] | null;
  is_remote: boolean | null;
  is_urgent: boolean | null;
  is_featured: boolean | null;
  is_showcase: boolean | null;
  boost_score: number | null;
  promoted_until: string | null;
};

type Profile = {
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  trust_level: number | null;
  city: string | null;
  district: string | null;
  created_at: string;
};

const WORK_TYPE_LABEL: Record<string, string> = {
  full_time: "Tam Zamanlı",
  part_time: "Yarı Zamanlı",
  contract: "Sözleşmeli",
  freelance: "Serbest / Freelance",
  internship: "Staj",
  seasonal: "Sezonluk",
  one_time: "Tek Seferlik",
};
const EDU_LABEL: Record<string, string> = {
  primary: "İlköğretim",
  high_school: "Lise",
  associate: "Ön Lisans",
  bachelor: "Lisans",
  master: "Yüksek Lisans",
  phd: "Doktora",
};
const SALARY_PERIOD_LABEL: Record<string, string> = {
  hourly: "saatlik",
  daily: "günlük",
  monthly: "aylık",
  job: "iş başı",
};
const DAYS_ORDER = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
// Alan bazlı "belirtilmemiş" mesajları — kullanıcı ne eksik olduğunu net görsün
const EMPTY = {
  work_type: "Çalışma tipi belirtilmemiş — görüşmeye açık",
  salary: "Maaş belirtilmemiş — pazarlığa açık",
  hours: "Çalışma saatleri belirtilmemiş — esnek",
  experience: "Deneyim şartı belirtilmemiş — fark etmez",
  education: "Eğitim şartı belirtilmemiş — fark etmez",
  remote: "Uzaktan/acil bilgisi belirtilmemiş",
  days: "Çalışma / izin günleri belirtilmemiş — esnek",
  requirements: "Özel bir şart belirtilmemiş — görüşmeye açık",
  benefits: "Yan hak belirtilmemiş — görüşmeye açık",
} as const;

function ListingDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [authDialog, setAuthDialog] = useState(false);

  const { data, isLoading, error } = useQuery(listingQueryOptions(id));
  const fetchSettings = useServerFn(getSiteSettings);
  const { data: settings } = useQuery({
    queryKey: ["site-settings-public"],
    queryFn: () => fetchSettings(),
    staleTime: 5 * 60_000,
  });
  const fetchOwnerReviews = useServerFn(getUserReviews);
  const ownerId = data?.listing?.user_id;
  const { data: ownerReviews } = useQuery({
    queryKey: ["user-reviews", ownerId],
    queryFn: () => fetchOwnerReviews({ data: { userId: ownerId! } }),
    enabled: !!ownerId,
  });
  const badgeVisibility: BadgeVisibility = (settings?.trust_badge_visibility as BadgeVisibility | undefined) ?? "all";

  const listingUuid = data?.listing?.id ?? extractListingId(id);
  useEffect(() => {
    if (!listingUuid) return;
    supabase.rpc("increment_listing_view", { _id: listingUuid }).then(() => {});
  }, [listingUuid]);

  const contactSeller = async () => {
    if (!user) {
      setAuthDialog(true);
      return;
    }
    if (!data?.listing) return;
    const listing = data.listing;
    if (listing.user_id === user.id) {
      toast.error("Kendi ilanınıza mesaj gönderemezsiniz");
      return;
    }
    const [u1, u2] = [user.id, listing.user_id].sort();
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("user1_id", u1)
      .eq("user2_id", u2)
      .maybeSingle();

    let convId = existing?.id;
    if (!convId) {
      const { data: created, error: cErr } = await supabase
        .from("conversations")
        .insert({ listing_id: listing.id, user1_id: u1, user2_id: u2 })
        .select("id")
        .single();
      if (cErr) {
        toast.error("Konuşma başlatılamadı: " + cErr.message);
        return;
      }
      convId = created.id;
    }
    navigate({ to: "/mesajlar/$id", params: { id: convId! } });
  };

  if (isLoading) return <div className="mx-auto max-w-4xl px-4 py-10">Yükleniyor...</div>;
  if (error || !data || !data.listing)
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-center">
        <p className="text-lg font-medium">İlan bulunamadı</p>
        <Link to="/" className="text-brand hover:underline mt-2 inline-block">← İlanlara dön</Link>
      </div>
    );

  const listing = data.listing;
  const profile = data.profile;
  const cat = CATEGORY_MAP[listing.category];
  const isOwner = user?.id === listing.user_id;
  const isOffering = listing.type === "offering";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand mb-4">
        <ArrowLeft className="size-4" /> İlanlara dön
      </Link>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="relative bg-surface border border-border rounded-xl overflow-hidden">
            <PromoBadge listing={listing} />
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge className={isOffering ? "bg-brand text-brand-foreground" : "bg-brand-accent text-brand-foreground"}>
                  {isOffering ? <Building2 className="size-3 mr-1" /> : <UserIcon className="size-3 mr-1" />}
                  {TYPE_LABEL[listing.type]}
                </Badge>
                <Badge variant="secondary">
                  <Tag className="size-3 mr-1" /> {cat?.label}
                </Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold">{listing.title}</h1>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-4" /> {listing.city}
                  {listing.district ? ` / ${listing.district}` : ""}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-4" /> {new Date(listing.created_at).toLocaleDateString("tr-TR")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Eye className="size-4" /> {listing.view_count} görüntülenme
                </span>
              </div>
              <div className="mt-4 text-3xl font-bold text-brand">
                {formatPrice(listing.price, listing.price_type)}
              </div>

              <div className="mt-6 grid sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-background/50 p-3">
                  <div className="text-xs text-muted-foreground">İlan Tipi</div>
                  <div className="font-medium mt-1">{TYPE_LABEL[listing.type]}</div>
                </div>
                <div className="rounded-lg border border-border bg-background/50 p-3">
                  <div className="text-xs text-muted-foreground">Kategori</div>
                  <div className="font-medium mt-1">{cat?.label}</div>
                </div>
                <div className="rounded-lg border border-border bg-background/50 p-3">
                  <div className="text-xs text-muted-foreground">Şehir</div>
                  <div className="font-medium mt-1">{listing.city}</div>
                </div>
                <div className="rounded-lg border border-border bg-background/50 p-3">
                  <div className="text-xs text-muted-foreground">İlçe</div>
                  <div className="font-medium mt-1">{listing.district ?? "—"}</div>
                </div>
              </div>

              <div className="mt-6">
                <h2 className="font-semibold mb-2">Açıklama</h2>
                <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">{listing.description}</p>
              </div>

              {/* Çalışma Koşulları */}
              <div className="mt-6">
                <h2 className="font-semibold mb-3">Çalışma Koşulları</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <InfoBox label="Çalışma Tipi" value={listing.work_type ? WORK_TYPE_LABEL[listing.work_type] ?? listing.work_type : EMPTY.work_type} isEmpty={!listing.work_type} />
                  <InfoBox
                    label="Maaş / Ücret"
                    value={
                      listing.salary_min || listing.salary_max
                        ? `${listing.salary_min ? "₺" + listing.salary_min.toLocaleString("tr-TR") : ""}${listing.salary_min && listing.salary_max ? " - " : ""}${listing.salary_max ? "₺" + listing.salary_max.toLocaleString("tr-TR") : ""} ${SALARY_PERIOD_LABEL[listing.salary_period ?? "monthly"] ?? ""}`.trim()
                        : EMPTY.salary
                    }
                    isEmpty={!(listing.salary_min || listing.salary_max)}
                  />
                  <InfoBox
                    label="Çalışma Saatleri"
                    value={
                      listing.available_hours?.start || listing.available_hours?.end
                        ? `${listing.available_hours?.start ?? "?"} - ${listing.available_hours?.end ?? "?"}`
                        : EMPTY.hours
                    }
                    isEmpty={!(listing.available_hours?.start || listing.available_hours?.end)}
                  />
                  <InfoBox
                    label="Deneyim"
                    value={listing.experience_years != null ? `${listing.experience_years} yıl` : EMPTY.experience}
                    isEmpty={listing.experience_years == null}
                  />
                  <InfoBox label="Eğitim" value={listing.education_level ? EDU_LABEL[listing.education_level] ?? listing.education_level : EMPTY.education} isEmpty={!listing.education_level} />
                  <InfoBox
                    label="Uzaktan / Acil"
                    value={
                      [listing.is_remote ? "Uzaktan çalışılabilir" : null, listing.is_urgent ? "Acil" : null]
                        .filter(Boolean)
                        .join(" • ") || EMPTY.remote
                    }
                    isEmpty={!listing.is_remote && !listing.is_urgent}
                  />
                </div>
              </div>

              {/* Günler */}
              {(listing.available_days?.length || listing.off_days?.length) ? (
                <div className="mt-6">
                  <h2 className="font-semibold mb-2">Çalışma / İzin Günleri</h2>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_ORDER.map((d) => {
                      const isWork = listing.available_days?.includes(d);
                      const isOff = listing.off_days?.includes(d);
                      const cls = isWork
                        ? "bg-brand text-brand-foreground border-brand"
                        : isOff
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : "border-border text-muted-foreground";
                      return (
                        <span key={d} className={`px-3 py-1.5 rounded-full text-sm border ${cls}`}>
                          {d}
                        </span>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full bg-brand" /> Çalışma günü</span>
                    <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full bg-emerald-500" /> İzinli gün</span>
                  </div>
                </div>
              ) : (
                <div className="mt-6">
                  <h2 className="font-semibold mb-2">Çalışma / İzin Günleri</h2>
                  <p className="text-sm text-muted-foreground italic">{EMPTY.days}</p>
                </div>
              )}

              {/* Şartlar */}
              <div className="mt-6">
                <h2 className="font-semibold mb-2">Aranan Nitelikler / Şartlar</h2>
                {listing.requirements?.length ? (
                  <ul className="list-disc pl-5 space-y-1 text-foreground/90">
                    {listing.requirements.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">{EMPTY.requirements}</p>
                )}
              </div>

              {/* Yan Haklar */}
              <div className="mt-6">
                <h2 className="font-semibold mb-2">Yan Haklar</h2>
                {listing.benefits?.length ? (
                  <ul className="list-disc pl-5 space-y-1 text-foreground/90">
                    {listing.benefits.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">{EMPTY.benefits}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <UserAvatar
                seed={listing.user_id}
                name={profile?.full_name}
                src={profile?.avatar_url}
                className="size-12"
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">
                  {profile?.full_name ?? "İlan Sahibi"}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {profile?.city ?? listing.city}
                  {profile?.district ? ` / ${profile.district}` : ""}
                </div>
              </div>
            </div>
            {(() => {
              const lvl = profile?.trust_level ?? (profile?.is_verified ? 1 : 0);
              if (!shouldShowBadge(lvl, badgeVisibility)) return null;
              const meta = trustBadgeMeta(lvl);
              return (
                <div className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md ${meta.className}`}>
                  <meta.icon className="size-3.5" /> {meta.label}
                </div>
              );
            })()}
            {profile?.created_at && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="size-3.5" />
                Üyelik: {new Date(profile.created_at).toLocaleDateString("tr-TR", { year: "numeric", month: "long" })}
              </div>
            )}

            {/* Puan özeti + profili gör */}
            <div className="mt-3 pt-3 border-t border-border">
              {ownerReviews && ownerReviews.count > 0 ? (
                <div className="flex items-center gap-2 text-sm">
                  <StarRow value={ownerReviews.avg} />
                  <span className="font-semibold tabular-nums">{ownerReviews.avg.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({ownerReviews.count} değerlendirme)</span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Henüz değerlendirme yok</div>
              )}
              <Link
                to="/uye/$id"
                params={{ id: listing.user_id }}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
              >
                Profili ve yorumları gör →
              </Link>
            </div>

            {!isOwner ? (
              <Button
                onClick={contactSeller}
                className="w-full mt-4 h-11 bg-brand hover:bg-brand/90"
              >
                <MessageSquare className="size-4 mr-2" /> Mesaj Gönder
              </Button>
            ) : (
              <div className="mt-4 space-y-2">
                <div className="p-2 rounded-md bg-muted text-xs text-center text-muted-foreground">
                  Bu sizin ilanınız — buradan yönetebilirsiniz
                </div>
                <OwnerEditDialog listing={listing} />
                <PromoteDialog listingId={listing.id} listingTitle={listing.title} />
                <Link to="/ilanlarim" className="block">
                  <Button variant="ghost" size="sm" className="w-full">Tüm ilanlarım</Button>
                </Link>
              </div>
            )}
          </div>

          <div className="bg-surface border border-border rounded-xl p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2 flex items-center gap-1.5"><ShieldAlert className="size-4 text-amber-600" aria-hidden /> Güvenlik Uyarısı</p>
            <p>Görüşmeden önce ödeme yapmayın, kimlik bilgilerinizi paylaşmayın. Anlaşmalarınızı yazılı yapın.</p>
          </div>
        </div>
      </div>

      <AdSlot slot="in_article" layout="in-article" format="fluid" className="mt-8" />






      <AlertDialog open={authDialog} onOpenChange={setAuthDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Üyelik Gerekli</AlertDialogTitle>
            <AlertDialogDescription>
              Mesaj gönderebilmek için üye girişi yapmanız gerekiyor. Hesabınız yoksa hızlıca oluşturabilirsiniz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => navigate({ to: "/auth", search: { redirect: `/ilan/${id}` } })}
            >
              Giriş Yap / Üye Ol
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoBox({ label, value, isEmpty }: { label: string; value: string; isEmpty?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-medium mt-1 ${isEmpty ? "text-muted-foreground italic text-sm font-normal" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function PromoBadge({ listing }: { listing: Listing }) {
  const active = listing.promoted_until ? new Date(listing.promoted_until) > new Date() : false;
  const badges: { key: string; label: string; Icon: typeof Sparkles; gradient: string; pulse: boolean }[] = [];
  if (listing.is_featured && active) {
    badges.push({ key: "featured", label: "VİTRİN", Icon: Sparkles, gradient: "from-amber-400 via-yellow-500 to-amber-600", pulse: true });
  }
  if (listing.is_showcase && active) {
    badges.push({ key: "showcase", label: "ÖNE ÇIKAN", Icon: StarIcon, gradient: "from-brand via-blue-500 to-brand", pulse: false });
  }
  if (listing.is_urgent) {
    badges.push({ key: "urgent", label: "ACİL", Icon: Flame, gradient: "from-red-500 via-rose-600 to-red-700", pulse: true });
  }
  if (badges.length === 0) return null;
  return (
    <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 items-end select-none">
      {badges.map(({ key, label, Icon, gradient, pulse }) => (
        <div key={key} className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-lg bg-gradient-to-r ${gradient} ${pulse ? "animate-pulse" : ""} ring-2 ring-white/40`}>
          {pulse && <span className="absolute inset-0 rounded-full bg-white/25 blur-md animate-ping" aria-hidden />}
          <Icon className="size-4 relative drop-shadow" />
          <span className="relative tracking-wide">{label}</span>
        </div>
      ))}
    </div>
  );
}

function OwnerEditDialog({ listing }: { listing: Listing }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(listing.title);
  const [price, setPrice] = useState<string>(listing.price != null ? String(listing.price) : "");
  const [priceType, setPriceType] = useState<string>(listing.price_type);
  const [description, setDescription] = useState(listing.description);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("listings")
      .update({
        title: title.trim(),
        description: description.trim(),
        price: price ? Number(price) : null,
        price_type: priceType as "hourly" | "daily" | "monthly" | "job" | "negotiable",
      })
      .eq("id", listing.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("İlan güncellendi");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["listing", listing.id] });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Pencil className="size-4 mr-2" /> İlanı Düzenle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>İlanı Düzenle</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Başlık</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fiyat (₺)</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Boş = pazarlıklı" />
            </div>
            <div>
              <Label>Ücret Tipi</Label>
              <Select value={priceType} onValueChange={setPriceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Saatlik</SelectItem>
                  <SelectItem value="daily">Günlük</SelectItem>
                  <SelectItem value="monthly">Aylık</SelectItem>
                  <SelectItem value="job">İş Başı</SelectItem>
                  <SelectItem value="negotiable">Pazarlıklı</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Açıklama</Label>
            <textarea
              className="w-full min-h-24 rounded-md border border-input bg-background p-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Vazgeç</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

