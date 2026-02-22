import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { extensionFromMime, validateTextDocUpload } from "@/lib/text-docs/upload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errorResponse(code: string, status = 400) {
  return NextResponse.json({ ok: false, error: code }, { status });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return errorResponse("UNAUTHENTICATED", 401);

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return errorResponse("FILE_REQUIRED", 400);
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const uploadValidation = validateTextDocUpload(buffer, file.type);
  if (!uploadValidation.ok) return errorResponse(uploadValidation.error, uploadValidation.status);

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "text-docs");
  await fs.mkdir(uploadsDir, { recursive: true });

  const detectedMime = uploadValidation.mime;
  const fileName = `${Date.now()}-${randomUUID()}${extensionFromMime(detectedMime)}`;
  const filePath = path.join(uploadsDir, fileName);

  await fs.writeFile(filePath, buffer);

  const url = `/uploads/text-docs/${fileName}`;
  return NextResponse.json({ ok: true, data: { url, size: buffer.byteLength, type: detectedMime } });
}
