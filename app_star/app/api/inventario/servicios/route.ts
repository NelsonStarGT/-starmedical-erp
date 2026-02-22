import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { roleFromRequest } from "@/lib/api/auth";
import { serviciosMock } from "@/lib/mock/servicios";

export async function GET(req: NextRequest) {
  try {
    const role = roleFromRequest(req);
    if (!role) return NextResponse.json({ error: "Rol no proporcionado" }, { status: 401 });
    const search = req.nextUrl.searchParams.get("q")?.toLowerCase() || "";

    const items = await prisma.service.findMany({
      include: {
        category: true,
        subcategory: true
      },
      orderBy: { updatedAt: "desc" }
    });

    const data = items
      .filter((s) => {
        if (!search) return true;
        const haystack = `${s.name} ${s.code || ""} ${s.category?.name || ""} ${s.subcategory?.name || ""}`.toLowerCase();
        return search.split(/\s+/).every((t) => haystack.includes(t));
      })
      .map((s) => ({
        id: s.id,
        nombre: s.name,
        categoriaId: s.categoryId,
        subcategoriaId: s.subcategoryId || undefined,
        area: s.category?.area,
        proveedorId: "",
        codigoServicio: s.code || undefined,
        duracionMin: s.durationMin,
        precioVenta: Number(s.price || 0),
        costoBase: undefined,
        productosAsociados: [],
        costoCalculado: 0,
        imageUrl: (s as any).imageUrl || undefined,
        estado: (s as any).status || "Activo",
        categoriaNombre: s.category?.name,
        subcategoriaNombre: s.subcategory?.name
      }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    const data = serviciosMock.map((s) => ({
      ...s,
      categoriaNombre: undefined,
      subcategoriaNombre: undefined
    }));
    return NextResponse.json({ data, warning: "Usando datos mock; verifica migraciones/DB" }, { status: 200 });
  }
}
