import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { ensureCrmAccess } from "@/lib/api/crm";
import { PERMISSIONS, enforceDealOwnership, isAdmin as isAdminRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { signedUrlFromSupabase } from "@/lib/storage/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = ensureCrmAccess(req, PERMISSIONS.FILE_READ);
  if (auth.errorResponse) return auth.errorResponse;

  const id = params.id;
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const asset = await prisma.fileAsset.findUnique({
    where: { id },
    include: { deal: { select: { id: true, ownerId: true, ownerUserId: true, branchId: true } } }
  });
  if (!asset) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });

  if (asset.deal && !isAdminRole(auth.user) && !enforceDealOwnership(auth.user!, asset.deal as any)) {
    return NextResponse.json({ error: "No autorizado a descargar este archivo" }, { status: 403 });
  }

  // Intentar servir via signed URL de Supabase
  if (asset.storageKey) {
    try {
      const signed = await signedUrlFromSupabase(asset.storageKey);
      if (signed) {
        return NextResponse.redirect(signed, { status: 302 });
      }
    } catch {
      // fallback to local
    }
  }

  // Legacy: leer desde disco si existe
  try {
    const buffer = await fs.readFile(asset.storageKey);
    const filename = asset.originalName || `archivo-${asset.id}.pdf`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename=\"${filename}\"`
      }
    });
  } catch (err) {
    console.error("file download error", err);
    return NextResponse.json({ error: "No se pudo leer el archivo" }, { status: 500 });
  }
}
