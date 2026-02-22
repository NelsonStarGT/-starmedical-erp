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
  "div",
  "img"
]);

const VOID_TAGS = new Set(["br", "hr", "img"]);

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

function normalizeWhitespace(raw: string) {
  return raw.replace(/[\u0000-\u001F\u007F]+/g, "").trim();
}

function sanitizeClassNames(raw?: string) {
  if (!raw) return null;
  const classes = raw
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => /^[a-zA-Z0-9:_-]+$/.test(item));
  if (!classes.length) return null;
  return classes.join(" ");
}

function parseAttributes(rawAttrs: string) {
  const attrs = new Map<string, string>();
  const attrRegex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match: RegExpExecArray | null = attrRegex.exec(rawAttrs);
  while (match) {
    const key = match[1].toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? "";
    attrs.set(key, value);
    match = attrRegex.exec(rawAttrs);
  }
  return attrs;
}

function sanitizeHref(raw?: string | null) {
  if (!raw) return null;
  const normalized = normalizeWhitespace(raw).replace(/\s+/g, "");
  if (!normalized) return null;
  if (normalized.startsWith("#")) return normalized;
  if (normalized.startsWith("/")) return normalized;
  if (normalized.startsWith("./")) return normalized;
  if (normalized.startsWith("../")) return normalized;
  if (/^https?:/i.test(normalized)) return normalized;
  if (/^mailto:/i.test(normalized)) return normalized;
  if (/^tel:/i.test(normalized)) return normalized;
  return null;
}

function sanitizeImageSrc(raw?: string | null) {
  if (!raw) return null;
  const normalized = normalizeWhitespace(raw).replace(/\s+/g, "");
  if (!normalized) return null;
  if (normalized.startsWith("/")) return normalized;
  if (normalized.startsWith("./")) return normalized;
  if (normalized.startsWith("../")) return normalized;
  if (/^https?:/i.test(normalized)) return normalized;
  if (/^data:image\/(?:png|jpe?g|webp);base64,/i.test(normalized)) return normalized;
  return null;
}

function clampNumber(raw: string, min: number, max: number, allowFloat = false) {
  const parsed = allowFloat ? Number.parseFloat(raw) : Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return null;
  const next = Math.min(max, Math.max(min, parsed));
  return allowFloat ? next : Math.round(next);
}

function sanitizeInlineStyle(raw?: string | null) {
  if (!raw) return null;
  const safeDecl: string[] = [];
  const declarations = raw.split(";");
  for (const decl of declarations) {
    const [propRaw, ...valueParts] = decl.split(":");
    const prop = propRaw?.trim().toLowerCase();
    const value = valueParts.join(":").trim();
    if (!prop || !value) continue;

    if (prop === "text-align" && /^(left|center|right|justify|start|end)$/i.test(value)) {
      safeDecl.push(`text-align:${value.toLowerCase()}`);
      continue;
    }

    if (prop === "margin-left" && /^-?\d+(\.\d+)?px$/i.test(value)) {
      const px = clampNumber(value.replace(/px$/i, ""), 0, 96 * 5, true);
      if (px !== null) safeDecl.push(`margin-left:${px}px`);
      continue;
    }

    if (prop === "text-indent" && /^-?\d+(\.\d+)?px$/i.test(value)) {
      const px = clampNumber(value.replace(/px$/i, ""), -96 * 2, 96 * 2, true);
      if (px !== null) safeDecl.push(`text-indent:${px}px`);
      continue;
    }

    if (prop === "color" || prop === "background-color") {
      if (
        /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) ||
        /^rgb(a)?\(([\d.\s,%]+)\)$/i.test(value) ||
        /^[a-z]+$/i.test(value)
      ) {
        safeDecl.push(`${prop}:${value}`);
      }
      continue;
    }

    if (prop === "font-weight" && /^(normal|bold|[1-9]00)$/i.test(value)) {
      safeDecl.push(`font-weight:${value.toLowerCase()}`);
    }
  }

  if (!safeDecl.length) return null;
  return safeDecl.join(";");
}

