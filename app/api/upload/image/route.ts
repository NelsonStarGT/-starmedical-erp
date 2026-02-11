import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { uploadBufferToSupabase } from "@/lib/storage/supabase";

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const contentLengthHeader = req.headers.get("content-length");
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : Number.NaN;
    const multipartOverheadAllowance = 1 * 1024 * 1024; // boundary + form fields
    if (Number.isFinite(contentLength) && contentLength > MAX_SIZE + multipartOverheadAllowance) {
      return NextResponse.json({ ok: false, error: "El archivo supera 25MB" }, { status: 413 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ ok: false, error: "Archivo requerido" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ ok: false, error: "Solo se permiten JPG, PNG o PDF" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ ok: false, error: "El archivo supera 25MB" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
    const filename = `${crypto.randomUUID()}.${ext}`;
    const path = `uploads/${filename}`;
    const uploaded = await uploadBufferToSupabase(path, buffer, file.type);

    const asset = await prisma.fileAsset.create({
      data: {
        storageKey: uploaded.path,
        mimeType: file.type,
        sizeBytes: uploaded.size,
        sha256: uploaded.sha256,
        originalName: file.name,
        createdByUserId: null
      }
    });

    return NextResponse.json({ ok: true, url: `/api/files/${asset.id}`, assetId: asset.id, fileKey: uploaded.path }, { status: 201 });
  } catch (err) {
    console.error("Upload error", err);
    return NextResponse.json({ ok: false, error: "Error al subir la imagen" }, { status: 500 });
  }
}
