const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "s",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "blockquote",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "a",
  "span",
  "div"
]);

function escapeHtml(raw: string) {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(raw: string) {
  return escapeHtml(raw).replaceAll("`", "&#96;");
}

function extractHref(attrs: string) {
  const quoted = attrs.match(/\shref\s*=\s*(["'])(.*?)\1/i);
  if (quoted?.[2]) return quoted[2].trim();

  const bare = attrs.match(/\shref\s*=\s*([^\s>]+)/i);
  if (bare?.[1]) return bare[1].trim();
  return "";
}

function sanitizeHref(raw: string) {
  if (!raw) return null;
  const normalized = raw.trim().replace(/[\u0000-\u001F\u007F\s]+/g, "");
  if (!normalized) return null;

  if (normalized.startsWith("#") || normalized.startsWith("/")) return normalized;
  if (/^https?:/i.test(normalized)) return normalized;
  if (/^mailto:/i.test(normalized)) return normalized;
  if (/^tel:/i.test(normalized)) return normalized;
  return null;
}

function hasVisibleText(html: string) {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0;
}

export function sanitizeRichHtml(raw: string): string {
  let html = String(raw || "");

  html = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*(script|iframe|object|embed)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed)\b[^>]*\/?>/gi, "")
    .replace(/<\/?(meta|base|link|style)\b[^>]*>/gi, "")
    .replace(/\s+on[a-z-]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+style\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+srcdoc\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(href|src|xlink:href)\s*=\s*("|')\s*javascript:[\s\S]*?\2/gi, "")
    .replace(/\s+(href|src|xlink:href)\s*=\s*("|')\s*data:text\/html[\s\S]*?\2/gi, "");

  html = html.replace(/<([a-z0-9:-]+)\b[^>]*>/gi, (match, rawTag: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";

    if (tag === "a") {
      const href = sanitizeHref(extractHref(match));
      if (!href) return "<a>";
      return `<a href="${escapeAttribute(href)}" rel="noopener noreferrer" target="_blank">`;
    }

    if (tag === "br") return "<br>";
    if (tag === "hr") return "<hr>";
    return `<${tag}>`;
  });

  html = html.replace(/<\/([a-z0-9:-]+)\s*>/gi, (_match, rawTag: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (tag === "br" || tag === "hr") return "";
    return `</${tag}>`;
  });

  return html.trim();
}

export function sanitizeRichHtmlOrDash(raw: string, fallbackText = "—"): string {
  const safe = sanitizeRichHtml(raw);
  if (!safe || !hasVisibleText(safe)) {
    return `<p>${escapeHtml(fallbackText)}</p>`;
  }
  return safe;
}
