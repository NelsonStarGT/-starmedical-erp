import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { ensureFinanceAccess } from "@/lib/api/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 15 * 1024 * 1024; // 15 MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export async function POST(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file requerido" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Formato no permitido (solo PDF/JPG/PNG)" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Archivo excede el límite de 15MB" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
    const randomName = crypto.randomUUID();
    const safeName = `${randomName}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "finance");
    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, safeName);
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      data: {
        fileUrl: `/uploads/finance/${safeName}`,
        fileName: file.name || safeName,
        mimeType: file.type,
        sizeBytes: file.size
      }
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo subir el adjunto" }, { status: 500 });
  }
}
