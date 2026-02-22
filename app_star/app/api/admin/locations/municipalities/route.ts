import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling, safeJson } from "@/lib/api/http";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const municipalitySchema = z.object({
  name: z.string().trim().min(2, "Nombre requerido"),
  departmentId: z.string().trim(),
  isActive: z.boolean().optional()
});

async function handler(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const perm = requirePermission(auth.user, "USERS:ADMIN");
  if (perm.errorResponse) return perm.errorResponse;

  if (req.method === "GET") {
    const departmentId = req.nextUrl.searchParams.get("departmentId") || undefined;
    const rows = await prisma.municipality.findMany({
      where: departmentId ? { departmentId } : undefined,
      orderBy: { name: "asc" }
    });
    return NextResponse.json({ data: rows });
  }

  if (req.method === "POST") {
    const body = await safeJson(req);
    const parsed = municipalitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const row = await prisma.municipality.create({
      data: {
        name: parsed.data.name,
        departmentId: parsed.data.departmentId,
        isActive: parsed.data.isActive ?? true
      }
    });
    return NextResponse.json({ data: row }, { status: 201 });
  }

  if (req.method === "PATCH") {
    const body = await safeJson(req);
    const parsed = municipalitySchema.extend({ id: z.string().trim() }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const row = await prisma.municipality.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        departmentId: parsed.data.departmentId,
        isActive: parsed.data.isActive ?? true
      }
    });
    return NextResponse.json({ data: row });
  }

  return NextResponse.json({ error: "Método no permitido" }, { status: 405 });
}

export const GET = withApiErrorHandling(handler);
export const POST = withApiErrorHandling(handler);
export const PATCH = withApiErrorHandling(handler);
