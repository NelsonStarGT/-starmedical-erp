import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = process.env.SUPABASE_BUCKET_PRIVATE || "erp-private";
const SUPABASE_ENABLED = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const LOCAL_STORAGE_ROOT = process.env.LOCAL_STORAGE_ROOT || "storage";

export type UploadResult = { bucket: string; path: string; sha256: string; size: number };

function normalizeRelativePath(targetPath: string) {
  return targetPath.replace(/^\/+/, "");
}

async function persistLocally(targetPath: string, buffer: Buffer): Promise<UploadResult> {
  const normalized = normalizeRelativePath(targetPath);
  const relativePath = path.join(LOCAL_STORAGE_ROOT, normalized);
  const absolutePath = path.join(process.cwd(), relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  return { bucket: "local", path: relativePath, sha256, size: buffer.length };
}

export async function uploadBufferToSupabase(targetPath: string, buffer: Buffer, contentType?: string): Promise<UploadResult> {
  const normalizedPath = normalizeRelativePath(targetPath);
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  if (!SUPABASE_ENABLED) {
    return persistLocally(normalizedPath, buffer);
  }

  try {
    const client = supabaseAdmin();
    const { error } = await client.storage.from(BUCKET).upload(normalizedPath, buffer, {
      contentType: contentType || "application/octet-stream",
      upsert: false
    });
    if (error) throw new Error(error.message);
    return { bucket: BUCKET, path: normalizedPath, sha256, size: buffer.length };
  } catch (err) {
    console.error("Supabase upload failed, falling back to local storage", err);
    return persistLocally(normalizedPath, buffer);
  }
}

export async function downloadFromSupabase(targetPath: string): Promise<Buffer | null> {
  if (!SUPABASE_ENABLED) return null;
  const client = supabaseAdmin();
  const { data, error } = await client.storage.from(BUCKET).download(targetPath);
  if (error || !data) return null;
  const arr = await data.arrayBuffer();
  return Buffer.from(arr);
}

export async function signedUrlFromSupabase(targetPath: string, expiresInSeconds = 600): Promise<string | null> {
  if (!SUPABASE_ENABLED) return null;
  const client = supabaseAdmin();
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(targetPath, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
