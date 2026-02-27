import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromCookies } from "@/lib/auth";
import { resolveTenantContextForUser } from "@/lib/security/tenantContext.server";

export const runtime = "nodejs";

type SearchParams = {
  dpi?: string;
  nit?: string;
  q?: string;
};

export default async function ClientesBuscarPage({
  searchParams
}: {
  searchParams?: Promise<SearchParams | undefined> | SearchParams;
}) {
  const cookieStore = await cookies();
  const currentUser = await getSessionUserFromCookies(cookieStore);
  if (!currentUser) redirect("/login");
  const tenantContext = await resolveTenantContextForUser(currentUser, { cookieStore });
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const dpi = resolvedSearchParams?.dpi?.trim();
  const nit = resolvedSearchParams?.nit?.trim();
  const q = resolvedSearchParams?.q?.trim();

  // Este endpoint NO es un detalle. Es un "resolver" (lookup) previo:
  // - Recibe DPI/NIT (o `q`) como input de búsqueda.
  // - Resuelve el `ClientProfile.id` (clave técnica) y redirige al detalle por id.
  // Así mantenemos una sola estrategia de routing interna: `/admin/clientes/[id]`.
  if (!dpi && !nit && !q) redirect("/admin/clientes");

  const client =
    (dpi
      ? await prisma.clientProfile.findFirst({
          where: { dpi, tenantId: tenantContext.tenantId, deletedAt: null },
          select: { id: true }
        })
      : nit
        ? await prisma.clientProfile.findFirst({
            where: { nit, tenantId: tenantContext.tenantId, deletedAt: null },
            select: { id: true }
          })
        : null) ??
    (q
      ? await prisma.clientProfile.findFirst({
          where: { dpi: q, tenantId: tenantContext.tenantId, deletedAt: null },
          select: { id: true }
        })
      : null) ??
    (q
      ? await prisma.clientProfile.findFirst({
          where: { nit: q, tenantId: tenantContext.tenantId, deletedAt: null },
          select: { id: true }
        })
      : null);

  if (!client) {
    const term = dpi || nit || q || "";
    const normalized = term.replace(/\s+/g, " ").trim();
    const maybeDpi = /^\d{13}$/.test(normalized);

    if (dpi || maybeDpi) {
      const params = new URLSearchParams();
      params.set("error", "not_found");
      if (normalized) params.set("q", normalized);
      redirect(`/admin/clientes/personas?${params.toString()}`);
    }

    const params = new URLSearchParams();
    params.set("error", "not_found");
    if (normalized) params.set("q", normalized);
    redirect(`/admin/clientes/empresas?${params.toString()}`);
  }

  redirect(`/admin/clientes/${client.id}`);
}
