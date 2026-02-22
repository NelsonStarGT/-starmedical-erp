import Link from "next/link";
import { headers } from "next/headers";
import { auditPortalView } from "@/lib/portal/audit";
import { getPortalPrescriptions, getPortalResults } from "@/lib/portal/data";
import { formatPortalDateTime } from "@/lib/portal/format";
import { readPortalRequestMeta } from "@/lib/portal/requestMeta";
import { requirePortalSessionContext } from "@/lib/portal/session";
import { PortalResultDownloadButton } from "@/components/portal/PortalResultDownloadButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResultRowProps = {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
  detail: string | null;
  fileAssetId: string | null;
};

type PrescriptionRowProps = {
  id: string;
  createdAt: Date;
  doctorName: string | null;
  branchName: string | null;
  status: string;
  fileAssetId: string | null;
  fileUrl: string | null;
};

function ResultRow({ id, title, status, createdAt, detail, fileAssetId }: ResultRowProps) {
  return (
    <article className="rounded-2xl border border-[#d2e2f6] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">#{id.slice(-8).toUpperCase()}</p>
        </div>
        <span className="rounded-full border border-[#d2e2f6] bg-[#f6fbff] px-3 py-1 text-xs font-semibold text-[#2e75ba]">{status}</span>
      </div>
      <p className="mt-2 text-sm text-slate-600">{detail || "Sin observaciones adicionales."}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">{formatPortalDateTime(createdAt)}</p>
        {fileAssetId ? (
          <PortalResultDownloadButton assetId={fileAssetId} />
        ) : (
          <p className="text-xs text-slate-500">Sin archivo descargable por ahora.</p>
        )}
      </div>
    </article>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="rounded-xl border border-dashed border-[#d2e2f6] bg-[#f8fbff] px-4 py-6 text-sm text-slate-500">{label}</p>;
}

function PrescriptionRow({ id, createdAt, doctorName, branchName, status, fileAssetId, fileUrl }: PrescriptionRowProps) {
  return (
    <article className="rounded-2xl border border-[#d2e2f6] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">Receta #{id.slice(-8).toUpperCase()}</p>
          <p className="text-xs text-slate-500">{formatPortalDateTime(createdAt)}</p>
        </div>
        <span className="rounded-full border border-[#d2e2f6] bg-[#f6fbff] px-3 py-1 text-xs font-semibold text-[#2e75ba]">{status}</span>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Médico: <span className="font-medium text-slate-700">{doctorName || "No registrado"}</span> · Sede:{" "}
        <span className="font-medium text-slate-700">{branchName || "No registrada"}</span>
      </p>
      <div className="mt-3 flex justify-end">
        {fileAssetId ? (
          <PortalResultDownloadButton assetId={fileAssetId} />
        ) : fileUrl ? (
          <Link
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[#d2e2f6] bg-[#f6fbff] px-3 py-1 text-xs font-semibold text-[#2e75ba]"
          >
            Ver/descargar
          </Link>
        ) : (
          <p className="text-xs text-slate-500">Sin archivo adjunto.</p>
        )}
      </div>
    </article>
  );
}

export default async function PortalResultsPage() {
  const session = await requirePortalSessionContext();
  const requestMeta = readPortalRequestMeta(await headers());
  await auditPortalView({
    clientId: session.clientId,
    view: "results",
    ip: requestMeta.ip,
    userAgent: requestMeta.userAgent
  });

  const [results, prescriptions] = await Promise.all([
    getPortalResults(session.clientId),
    getPortalPrescriptions(session.clientId)
  ]);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[#d2e2f6] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Resultados</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Laboratorio e imagen</h2>
        <p className="mt-2 text-sm text-slate-600">
          Consulta resultados liberados de laboratorio, rayos X y ultrasonido en modo solo lectura.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-[#d2e2f6] bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Laboratorio</h3>
          {results.lab.length === 0 ? (
            <EmptyState label="No hay resultados de laboratorio asociados a tu perfil." />
          ) : (
            results.lab.map((item) => <ResultRow key={item.id} {...item} />)
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-[#d2e2f6] bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Rayos X / Ultrasonido</h3>
          {results.imaging.length === 0 ? (
            <EmptyState label="No hay resultados de imagen disponibles en este momento." />
          ) : (
            results.imaging.map((item) => <ResultRow key={item.id} {...item} />)
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-[#d2e2f6] bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Recetas médicas</h3>
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Receta válida únicamente firmada y sellada por el médico.
        </p>
        {prescriptions.length === 0 ? (
          <EmptyState label="Aún no hay recetas registradas." />
        ) : (
          <div className="space-y-3">
            {prescriptions.map((item) => (
              <PrescriptionRow key={item.id} {...item} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
