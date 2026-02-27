import Link from "next/link";
import { cookies } from "next/headers";
import { ClientProfileType } from "@prisma/client";
import CompanyDocumentsWizard from "@/components/clients/CompanyDocumentsWizard";
import { getSessionUserFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tenantIdFromUser } from "@/lib/tenant";

function MissingCompanyState({ companyId }: { companyId?: string }) {
  const fallbackHref = companyId ? `/admin/clientes/empresas?error=not_found&q=${encodeURIComponent(companyId)}` : "/admin/clientes/empresas";
  return (
    <section className="mx-auto w-full max-w-5xl rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2e75ba]">Empresas</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
        Empresa no encontrada
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {companyId ? `No encontramos una empresa para “${companyId}”.` : "No se pudo resolver la empresa."}
      </p>
      <div className="mt-4">
        <Link
          href={fallbackHref}
          className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
        >
          Volver a empresas
        </Link>
      </div>
    </section>
  );
}

export default async function CompanyDocumentsWizardPage({
  params
}: {
  params: Promise<{ companyId?: string }> | { companyId?: string };
}) {
  const resolvedParams = await params;
  const companyRef = resolvedParams.companyId?.trim() || "";
  if (!companyRef) return <MissingCompanyState />;

  const currentUser = await getSessionUserFromCookies(cookies());
  if (!currentUser) return <MissingCompanyState companyId={companyRef} />;
  const tenantId = tenantIdFromUser(currentUser);

  const companyRecord = await prisma.company.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      OR: [{ id: companyRef }, { clientProfileId: companyRef }],
      clientProfile: {
        type: ClientProfileType.COMPANY,
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

  if (companyRecord) {
    return (
      <CompanyDocumentsWizard
        companyId={companyRecord.id}
        clientId={companyRecord.clientProfileId}
        companyLabel={
          companyRecord.legalName ||
          companyRecord.tradeName ||
          companyRecord.clientProfile.companyName ||
          companyRecord.clientProfile.tradeName ||
          "Empresa"
        }
      />
    );
  }

  const clientProfile = await prisma.clientProfile.findFirst({
    where: {
      id: companyRef,
      type: ClientProfileType.COMPANY,
      deletedAt: null
    },
    select: {
      id: true,
      companyName: true,
      tradeName: true
    }
  });

  if (!clientProfile) {
    return <MissingCompanyState companyId={companyRef} />;
  }

  return (
    <CompanyDocumentsWizard
      companyId={companyRef}
      clientId={clientProfile.id}
      companyLabel={clientProfile.companyName || clientProfile.tradeName || "Empresa"}
    />
  );
}
