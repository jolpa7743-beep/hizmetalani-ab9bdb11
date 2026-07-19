// Deterministic random avatar generator (DiceBear).
// Same seed -> same avatar. Consistent style, different colors/features per seed.

const STYLE = "avataaars";
const BG = "b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf,transparent";

export function getAvatarUrl(seed: string | null | undefined, size = 96): string {
  const s = (seed ?? "guest").trim() || "guest";
  const encoded = encodeURIComponent(s);
  return `https://api.dicebear.com/9.x/${STYLE}/svg?seed=${encoded}&backgroundColor=${BG}&size=${size}&radius=50`;
}
