function normalizeRaw(value: string) {
  return value.trim().replace(/\s+/g, "");
}

export function normalizeLinkHref(value: string) {
  const raw = normalizeRaw(value);
  if (!raw) return "";
  if (raw.startsWith("#")) return raw;
  if (raw.startsWith("/")) return raw;
  if (raw.startsWith("./")) return raw;
  if (raw.startsWith("../")) return raw;
  if (/^https?:/i.test(raw)) return raw;
  if (/^mailto:/i.test(raw)) return raw;
  if (/^tel:/i.test(raw)) return raw;
  return "";
}

export function normalizeImageSrc(value: string) {
  const raw = normalizeRaw(value);
  if (!raw) return "";
  if (raw.startsWith("/")) return raw;
  if (raw.startsWith("./")) return raw;
  if (raw.startsWith("../")) return raw;
  if (/^https?:/i.test(raw)) return raw;
  if (/^data:image\/(?:png|jpe?g|webp);base64,/i.test(raw)) return raw;
  return "";
}

