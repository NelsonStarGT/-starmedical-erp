import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { uploadBufferToSupabase, downloadFromSupabase } from "@/lib/storage/supabase";

export type StoredPdf = {
  pdfUrl: string;
  pdfHash: string;
  fileAssetId?: string | null;
  pdfVersion: number;
  sizeBytes: number;
  storageKey: string;
};

export async function persistQuotePdf(buffer: Buffer, quoteId: string, actorUserId?: string | null, dealId?: string | null): Promise<StoredPdf> {
  const filePath = `quotes/${quoteId}/${Date.now()}.pdf`;
  const uploaded = await uploadBufferToSupabase(filePath, buffer, "application/pdf");

  const asset = await prisma.fileAsset.create({
    data: {
      storageKey: uploaded.path,
      dealId: dealId || null,
      mimeType: "application/pdf",
      sizeBytes: Number(uploaded.size),
      sha256: uploaded.sha256,
      createdByUserId: actorUserId || null
    }
  });

  return {
    pdfUrl: `/api/files/${asset.id}`,
    pdfHash: uploaded.sha256,
    fileAssetId: asset.id,
    pdfVersion: Math.floor(Date.now() / 1000),
    sizeBytes: uploaded.size,
    storageKey: uploaded.path
  };
}

export async function readExistingPdf(pdfUrl?: string | null): Promise<Buffer | null> {
  if (!pdfUrl) return null;
  const isHttp = pdfUrl.startsWith("http://") || pdfUrl.startsWith("https://");
  if (isHttp) return null;

  // Try Supabase direct path
  try {
    const supabaseBuffer = await downloadFromSupabase(pdfUrl);
    if (supabaseBuffer) return supabaseBuffer;
  } catch {
    // ignore and fallback to legacy
  }

  // If pdfUrl references the protected endpoint, resolve the stored file path.
  if (pdfUrl.startsWith("/api/files/")) {
    const assetId = pdfUrl.replace("/api/files/", "");
    if (!assetId) return null;
    try {
      const asset = await prisma.fileAsset.findUnique({ where: { id: assetId } });
      if (!asset?.storageKey) return null;
      const sb = await downloadFromSupabase(asset.storageKey);
      if (sb) return sb;
      return await fs.readFile(asset.storageKey);
    } catch {
      return null;
    }
  }

  // Fallback for absolute/relative paths already stored (legacy local files).
  const absolute = path.isAbsolute(pdfUrl) ? pdfUrl : path.join(process.cwd(), pdfUrl.startsWith("/") ? pdfUrl.slice(1) : pdfUrl);
  try {
    return await fs.readFile(absolute);
  } catch {
    try {
      return await fs.readFile(path.join(process.cwd(), "public", pdfUrl));
    } catch {
      return null;
    }
  }
}
