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
  return out.join("\n");
}
