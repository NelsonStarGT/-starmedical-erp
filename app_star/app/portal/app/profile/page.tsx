import Link from "next/link";
import { headers } from "next/headers";
import { auditPortalView } from "@/lib/portal/audit";
import { getPortalAffiliations, getPortalClientDocuments, type PortalClientDocumentItem } from "@/lib/portal/data";
import { getPortalPersonDisplayName } from "@/lib/portal/identity";
import { readPortalRequestMeta } from "@/lib/portal/requestMeta";
import { requirePortalSessionContext } from "@/lib/portal/session";
import { PortalResultDownloadButton } from "@/components/portal/PortalResultDownloadButton";

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

function docExpiryTone(status: PortalClientDocumentItem["expiryState"]) {
  if (status === "VIGENTE") return "border-[#cde7e4] bg-[#eff8f7] text-[#1f6f68]";
  if (status === "POR_VENCER") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "VENCIDO") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function docExpiryLabel(status: PortalClientDocumentItem["expiryState"]) {
  if (status === "VIGENTE") return "Vigente";
  if (status === "POR_VENCER") return "Por vencer";
  if (status === "VENCIDO") return "Vencido";
  return "Faltante";
}

function approvalTone(status: PortalClientDocumentItem["approvalStatus"]) {
  if (status === "APPROVED") return "border-[#cde7e4] bg-[#eff8f7] text-[#1f6f68]";
  if (status === "REJECTED") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function approvalLabel(status: PortalClientDocumentItem["approvalStatus"]) {
  if (status === "APPROVED") return "Aprobado";
  if (status === "REJECTED") return "Rechazado";
  return "Pendiente";
}

function formatDate(value: Date | null) {
  if (!value) return "Sin vencimiento";
  return value.toLocaleDateString("es-GT", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  });
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
  const [documents, affiliations] = await Promise.all([
    getPortalClientDocuments(session.clientId),
    getPortalAffiliations(session.clientId)
  ]);

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

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="space-y-3 rounded-2xl border border-[#d2e2f6] bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-[#2e75ba]">Documentos</h3>
          <p className="text-sm text-slate-600">Historial documental en modo solo lectura.</p>

          {documents.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#d2e2f6] bg-[#f8fbff] px-3 py-3 text-sm text-slate-600">
              No hay documentos registrados por ahora.
            </p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="rounded-xl border border-[#e3ecf9] bg-[#f8fbff] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{doc.title}</p>
                      <p className="text-xs text-slate-500">
                        {doc.typeName || "Sin tipo"} · v{doc.version} · Vence: {formatDate(doc.expiresAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${docExpiryTone(doc.expiryState)}`}>
                        {docExpiryLabel(doc.expiryState)}
                      </span>
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${approvalTone(doc.approvalStatus)}`}>
                        {approvalLabel(doc.approvalStatus)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    {doc.fileAssetId ? (
                      <PortalResultDownloadButton assetId={doc.fileAssetId} />
                    ) : doc.fileUrl ? (
                      <Link
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-[#d2e2f6] bg-[#f6fbff] px-3 py-1 text-xs font-semibold text-[#2e75ba]"
                      >
                        Ver
                      </Link>
                    ) : (
                      <p className="text-xs text-slate-500">Sin archivo adjunto.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="space-y-3 rounded-2xl border border-[#d2e2f6] bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-[#2e75ba]">Afiliaciones</h3>
          <p className="text-sm text-slate-600">Vínculos activos de tu perfil para atención y cobertura.</p>

          {affiliations.mode === "UNAVAILABLE" ? (
            <p className="rounded-xl border border-dashed border-[#d2e2f6] bg-[#f8fbff] px-3 py-3 text-sm text-slate-600">
              No disponible en este momento.
            </p>
          ) : (
            <div className="space-y-2">
              <Field label="Empresa" value={affiliations.companyName} />
              <Field label="Institución" value={affiliations.institutionName} />
              <Field label="Aseguradora" value={affiliations.insurerName} />
            </div>
          )}

          {affiliations.mode === "STAR_MEDICAL_DIRECT" ? (
            <p className="rounded-xl border border-[#cde7e4] bg-[#eff8f7] px-3 py-2 text-sm font-medium text-[#1f6f68]">
              Afiliación: StarMedical (particular).
            </p>
          ) : null}
        </article>
      </div>

      <article className="rounded-2xl border border-[#d2e2f6] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">Soporte de perfil</p>
        <p className="mt-2 text-sm text-slate-700">
          Para editar tu información, escribe por WhatsApp o llama al <span className="font-semibold">7729-3636</span>.
        </p>
        <Link
          href="https://wa.me/50277293636"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex rounded-full border border-[#cde7e4] bg-[#eff8f7] px-3 py-1.5 text-xs font-semibold text-[#1f6f68]"
        >
          Abrir WhatsApp
        </Link>
      </article>
    </section>
  );
}
