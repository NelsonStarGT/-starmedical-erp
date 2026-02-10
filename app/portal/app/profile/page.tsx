import { headers } from "next/headers";
import { auditPortalView } from "@/lib/portal/audit";
import { getPortalPersonDisplayName } from "@/lib/portal/identity";
import { readPortalRequestMeta } from "@/lib/portal/requestMeta";
import { requirePortalSessionContext } from "@/lib/portal/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-[#dbe8f9] bg-[#f8fbff] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-900">{value || "No registrado"}</p>
    </div>
  );
}

function getAvatarFallback(fullName: string) {
  const parts = fullName
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "SM";
  const first = parts[0]?.charAt(0) ?? "";
  const second = parts[1]?.charAt(0) ?? "";
  return `${first}${second}`.toUpperCase();
}

export default async function PortalProfilePage() {
  const session = await requirePortalSessionContext();
  const requestMeta = readPortalRequestMeta(await headers());
  await auditPortalView({
    clientId: session.clientId,
    view: "profile",
    ip: requestMeta.ip,
    userAgent: requestMeta.userAgent
  });

  const fullName = getPortalPersonDisplayName(session.client);
  const address = [session.client.address, session.client.city, session.client.department, session.client.country]
    .filter(Boolean)
    .join(", ");

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[#d2e2f6] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Perfil</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Información del paciente</h2>
        <p className="mt-2 text-sm text-slate-600">Modo solo lectura. La edición se habilitará en una fase posterior.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[240px,1fr]">
        <aside className="rounded-2xl border border-[#d2e2f6] bg-white p-5 shadow-sm">
          {session.client.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.client.photoUrl}
              alt={`Foto de ${fullName}`}
              className="mx-auto h-36 w-36 rounded-full border border-[#d2e2f6] object-cover shadow-sm"
            />
          ) : (
            <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full bg-[#e6f3f2] text-3xl font-semibold text-[#1f6f68]">
              {getAvatarFallback(fullName)}
            </div>
          )}
          <p className="mt-4 text-center text-lg font-semibold text-slate-900">{fullName}</p>
          <p className="text-center text-sm text-slate-500">Paciente StarMedical</p>
        </aside>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nombre completo" value={fullName} />
          <Field label="DPI" value={session.client.dpi} />
          <Field label="NIT" value={session.client.nit} />
          <Field label="Correo electrónico" value={session.client.email} />
          <Field label="Teléfono" value={session.client.phone} />
          <Field label="Dirección" value={address || null} />
        </div>
      </div>
    </section>
  );
}
