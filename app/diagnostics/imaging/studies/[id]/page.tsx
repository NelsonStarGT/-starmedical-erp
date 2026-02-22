import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/diagnostics/StatusBadge";
import StudyReportEditor from "./report-editor";

type Params = { params: { id: string } };

export const runtime = "nodejs";

export default async function ImagingStudyDetailPage({ params }: Params) {
  const study = await prisma.imagingStudy.findUnique({
    where: { id: params.id },
    include: {
      orderItem: {
        include: {
          catalogItem: true,
          order: { include: { patient: true } }
        }
      },
      reports: true
    }
  });

  if (!study) return notFound();

  const patient = study.orderItem.order.patient;
  const viewerBase = process.env.ORTHANC_VIEWER_URL || process.env.ORTHANC_BASE_URL;
  const viewerUrl =
    study.orthancStudyId && viewerBase
      ? `${viewerBase.replace(/\/$/, "")}/${study.orthancStudyId}`
      : null;

  const report = study.reports?.[0] || null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-md shadow-[#d7e6f8]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Estudio de imagen</p>
            <h2 className="text-2xl font-semibold text-[#163d66] font-[var(--font-dx-heading)]">
              {study.orderItem.catalogItem.name}
            </h2>
            <p className="text-sm text-slate-600">
              Paciente: <span className="font-semibold text-[#163d66]">{patient?.firstName} {patient?.lastName}</span>{" "}
              • Modalidad: {study.modality}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={study.orderItem.status} />
            {report && <StatusBadge status={report.status} />}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
          <span className="rounded-full bg-[#e8f1ff] px-3 py-1 text-[#2e75ba]">
            Orthanc ID: {study.orthancStudyId || "Pendiente"}
          </span>
          <span className="rounded-full bg-[#e5f5f2] px-3 py-1 text-[#1f6f68]">
            UID: {study.studyInstanceUID || "N/A"}
          </span>
          <Link
            href={study.modality === "US" ? "/diagnostics/imaging/us/worklist" : "/diagnostics/imaging/xray/worklist"}
            className="text-[#2e75ba] hover:underline"
          >
            Volver a worklist
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#dce7f5] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e5edf8] px-4 py-3">
            <h3 className="text-lg font-semibold text-[#163d66] font-[var(--font-dx-heading)]">Visor PACS</h3>
            {viewerUrl && (
              <Link
                href={viewerUrl}
                target="_blank"
                className="text-sm font-semibold text-[#2e75ba] hover:underline"
              >
                Abrir en pestaña
              </Link>
            )}
          </div>
          <div className="aspect-video overflow-hidden rounded-b-2xl bg-[#f8fafc]">
            {viewerUrl ? (
              <iframe src={viewerUrl} className="h-full w-full border-0" title="Visor Orthanc" allowFullScreen />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Agrega un OrthancStudyId para visualizar el estudio.
              </div>
            )}
          </div>
        </div>

        <StudyReportEditor
          imagingStudyId={study.id}
          orderItemId={study.orderItem.id}
          report={
            report
              ? {
                  ...report,
                  createdAt: report.createdAt.toISOString(),
                  updatedAt: report.updatedAt.toISOString(),
                  signedAt: report.signedAt ? report.signedAt.toISOString() : null,
                  releasedAt: report.releasedAt ? report.releasedAt.toISOString() : null
                }
              : null
          }
        />
      </div>
    </div>
  );
}
