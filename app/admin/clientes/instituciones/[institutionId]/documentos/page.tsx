import Link from "next/link";
import { cookies } from "next/headers";
import { ClientProfileType, CompanyKind } from "@prisma/client";
import CompanyDocumentsWizard from "@/components/clients/CompanyDocumentsWizard";
import { getSessionUserFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tenantIdFromUser } from "@/lib/tenant";

function MissingInstitutionState({ institutionId }: { institutionId?: string }) {
  const fallbackHref = institutionId
    ? `/admin/clientes/instituciones?error=not_found&q=${encodeURIComponent(institutionId)}`
    : "/admin/clientes/instituciones";

  return (
    <section className="mx-auto w-full max-w-5xl rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2e75ba]">Instituciones</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
        Institución no encontrada
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {institutionId ? `No encontramos una institución para “${institutionId}”.` : "No se pudo resolver la institución."}
      </p>
      <div className="mt-4">
        <Link
          href={fallbackHref}
          className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
        >
          Volver a instituciones
        </Link>
      </div>
    </section>
  );
}

export default async function InstitutionDocumentsWizardPage({
  params
}: {
  params: Promise<{ institutionId?: string }> | { institutionId?: string };
}) {
  const resolvedParams = await params;
  const institutionRef = resolvedParams.institutionId?.trim() || "";
  if (!institutionRef) return <MissingInstitutionState />;

  const currentUser = await getSessionUserFromCookies(cookies());
  if (!currentUser) return <MissingInstitutionState institutionId={institutionRef} />;
  const tenantId = tenantIdFromUser(currentUser);

  const institutionRecord = await prisma.company.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      kind: CompanyKind.INSTITUTION,
      OR: [{ id: institutionRef }, { clientProfileId: institutionRef }],
      clientProfile: {
        type: ClientProfileType.INSTITUTION,
        deletedAt: null
      }
    },
    select: {
      id: true,
      clientProfileId: true,
      legalName: true,
      tradeName: true,
      clientProfile: {
        select: {
          companyName: true,
          tradeName: true
        }
      }
    }
  });

  if (institutionRecord) {
    return (
      <CompanyDocumentsWizard
        organizationType="institution"
        companyId={institutionRecord.id}
        clientId={institutionRecord.clientProfileId}
        companyLabel={
          institutionRecord.legalName ||
          institutionRecord.tradeName ||
          institutionRecord.clientProfile.companyName ||
          institutionRecord.clientProfile.tradeName ||
          "Institución"
        }
      />
    );
  }

  const clientProfile = await prisma.clientProfile.findFirst({
    where: {
      id: institutionRef,
      type: ClientProfileType.INSTITUTION,
      deletedAt: null
    },
    select: {
      id: true,
      companyName: true,
      tradeName: true
    }
  });

  if (!clientProfile) {
    return <MissingInstitutionState institutionId={institutionRef} />;
  }

  return (
    <CompanyDocumentsWizard
      organizationType="institution"
      companyId={clientProfile.id}
      clientId={clientProfile.id}
      companyLabel={clientProfile.companyName || clientProfile.tradeName || "Institución"}
    />
  );
}
