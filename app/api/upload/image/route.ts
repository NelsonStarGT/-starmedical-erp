import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { uploadBufferToSupabase } from "@/lib/storage/supabase";

const DEFAULT_MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const CLIENT_PHOTO_MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB
const DEFAULT_ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"]);
const CLIENT_PHOTO_ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const scope = String(formData.get("scope") ?? "").trim().toLowerCase();
    const isClientPhotoScope = scope === "clients/photos";
    const maxSizeBytes = isClientPhotoScope ? CLIENT_PHOTO_MAX_SIZE_BYTES : DEFAULT_MAX_SIZE_BYTES;
    const allowedTypes = isClientPhotoScope ? CLIENT_PHOTO_ALLOWED_TYPES : DEFAULT_ALLOWED_TYPES;
    const maxSizeLabel = isClientPhotoScope ? "3MB" : "25MB";

    const contentLengthHeader = req.headers.get("content-length");
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : Number.NaN;
    const multipartOverheadAllowance = 1 * 1024 * 1024; // boundary + form fields
    if (Number.isFinite(contentLength) && contentLength > maxSizeBytes + multipartOverheadAllowance) {
      return NextResponse.json({ ok: false, error: `El archivo supera ${maxSizeLabel}` }, { status: 413 });
    }

    if (!file) {
      return NextResponse.json({ ok: false, error: "Archivo requerido" }, { status: 400 });
    }
    const normalizedType = file.type.toLowerCase();
    if (!allowedTypes.has(normalizedType)) {
      return NextResponse.json(
        {
          ok: false,
          error: isClientPhotoScope ? "Solo se permiten JPG, PNG o WEBP" : "Solo se permiten JPG, PNG, WEBP o PDF"
        },
        { status: 400 }
      );
    }
    if (file.size > maxSizeBytes) {
      return NextResponse.json({ ok: false, error: `El archivo supera ${maxSizeLabel}` }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext =
      normalizedType === "application/pdf"
        ? "pdf"
        : normalizedType === "image/png"
          ? "png"
          : normalizedType === "image/webp"
            ? "webp"
            : "jpg";
    const filename = `${crypto.randomUUID()}.${ext}`;
    const folder = isClientPhotoScope ? "clients/photos" : "uploads";
    const path = `${folder}/${filename}`;
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
