import crypto from "crypto";

const SECRET = process.env.APP_SECRET || process.env.EMAIL_SECRET_KEY;

function getSecret() {
  if (!SECRET) throw new Error("APP_SECRET/EMAIL_SECRET_KEY requerido para firmar cookies");
  return SECRET;
}

export function signCookie(payload: string) {
  const secret = getSecret();
  const h = crypto.createHmac("sha256", secret).update(payload).digest("base64");
  const data = Buffer.from(payload, "utf8").toString("base64");
  return `${data}.${h}`;
}

export function verifyCookie(signed: string): string | null {
  if (!signed) return null;
  const [dataB64, sig] = signed.split(".");
  if (!dataB64 || !sig) return null;
  const payload = Buffer.from(dataB64, "base64").toString("utf8");
  const secret = getSecret();
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return payload;
}
