import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = process.env.SUPABASE_BUCKET_PRIVATE || "erp-private";

export type UploadResult = { bucket: string; path: string; sha256: string; size: number };

export async function uploadBufferToSupabase(path: string, buffer: Buffer, contentType?: string): Promise<UploadResult> {
  const client = supabaseAdmin();
  const { error } = await client.storage.from(BUCKET).upload(path, buffer, {
    contentType: contentType || "application/octet-stream",
    upsert: false
  });
  if (error) {
    throw new Error(error.message);
  }
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  return { bucket: BUCKET, path, sha256, size: buffer.length };
}

export async function downloadFromSupabase(path: string): Promise<Buffer | null> {
  const client = supabaseAdmin();
  const { data, error } = await client.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  const arr = await data.arrayBuffer();
  return Buffer.from(arr);
}

export async function signedUrlFromSupabase(path: string, expiresInSeconds = 600): Promise<string | null> {
  const client = supabaseAdmin();
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
