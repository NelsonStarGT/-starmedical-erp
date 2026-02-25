import Link from "next/link";
import { ClientCatalogType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { safeGetClientRulesConfig } from "@/lib/clients/rulesConfig";
import ClientCatalogManager from "@/components/clients/config/ClientCatalogManager";
import ClientRulesEditor from "@/components/clients/config/ClientRulesEditor";
import ClientRequiredDocumentsRulesEditor from "@/components/clients/config/ClientRequiredDocumentsRulesEditor";
import GeoCatalogManager from "@/components/clients/config/GeoCatalogManager";
import ClientAcquisitionSourceManager from "@/components/clients/config/ClientAcquisitionSourceManager";
import { cn } from "@/lib/utils";

type Section = "catalogos" | "canales" | "reglas" | "validaciones" | "futuro";

type SearchParams = {
  section?: string | string[];
};

const SECTION_TABS: Array<{ key: Section; label: string; description: string }> = [
  { key: "catalogos", label: "Catálogos", description: "Catálogos maestros usados por formularios de Clientes" },
  {
    key: "canales",
    label: "Canales y comercial",
    description: "Canal de adquisición separado de relación comercial legacy"
  },
  { key: "reglas", label: "Reglas", description: "Reglas operativas de score, alertas y documentos" },
  {
    key: "validaciones",
    label: "Validaciones por país",
    description: "Consola técnica para geografía y validaciones dinámicas"
  },
  { key: "futuro", label: "Futuro", description: "Funciones deshabilitadas hasta activar Finanzas/Contabilidad" }
];

function firstParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function toSection(value?: string | null): Section {
  const normalized = (value || "").toLowerCase();
  if (normalized === "catalogos" || normalized === "canales" || normalized === "reglas" || normalized === "validaciones" || normalized === "futuro") {
    return normalized;
  }
  return "catalogos";
}

export default async function ClientesConfiguracionPage({
  searchParams
}: {
  searchParams?: Promise<SearchParams | undefined> | SearchParams;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const section = toSection(firstParam(resolvedSearchParams?.section));

  const [
    personCategories,
    professions,
    maritalStatuses,
    academicLevels,
    companyCategories,
    institutionCategories,
    institutionTypes,
    clientStatuses,
    relationTypes,
    documentTypes,
    acquisitionSources,
    acquisitionDetails,
    socialNetworks,
    relationshipTypes,
    locationTypes,
    rulesConfig,
    requiredRules,
    requiredDocumentTypes
  ] = await Promise.all([
    prisma.clientCatalogItem.findMany({
      where: { type: ClientCatalogType.PERSON_CATEGORY },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, isActive: true }
    }),
    prisma.clientCatalogItem.findMany({
      where: { type: ClientCatalogType.PERSON_PROFESSION },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, isActive: true }
    }),
    prisma.clientCatalogItem.findMany({
      where: { type: ClientCatalogType.MARITAL_STATUS },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, isActive: true }
    }),
    prisma.clientCatalogItem.findMany({
      where: { type: ClientCatalogType.ACADEMIC_LEVEL },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, isActive: true }
    }),
    prisma.clientCatalogItem.findMany({
      where: { type: ClientCatalogType.COMPANY_CATEGORY },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, isActive: true }
    }),
    prisma.clientCatalogItem.findMany({
      where: { type: ClientCatalogType.INSTITUTION_CATEGORY },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, isActive: true }
    }),
    prisma.clientCatalogItem.findMany({
      where: { type: ClientCatalogType.INSTITUTION_TYPE },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, isActive: true }
    }),
    prisma.clientCatalogItem.findMany({
      where: { type: ClientCatalogType.CLIENT_STATUS },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, isActive: true }
    }),
    prisma.clientCatalogItem.findMany({
      where: { type: ClientCatalogType.RELATION_TYPE },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, isActive: true }
    }),
    prisma.clientCatalogItem.findMany({
      where: { type: ClientCatalogType.DOCUMENT_TYPE },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, isActive: true }
    }),
    prisma.clientAcquisitionSource.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, code: true, category: true, isActive: true }
    }),
    prisma.clientAcquisitionDetailOption.findMany({
      orderBy: [{ source: { name: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        sourceId: true,
        code: true,
        name: true,
        isActive: true
      }
    }),
    prisma.clientCatalogItem.findMany({
      where: { type: ClientCatalogType.SOCIAL_NETWORK },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, isActive: true }
    }),
    prisma.clientCatalogItem.findMany({
      where: { type: ClientCatalogType.RELATIONSHIP_TYPE },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, isActive: true }
    }),
    prisma.clientCatalogItem.findMany({
      where: { type: ClientCatalogType.LOCATION_TYPE },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, isActive: true }
    }),
    safeGetClientRulesConfig("clients.config"),
    prisma.clientRequiredDocumentRule.findMany({
      orderBy: [{ clientType: "asc" }, { documentType: { name: "asc" } }],
      select: {
        id: true,
        clientType: true,
        documentTypeId: true,
        isRequired: true,
        requiresApproval: true,
        requiresExpiry: true,
        weight: true,
        isActive: true,
        documentType: { select: { name: true } }
      }
    }),
    prisma.clientCatalogItem.findMany({
      where: { type: ClientCatalogType.DOCUMENT_TYPE },
      orderBy: { name: "asc" },
      select: { id: true, name: true, isActive: true }
    })
  ]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2e75ba]">Clientes</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
          Configuración · Data Console
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Consola de gobierno de datos para formularios, reglas y validaciones de Clientes. Escalable en tablas, sin cards dispersas.
        </p>
      </section>

      <section className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {SECTION_TABS.map((tab) => (
            <Link
              key={tab.key}
              href={`/admin/clientes/configuracion?section=${tab.key}`}
              className={cn(
                "inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition",
                section === tab.key
                  ? "border-[#2e75ba] bg-[#2e75ba] text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">{SECTION_TABS.find((tab) => tab.key === section)?.description}</p>
      </section>

      {section === "catalogos" && (
        <div className="grid gap-4 xl:grid-cols-2">
          <ClientCatalogManager title="Categorías de persona" type={ClientCatalogType.PERSON_CATEGORY} items={personCategories} />
          <ClientCatalogManager title="Profesiones" type={ClientCatalogType.PERSON_PROFESSION} items={professions} />
          <ClientCatalogManager title="Estados civiles" type={ClientCatalogType.MARITAL_STATUS} items={maritalStatuses} />
          <ClientCatalogManager title="Niveles académicos" type={ClientCatalogType.ACADEMIC_LEVEL} items={academicLevels} />
          <ClientCatalogManager title="Categorías de empresa" type={ClientCatalogType.COMPANY_CATEGORY} items={companyCategories} />
          <ClientCatalogManager title="Categorías de institución" type={ClientCatalogType.INSTITUTION_CATEGORY} items={institutionCategories} />
          <ClientCatalogManager title="Tipos de institución" type={ClientCatalogType.INSTITUTION_TYPE} items={institutionTypes} />
          <ClientCatalogManager title="Estados de cliente" type={ClientCatalogType.CLIENT_STATUS} items={clientStatuses} />
          <ClientCatalogManager title="Tipos de documento" type={ClientCatalogType.DOCUMENT_TYPE} items={documentTypes} />
          <ClientCatalogManager title="Tipos de ubicación" type={ClientCatalogType.LOCATION_TYPE} items={locationTypes} />
        </div>
      )}

      {section === "canales" && (
        <div className="space-y-4">
          <ClientAcquisitionSourceManager sources={acquisitionSources} details={acquisitionDetails} />
          <section className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-diagnostics-corporate">Canales y comercial</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
              Relación comercial (legacy)
            </h3>
            <p className="text-sm text-slate-600">Se mantiene por compatibilidad histórica. No reemplaza el canal de adquisición.</p>
            <div className="mt-4">
              <ClientCatalogManager title="Tipo de relación comercial" type={ClientCatalogType.RELATION_TYPE} items={relationTypes} />
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <ClientCatalogManager title="Tipos de parentesco" type={ClientCatalogType.RELATIONSHIP_TYPE} items={relationshipTypes} />
              <ClientCatalogManager title="Redes sociales" type={ClientCatalogType.SOCIAL_NETWORK} items={socialNetworks} />
            </div>
          </section>
        </div>
      )}

      {section === "reglas" && (
        <div className="space-y-4">
          <ClientRulesEditor
            initialAlertDays30={rulesConfig.alertDays30}
            initialAlertDays15={rulesConfig.alertDays15}
            initialAlertDays7={rulesConfig.alertDays7}
            initialHealthProfileWeight={rulesConfig.healthProfileWeight}
            initialHealthDocsWeight={rulesConfig.healthDocsWeight}
          />

          <ClientRequiredDocumentsRulesEditor
            rules={requiredRules.map((rule) => ({
              id: rule.id,
              clientType: rule.clientType,
              documentTypeId: rule.documentTypeId,
              documentTypeName: rule.documentType.name,
              isRequired: rule.isRequired,
              requiresApproval: rule.requiresApproval,
              requiresExpiry: rule.requiresExpiry,
              weight: rule.weight,
              isActive: rule.isActive
            }))}
            documentTypeOptions={requiredDocumentTypes}
          />
        </div>
      )}

      {section === "validaciones" && (
        <div className="space-y-4">
          <GeoCatalogManager />
          <section className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-diagnostics-corporate">Validaciones por país</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
              Tipos de documento activos
            </h3>
            <p className="text-sm text-slate-600">Los tipos de documento alimentan validaciones dinámicas en formularios y panel de documentos.</p>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-[#f8fafc] text-[#2e75ba]">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Documento</th>
                    <th className="px-3 py-2 text-left font-semibold">Descripción</th>
                    <th className="px-3 py-2 text-left font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {documentTypes.map((item, index) => (
                    <tr key={item.id} className={index % 2 ? "bg-slate-50/60" : "bg-white"}>
                      <td className="px-3 py-2 font-semibold text-slate-900">{item.name}</td>
                      <td className="px-3 py-2 text-slate-600">{item.description || "—"}</td>
                      <td className="px-3 py-2">{item.isActive ? "Activo" : "Inactivo"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {section === "futuro" && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Futuro</p>
          <h3 className="mt-1 text-lg font-semibold text-amber-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
            Condiciones de pago
          </h3>
          <p className="mt-2 text-sm text-amber-900/90">
            Disponible cuando se active Facturación/Contabilidad. Esta sección queda deshabilitada para evitar deuda conceptual en Clientes.
          </p>
        </section>
      )}
    </div>
  );
}
