import Link from "next/link";
import { cookies } from "next/headers";
import { ClientProfileType, CompanyKind } from "@prisma/client";
import CompanyDocumentsWizard from "@/components/clients/CompanyDocumentsWizard";
import { getSessionUserFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tenantIdFromUser } from "@/lib/tenant";

function MissingInsurerState({ insurerId }: { insurerId?: string }) {
  const fallbackHref = insurerId
    ? `/admin/clientes/aseguradoras?error=not_found&q=${encodeURIComponent(insurerId)}`
    : "/admin/clientes/aseguradoras";

  return (
    <section className="mx-auto w-full max-w-5xl rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2e75ba]">Aseguradoras</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
        Aseguradora no encontrada
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {insurerId ? `No encontramos una aseguradora para “${insurerId}”.` : "No se pudo resolver la aseguradora."}
      </p>
      <div className="mt-4">
        <Link
          href={fallbackHref}
          className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
        >
          Volver a aseguradoras
        </Link>
      </div>
    </section>
  );
}

export default async function InsurerDocumentsWizardPage({
  params
}: {
  params: Promise<{ insurerId?: string }> | { insurerId?: string };
}) {
  const resolvedParams = await params;
  const insurerRef = resolvedParams.insurerId?.trim() || "";
  if (!insurerRef) return <MissingInsurerState />;

  const currentUser = await getSessionUserFromCookies(cookies());
  if (!currentUser) return <MissingInsurerState insurerId={insurerRef} />;
  const tenantId = tenantIdFromUser(currentUser);

  const insurerRecord = await prisma.company.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      kind: CompanyKind.INSURER,
      OR: [{ id: insurerRef }, { clientProfileId: insurerRef }],
      clientProfile: {
        type: ClientProfileType.INSURER,
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

  if (insurerRecord) {
    return (
      <CompanyDocumentsWizard
        organizationType="insurer"
        companyId={insurerRecord.id}
        clientId={insurerRecord.clientProfileId}
        companyLabel={
          insurerRecord.legalName ||
          insurerRecord.tradeName ||
          insurerRecord.clientProfile.companyName ||
          insurerRecord.clientProfile.tradeName ||
          "Aseguradora"
        }
      />
    );
  }

  const clientProfile = await prisma.clientProfile.findFirst({
    where: {
      id: insurerRef,
      type: ClientProfileType.INSURER,
      deletedAt: null
    },
    select: {
      id: true,
      companyName: true,
      tradeName: true
    }
  });

  if (!clientProfile) {
    return <MissingInsurerState insurerId={insurerRef} />;
  }

  return (
    <CompanyDocumentsWizard
      organizationType="insurer"
      companyId={clientProfile.id}
      clientId={clientProfile.id}
      companyLabel={clientProfile.companyName || clientProfile.tradeName || "Aseguradora"}
    />
  );
}
