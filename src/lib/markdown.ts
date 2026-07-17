// Very small, safe Markdown -> HTML renderer for blog posts.
// Supports: # h1..h4, paragraphs, - / * lists, **bold**, *italic*,
// [link](url), inline `code`, --- hr, > blockquote, | tables (basic).
// Escapes HTML in text. No raw HTML passthrough.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(s: string): string {
  let out = escapeHtml(s);
  // links [text](url)
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_m, txt: string, url: string) => {
      const safe = /^(https?:|\/|mailto:|#)/i.test(url) ? url : "#";
      const rel = safe.startsWith("http") ? ` rel="noopener nofollow" target="_blank"` : "";
      return `<a href="${safe}"${rel} class="text-brand underline hover:no-underline">${txt}</a>`;
    },
  );
  out = out.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-muted rounded text-[0.9em]">$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  return out;
}

export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // heading
    const h = /^(#{1,4})\s+(.+)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const cls = ["text-3xl font-bold mt-8 mb-4", "text-2xl font-bold mt-8 mb-3", "text-xl font-semibold mt-6 mb-2", "text-lg font-semibold mt-4 mb-2"][level - 1];
      out.push(`<h${level} class="${cls}">${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }
    // hr
    if (/^---+\s*$/.test(line)) { out.push('<hr class="my-8 border-t" />'); i++; continue; }
    // blockquote
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, "")); i++; }
      out.push(`<blockquote class="border-l-4 border-brand pl-4 italic text-muted-foreground my-4">${inline(buf.join(" "))}</blockquote>`);
      continue;
    }
    // list
    if (/^[-*]\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        buf.push(`<li class="ml-6 list-disc">${inline(lines[i].replace(/^[-*]\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ul class="my-3 space-y-1">${buf.join("")}</ul>`);
      continue;
    }
    // table (very small: header row | sep | body rows)
    if (/^\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\|[\s\-|:]+\|\s*$/.test(lines[i + 1])) {
      const head = line.split("|").slice(1, -1).map((c) => c.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) {
        rows.push(lines[i].split("|").slice(1, -1).map((c) => c.trim()));
        i++;
      }
      out.push(
        `<div class="overflow-x-auto my-4"><table class="w-full text-sm border rounded"><thead class="bg-muted/50"><tr>${head
          .map((h) => `<th class="text-left px-3 py-2 font-semibold">${inline(h)}</th>`)
          .join("")}</tr></thead><tbody>${rows
          .map((r) => `<tr class="border-t">${r.map((c) => `<td class="px-3 py-2">${inline(c)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table></div>`,
      );
      continue;
    }
    // blank
    if (!line.trim()) { i++; continue; }
    // paragraph — collect until blank
    const buf: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|[-*]\s|>|\|)/.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    out.push(`<p class="my-4 leading-7">${inline(buf.join(" "))}</p>`);
  }
  return autoLinkInternal(out.join("\n"));
}

// ---------- Auto internal linking ----------
// Injects links to /istanbul/$slug for the first mention of each district
// and /blog/$slug for known blog anchors. Skips content inside existing
// <a>...</a>, headings, code, and tables. Case/diacritic-insensitive match.

import { ISTANBUL_ILCELERI } from "./istanbul-ilceler";

const BLOG_ANCHORS: Array<{ slug: string; patterns: string[] }> = [
  { slug: "kartal-ev-temizligi-fiyatlari-2026", patterns: ["kartal ev temizliği fiyatları", "kartal temizlik fiyatı"] },
  { slug: "istanbul-bakici-hizmeti-nasil-secilir", patterns: ["bakıcı seçimi", "güvenilir bakıcı", "çocuk bakıcısı seçimi"] },
  { slug: "ev-temizligi-kontrol-listesi", patterns: ["temizlik kontrol listesi", "temizlik checklist"] },
  { slug: "gecici-hayvan-yuvasi-bakimi", patterns: ["geçici hayvan yuvası", "pet sitter", "hayvan oteli"] },
  { slug: "istanbul-ilcelerine-gore-hizmet-yogunlugu", patterns: ["istanbul ilçelerine göre", "hizmet yoğunluğu haritası"] },
];

function trFold(s: string): string {
  return s.toLocaleLowerCase("tr")
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/İ/g, "i").replace(/ö/g, "o").replace(/ç/g, "c");
}

function escRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Walk HTML, protecting tags/anchors/headings/code/table cells from replacement.
function autoLinkInternal(html: string): string {
  // Split into segments we CAN edit vs must skip (existing anchors, headings, code, tables).
  const skipTag = /(<a\b[^>]*>[\s\S]*?<\/a>|<h[1-4][^>]*>[\s\S]*?<\/h[1-4]>|<code[^>]*>[\s\S]*?<\/code>|<table[^>]*>[\s\S]*?<\/table>|<[^>]+>)/gi;
  const parts: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = skipTag.exec(html)) !== null) {
    if (m.index > last) parts.push(html.slice(last, m.index)); // editable text
    parts.push("\0KEEP\0" + m[0]); // marker for skip
    last = m.index + m[0].length;
  }
  if (last < html.length) parts.push(html.slice(last));

  // Track used anchors so we only link the FIRST mention across the whole doc.
  const usedIlce = new Set<string>();
  const usedBlog = new Set<string>();

  const edited = parts.map((seg) => {
    if (seg.startsWith("\0KEEP\0")) return seg.slice(6);
    let text = seg;
    const foldedText = trFold(text);

    // Ilce links
    for (const ilce of ISTANBUL_ILCELERI) {
      if (usedIlce.has(ilce.slug)) continue;
      const needle = trFold(ilce.name);
      // word boundary at ASCII (safe after fold)
      const re = new RegExp(`\\b${escRegex(needle)}\\b`);
      const idx = foldedText.search(re);
      if (idx < 0) continue;
      // Find the same-length match in the ORIGINAL text at idx (folding preserves length)
      const original = text.slice(idx, idx + ilce.name.length);
      const before = text.slice(0, idx);
      const after = text.slice(idx + ilce.name.length);
      text =
        before +
        `<a href="/istanbul/${ilce.slug}" class="text-brand underline hover:no-underline" title="${ilce.name} ev hizmetleri">${original}</a>` +
        after;
      usedIlce.add(ilce.slug);
    }

    // Blog anchors
    for (const b of BLOG_ANCHORS) {
      if (usedBlog.has(b.slug)) continue;
      for (const pat of b.patterns) {
        const needle = trFold(pat);
        const foldedNow = trFold(text.replace(/<[^>]+>/g, "")); // rough
        if (!foldedNow.includes(needle)) continue;
        const re = new RegExp(escRegex(needle), "i");
        // Do a plain match on folded text of this segment
        const foldSeg = trFold(text);
        const at = foldSeg.search(re);
        if (at < 0) continue;
        const orig = text.slice(at, at + pat.length);
        text =
          text.slice(0, at) +
          `<a href="/blog/${b.slug}" class="text-brand underline hover:no-underline">${orig}</a>` +
          text.slice(at + pat.length);
        usedBlog.add(b.slug);
        break;
      }
    }
    return text;
  });

  return edited.join("");
}
