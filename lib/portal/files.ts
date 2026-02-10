import crypto from "crypto";
import path from "path";
import { promises as fs } from "fs";
import { prisma } from "@/lib/prisma";
import { downloadFromSupabase, signedUrlFromSupabase } from "@/lib/storage/supabase";

const LOCAL_STORAGE_ROOT = process.env.LOCAL_STORAGE_ROOT || "storage";

type PortalFileProxyTokenPayload = {
  storageKey: string;
  originalName: string | null;
  mimeType: string;
  expMs: number;
};

export type PortalFileReference = {
  assetId: string;
  storageKey: string;
  originalName: string | null;
  mimeType: string;
};

function getPortalSigningSecret() {
  return (
    process.env.PORTAL_AUTH_PEPPER ||
    process.env.APP_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.EMAIL_SECRET_KEY ||
    "dev-star-portal-pepper"
  );
}

function signPayload(payloadB64: string) {
  return crypto.createHmac("sha256", getPortalSigningSecret()).update(payloadB64).digest("base64url");
}

export function createPortalFileProxyToken(payload: PortalFileProxyTokenPayload) {
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signPayload(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function verifyPortalFileProxyToken(token: string): PortalFileProxyTokenPayload | null {
  const [payloadB64, signature] = String(token || "").split(".");
  if (!payloadB64 || !signature) return null;
  const expected = signPayload(payloadB64);
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as PortalFileProxyTokenPayload;
    if (!parsed?.storageKey || !parsed.mimeType || !parsed.expMs) return null;
    if (parsed.expMs <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function resolveSafeLocalPath(storageKey: string) {
  const normalized = path.posix.normalize(String(storageKey || "").replace(/\\/g, "/")).replace(/^\/+/, "");
  if (!normalized || normalized.startsWith("..")) return null;
  const prefixed = normalized.startsWith(`${LOCAL_STORAGE_ROOT}/`) ? normalized : `${LOCAL_STORAGE_ROOT}/${normalized}`;
  return path.join(process.cwd(), prefixed);
}

export async function loadPortalFileBuffer(storageKey: string) {
  const supabaseBuffer = await downloadFromSupabase(storageKey);
  if (supabaseBuffer) return supabaseBuffer;

  const localPath = resolveSafeLocalPath(storageKey);
  if (!localPath) return null;
  try {
    return await fs.readFile(localPath);
  } catch {
    return null;
  }
}

export async function resolvePortalFileReferenceByAssetId(assetId: string, clientId: string): Promise<PortalFileReference | null> {
  const normalizedAssetId = String(assetId || "").trim();
  if (!normalizedAssetId) return null;

  const [isClientDoc, isLabResult, isDiagnosticResult] = await Promise.all([
    prisma.clientDocument.findFirst({
      where: {
        clientId,
        fileAssetId: normalizedAssetId
      },
      select: { id: true }
    }),
    prisma.labTestOrder.findFirst({
      where: {
        patientId: clientId,
        resultFileAssetId: normalizedAssetId
      },
      select: { id: true }
    }),
    prisma.diagnosticOrder.findFirst({
      where: {
        patientId: clientId,
        resultFileAssetId: normalizedAssetId
      },
      select: { id: true }
    })
  ]);

  if (!isClientDoc && !isLabResult && !isDiagnosticResult) {
    return null;
  }

  const asset = await prisma.fileAsset.findUnique({
    where: { id: normalizedAssetId },
    select: {
      id: true,
      storageKey: true,
      originalName: true,
      mimeType: true
    }
  });
  if (!asset) return null;

  return {
    assetId: asset.id,
    storageKey: asset.storageKey,
    originalName: asset.originalName ?? null,
    mimeType: asset.mimeType
  };
}

export async function getSignedDownloadUrl(fileRef: PortalFileReference, ttlSeconds = 120) {
  const signedUrl = await signedUrlFromSupabase(fileRef.storageKey, ttlSeconds);
  if (signedUrl) {
    return {
      mode: "signed" as const,
      url: signedUrl,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000)
    };
  }

  const token = createPortalFileProxyToken({
    storageKey: fileRef.storageKey,
    originalName: fileRef.originalName,
    mimeType: fileRef.mimeType,
    expMs: Date.now() + ttlSeconds * 1000
  });

  return {
    mode: "proxy" as const,
    url: `/portal/api/files/proxy?token=${encodeURIComponent(token)}`,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000)
  };
}
