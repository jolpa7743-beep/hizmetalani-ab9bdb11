// SEO-dostu URL slug yardımcıları.
// İlan URL'leri artık salt "başlık-slug" biçiminde tutulur (DB'de benzersiz `slug` sütunu).
// Eski salt-UUID bağlantıları geriye dönük çalışır: yükleyici hem slug hem UUID kabul eder.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Türkçe karakterleri normalize edip ASCII-slug üretir. */
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

/** URL param bir UUID mi? */
export function isUuid(v: string | null | undefined): boolean {
  return !!v && UUID_RE.test(v);
}

/** URL param'ından ilan UUID'sini çıkarır (varsa). */
export function extractListingId(slugParam: string): string | null {
  if (!slugParam) return null;
  return isUuid(slugParam) ? slugParam.toLowerCase() : null;
}

/** İlan URL segmenti üretir — DB slug'ı varsa onu, yoksa başlıktan üretilmişini, son çare UUID. */
export function listingSlug(
  title: string | null | undefined,
  id: string,
  slug?: string | null,
): string {
  if (slug && slug.trim()) return slug;
  const s = toSlug(title ?? "");
  return s || id;
}
