import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommended for GCM

function decodeKey(raw: string): Buffer {
  const asBase64 = Buffer.from(raw, "base64");
  if (asBase64.length === 32) return asBase64;

  const isHex = /^[0-9a-fA-F]+$/.test(raw);
  if (isHex) {
    const asHex = Buffer.from(raw, "hex");
    if (asHex.length === 32) return asHex;
  }

  const asUtf8 = Buffer.from(raw, "utf8");
  if (asUtf8.length === 32) return asUtf8;

  throw new Error("APP_ENCRYPTION_KEY debe representar 32 bytes (base64, hex o texto de 32 chars)");
}

function getKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) throw new Error("APP_ENCRYPTION_KEY no configurada");
  return decodeKey(raw.trim());
}

export function encryptSecret(plain: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${authTag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const key = getKey();
  const parts = payload.split(".");
  if (parts.length !== 3) throw new Error("Formato de secreto inválido");
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(dataB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