function addOptionalAttr(out: string[], key: string, value?: string | null) {
  if (!value) return;
  out.push(`${key}="${escapeAttribute(value)}"`);
}

function sanitizeTagAttrs(tag: string, attrs: Map<string, string>) {
  const out: string[] = [];

  const safeClass = sanitizeClassNames(attrs.get("class"));
  addOptionalAttr(out, "class", safeClass);

  if (attrs.has("data-indent")) {
    const parsed = clampNumber(attrs.get("data-indent") || "", 0, 96 * 5, true);
    if (parsed !== null) out.push(`data-indent="${parsed}"`);
  }
  if (attrs.has("data-first-indent")) {
    const parsed = clampNumber(attrs.get("data-first-indent") || "", -96 * 2, 96 * 2, true);
    if (parsed !== null) out.push(`data-first-indent="${parsed}"`);
  }

  const safeStyle = sanitizeInlineStyle(attrs.get("style"));
  addOptionalAttr(out, "style", safeStyle);

  if (tag === "a") {
    const safeHref = sanitizeHref(attrs.get("href"));
    addOptionalAttr(out, "href", safeHref);
    if (safeHref) {
      out.push('target="_blank"');
      out.push('rel="noopener noreferrer"');
    }
  }

  if (tag === "img") {
    const safeSrc = sanitizeImageSrc(attrs.get("src"));
    addOptionalAttr(out, "src", safeSrc);
    addOptionalAttr(out, "alt", normalizeWhitespace(attrs.get("alt") || ""));
    addOptionalAttr(out, "title", normalizeWhitespace(attrs.get("title") || ""));

    const width = clampNumber(attrs.get("width") || "", 1, 4096);
    const height = clampNumber(attrs.get("height") || "", 1, 4096);
    if (width !== null) out.push(`width="${width}"`);
    if (height !== null) out.push(`height="${height}"`);
  }

  if (tag === "th" || tag === "td") {
    const colSpan = clampNumber(attrs.get("colspan") || "", 1, 50);
    const rowSpan = clampNumber(attrs.get("rowspan") || "", 1, 50);
    if (colSpan !== null) out.push(`colspan="${colSpan}"`);
    if (rowSpan !== null) out.push(`rowspan="${rowSpan}"`);
  }

  return out.join(" ");
}

export function sanitizeTextDocHtml(raw: string) {
  let html = String(raw || "");

  html = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*(script|iframe|object|embed)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed)\b[^>]*\/?>/gi, "")
    .replace(/<\/?(meta|base|link|style)\b[^>]*>/gi, "")
    .replace(/\s+on[a-z-]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+srcdoc\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(href|src|xlink:href)\s*=\s*("|')\s*javascript:[\s\S]*?\2/gi, "")
    .replace(/\s+(href|src|xlink:href)\s*=\s*("|')\s*data:text\/html[\s\S]*?\2/gi, "");

  html = html.replace(/<([a-z0-9:-]+)\b([^>]*)>/gi, (_match, rawTag: string, rawAttrs: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    const attrs = parseAttributes(rawAttrs || "");
    const safeAttrs = sanitizeTagAttrs(tag, attrs);
    if (VOID_TAGS.has(tag)) {
      return safeAttrs ? `<${tag} ${safeAttrs}>` : `<${tag}>`;
    }
    return safeAttrs ? `<${tag} ${safeAttrs}>` : `<${tag}>`;
  });

  html = html.replace(/<\/([a-z0-9:-]+)\s*>/gi, (_match, rawTag: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (VOID_TAGS.has(tag)) return "";
    return `</${tag}>`;
  });

  return html.trim();
}

export function hasVisibleText(rawHtml: string) {
  const text = String(rawHtml || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0;
}

