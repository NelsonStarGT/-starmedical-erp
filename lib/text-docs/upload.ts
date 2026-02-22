export type SupportedImageMime = "image/png" | "image/jpeg" | "image/webp";

export const MAX_TEXT_DOC_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB

const mimeToExt: Record<SupportedImageMime, ".png" | ".jpg" | ".webp"> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp"
};

export function normalizeImageMime(mime?: string | null): SupportedImageMime | null {
  const value = String(mime || "").toLowerCase().trim();
  if (value === "image/png") return "image/png";
  if (value === "image/jpeg" || value === "image/jpg") return "image/jpeg";
  if (value === "image/webp") return "image/webp";
  return null;
}

export function detectImageMime(buffer: Buffer): SupportedImageMime | null {
  if (buffer.length >= 8) {
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const isPng = pngSignature.every((byte, index) => buffer[index] === byte);
    if (isPng) return "image/png";
  }

  if (buffer.length >= 3) {
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (isJpeg) return "image/jpeg";
  }

  if (buffer.length >= 12) {
    const riff = buffer.toString("ascii", 0, 4) === "RIFF";
    const webp = buffer.toString("ascii", 8, 12) === "WEBP";
    if (riff && webp) return "image/webp";
  }

  return null;
}

export function extensionFromMime(mime: SupportedImageMime) {
  return mimeToExt[mime];
}

export function validateTextDocUpload(buffer: Buffer, reportedMime?: string | null) {
  if (!buffer.byteLength) {
    return { ok: false as const, error: "EMPTY_FILE", status: 400 };
  }
  if (buffer.byteLength > MAX_TEXT_DOC_UPLOAD_BYTES) {
    return { ok: false as const, error: "FILE_TOO_LARGE", status: 413 };
  }

  const detected = detectImageMime(buffer);
  if (!detected) {
    return { ok: false as const, error: "UNSUPPORTED_TYPE", status: 415 };
  }

  const normalizedReported = normalizeImageMime(reportedMime);
  if (normalizedReported && normalizedReported !== detected) {
    return { ok: false as const, error: "MIME_MISMATCH", status: 415 };
  }

  return { ok: true as const, mime: detected };
}

