import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { uploadBufferToSupabase } from "@/lib/storage/supabase";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

export const runtime = "nodejs";
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb"
    }
  }
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Solo se permiten JPG y PNG" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "El archivo supera 20MB" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type === "image/png" ? "png" : "jpg";
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

    return NextResponse.json({ url: `/api/files/${asset.id}`, assetId: asset.id }, { status: 201 });
  } catch (err) {
    console.error("Upload error", err);
    return NextResponse.json({ error: "Error al subir la imagen" }, { status: 500 });
  }
}
