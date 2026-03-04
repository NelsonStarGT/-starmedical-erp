import { NextRequest, NextResponse } from "next/server";
import { ImportKind, processImport } from "@/lib/inventory/import";
import { requirePermission } from "@/lib/inventory/auth";
import { resolveInventoryScope } from "@/lib/inventory/scope";

export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest, { params }: { params: { kind: string } }) {
  const kind = params.kind as ImportKind;
  if (!["productos", "stock", "precios", "costos", "servicios"].includes(kind)) {
    return NextResponse.json({ error: "Tipo de importación no soportado" }, { status: 400 });
  }

  const perm = requirePermission(req, "importar_inventario");
  if (perm) return perm;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;

  try {
    const form = await req.formData();
    const file = form.get("file");
    const previewFlag = (form.get("preview") as string) === "true" || req.nextUrl.searchParams.get("preview") === "true";
    const branchIdParam = (form.get("branchId") as string) || req.nextUrl.searchParams.get("branchId") || undefined;
    if (scope.branchId && branchIdParam && branchIdParam !== scope.branchId) {
      return NextResponse.json({ error: "Branch fuera de alcance" }, { status: 403 });
    }
    const branchId = scope.branchId || branchIdParam;
    const userId = (form.get("userId") as string) || "admin";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }
    if (!file.name.endsWith(".xlsx")) {
      return NextResponse.json({ error: "Solo se permiten archivos .xlsx" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Archivo supera 5MB" }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await processImport(kind, buffer, {
      preview: previewFlag,
      tenantId: scope.tenantId,
      branchId,
      userId: scope.userId || userId
    });
    return NextResponse.json({ preview: previewFlag, result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo procesar la importación" }, { status: 500 });
  }
}
