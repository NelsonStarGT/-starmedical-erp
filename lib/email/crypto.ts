import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

function getKey() {
  const key = process.env.EMAIL_SECRET_KEY;
  if (!key) throw new Error("EMAIL_SECRET_KEY no configurada");

  // hex 64
  if (/^[0-9a-fA-F]{64}$/.test(key)) return Buffer.from(key, "hex");

  // base64 for 32 bytes
  try {
    const buf = Buffer.from(key, "base64");
    if (buf.length === 32) return buf;
  } catch {
    /* ignore */
  }

  throw new Error("EMAIL_SECRET_KEY debe ser 32 bytes (64 hex o base64 de 32 bytes)");
}

export function encryptSecret(plain: string) {
  const iv = crypto.randomBytes(IV_LEN);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

export function decryptSecret(payload: string) {
  if (!payload) throw new Error("Payload vacío");
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Payload de cifrado inválido");
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return dec.toString("utf8");
}
