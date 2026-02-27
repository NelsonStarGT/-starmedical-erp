import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyDetail } from "@/lib/companies/services/company.service";
import { isPrismaMissingTableError, logPrismaSchemaIssue } from "@/lib/prisma/errors.server";

function fmtDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-GT", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

type Params = { id: string };

export default async function CompanyDetailPage({ params }: { params: Params } | { params: Promise<Params> }) {
  const resolved = "then" in params ? await params : params;
  const company = await (async () => {
    try {
      return await getCompanyDetail({ companyId: resolved.id, tenantId: "default", includeArchived: true });
    } catch (error) {
      logPrismaSchemaIssue("admin.empresas.detail", error);
      if (isPrismaMissingTableError(error)) return "MISSING_TABLE";
      throw error;
    }
  })();
  if (company === "MISSING_TABLE") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">
          El módulo Company aún no está migrado en la base de datos.
        </div>
        <div>
          <Link
            href="/admin/empresas"
            className="inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-diagnostics-primary hover:text-diagnostics-corporate"
          >
            Volver a empresas
          </Link>
        </div>
      </div>
    );
  }
  if (!company) notFound();

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-diagnostics-corporate">Empresas · Detalle</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">{company.legalName}</h2>
        <p className="text-sm text-slate-600">{company.tradeName || "Sin nombre comercial"}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
          <span className="rounded-full border border-slate-200 px-3 py-1">Código: {company.code || "—"}</span>
          <span className="rounded-full border border-slate-200 px-3 py-1">NIT: {company.taxId || "—"}</span>
          <span className="rounded-full border border-slate-200 px-3 py-1">Estado: {company.deletedAt ? "Archivada" : company.status}</span>
          <span className="rounded-full border border-slate-200 px-3 py-1">Contrato: {company.contractStatus}</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Facturación</h3>
          <div className="mt-3 space-y-1 text-sm text-slate-700">
            <p>Email: {company.billingEmail || "—"}</p>
            <p>Teléfono: {company.billingPhone || "—"}</p>
            <p>Método pago: {company.defaultPaymentMethod || "—"}</p>
            <p>Término crédito: {company.defaultCreditTerm || "—"}</p>
            <p>
              Vigencia: {fmtDate(company.contractStartDate)} - {fmtDate(company.contractEndDate)}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Integraciones</h3>
          <div className="mt-3 space-y-1 text-sm text-slate-700">
            <p>ClientProfile: {company.clientProfileId}</p>
            <p>Party: {company.partyId || "—"}</p>
            <p>LegalEntity: {company.defaultBillingLegalEntityId || "—"}</p>
            <p>Tenant: {company.tenantId}</p>
          </div>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Contactos</h3>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{company.contacts.length}</p>
        </section>

        <section className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Sedes</h3>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{company.locations.length}</p>
        </section>

        <section className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Documentos</h3>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{company.documents.length}</p>
        </section>
      </div>

      <div>
        <Link
          href="/admin/empresas"
          className="inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-diagnostics-primary hover:text-diagnostics-corporate"
        >
          Volver a empresas
        </Link>
      </div>
    </div>
  );
}
