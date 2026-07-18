// SEO-dostu URL slug yardımcıları.
// İlan URL'leri "başlık-slug-<uuid>" biçiminde tutulur; eski salt-UUID
// bağlantıları da geriye dönük çalışır (UUID sondan çıkarılır).

const UUID_RE = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
const BARE_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Türkçe karakterleri koruyarak SEO-uyumlu bir slug üretir. */
export function toSlug(input: string): string {
  if (!input) return "";
  const map: Record<string, string> = {
    ç: "c", Ç: "c",
    ğ: "g", Ğ: "g",
    ı: "i", I: "i", İ: "i",
    ö: "o", Ö: "o",
    ş: "s", Ş: "s",
    ü: "u", Ü: "u",
  };
  const replaced = input.replace(/[çÇğĞıIİöÖşŞüÜ]/g, (ch) => map[ch] ?? ch);
  return replaced
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** URL param'ından ilan UUID'sini çıkarır. */
export function extractListingId(slugParam: string): string | null {
  if (!slugParam) return null;
  if (BARE_UUID_RE.test(slugParam)) return slugParam.toLowerCase();
  const m = slugParam.match(UUID_RE);
  return m ? m[1].toLowerCase() : null;
}

/** İlan URL segmenti üretir. */
export function listingSlug(title: string | null | undefined, id: string): string {
  const s = toSlug(title ?? "");
  return s ? `${s}-${id}` : id;
}
