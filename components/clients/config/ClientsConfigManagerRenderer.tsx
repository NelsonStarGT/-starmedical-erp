"use client";

import { ClientCatalogType, type ClientProfileType } from "@prisma/client";
import ClientCatalogManager from "@/components/clients/config/ClientCatalogManager";
import ClientContactDirectoriesManager from "@/components/clients/config/ClientContactDirectoriesManager";
import ClientAcquisitionSourceManager from "@/components/clients/config/ClientAcquisitionSourceManager";
import ClientRulesEditor from "@/components/clients/config/ClientRulesEditor";
import ClientRequiredDocumentsRulesEditor from "@/components/clients/config/ClientRequiredDocumentsRulesEditor";
import ClientOperatingCountryEditor from "@/components/clients/config/ClientOperatingCountryEditor";
import ClientDateFormatEditor from "@/components/clients/config/ClientDateFormatEditor";
import GeoCatalogManager from "@/components/clients/config/GeoCatalogManager";
import type { ClientsDateFormat } from "@/lib/clients/dateFormat";
import type { OperatingCountryDefaultsSnapshot } from "@/lib/clients/operatingCountryDefaults";
import type { CountryPickerOption } from "@/components/clients/CountryPicker";

export type ConfigCatalogItem = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type ConfigAcquisitionSource = {
  id: string;
  name: string;
  code: string | null;
  category: string | null;
  isActive: boolean;
};

export type ConfigAcquisitionDetail = {
  id: string;
  sourceId: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type ConfigDirectoryRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type ConfigCorrelationRow = {
  departmentId: string;
  jobTitleIds: string[];
};

export type ConfigRequiredDocumentRule = {
  id: string;
  clientType: ClientProfileType;
  documentTypeId: string;
  documentTypeName: string;
  isRequired: boolean;
  requiresApproval: boolean;
  requiresExpiry: boolean;
  weight: number;
  isActive: boolean;
};

export type ConfigRequiredDocumentTypeOption = {
  id: string;
  name: string;
  isActive: boolean;
};

export type ClientsConfigManagerPayload = {
  catalogsByType: Partial<Record<ClientCatalogType, ConfigCatalogItem[]>>;
  acquisitionSources: ConfigAcquisitionSource[];
  acquisitionDetails: ConfigAcquisitionDetail[];
  departments: ConfigDirectoryRow[];
  departmentsSource: "db" | "fallback";
  jobTitles: ConfigDirectoryRow[];
  jobTitlesSource: "db" | "fallback";
  pbxCategories: ConfigDirectoryRow[];
  pbxCategoriesSource: "db" | "fallback";
  correlations: ConfigCorrelationRow[];
  rulesConfig: {
    alertDays30: number;
    alertDays15: number;
    alertDays7: number;
    healthProfileWeight: number;
    healthDocsWeight: number;
  };
  requiredRules: ConfigRequiredDocumentRule[];
  requiredDocumentTypeOptions: ConfigRequiredDocumentTypeOption[];
  validationDocumentTypes: ConfigRequiredDocumentTypeOption[];
  clientsDateFormat: ClientsDateFormat;
  operatingCountryConfig: OperatingCountryDefaultsSnapshot;
  operatingCountryOptions: CountryPickerOption[];
};

const CATALOG_TITLE_BY_TYPE: Record<ClientCatalogType, string> = {
  PERSON_CATEGORY: "Categorías de persona",
  PERSON_PROFESSION: "Profesiones",
  MARITAL_STATUS: "Estados civiles",
  ACADEMIC_LEVEL: "Niveles académicos",
  COMPANY_CATEGORY: "Categorías de empresa",
  SECTOR: "Actividades económicas",
  INSTITUTION_CATEGORY: "Categorías de institución",
  INSTITUTION_TYPE: "Tipos de institución",
  CLIENT_STATUS: "Estados de cliente",
  DOCUMENT_TYPE: "Tipos de documento",
  LOCATION_TYPE: "Tipos de ubicación",
  RELATION_TYPE: "Tipo de relación comercial",
  RELATIONSHIP_TYPE: "Tipos de parentesco",
  SOCIAL_NETWORK: "Redes sociales",
  PAYMENT_TERM: "Condiciones de pago"
};

function parseCatalogType(managerComponentId: string): ClientCatalogType | null {
  if (!managerComponentId.startsWith("catalog:")) return null;
  const token = managerComponentId.split(":")[1] ?? "";
  if (!token) return null;
  const maybe = token.trim().toUpperCase() as ClientCatalogType;
  if (!Object.prototype.hasOwnProperty.call(CATALOG_TITLE_BY_TYPE, maybe)) return null;
  return maybe;
}

export default function ClientsConfigManagerRenderer({
  managerComponentId,
  payload
}: {
  managerComponentId: string;
  payload: ClientsConfigManagerPayload;
}) {
  const catalogType = parseCatalogType(managerComponentId);
  if (catalogType) {
    if (catalogType === ClientCatalogType.PAYMENT_TERM) {
      return (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Condiciones de pago está deshabilitado hasta activar Facturación/Contabilidad.
        </section>
      );
    }
    return (
      <ClientCatalogManager
        title={CATALOG_TITLE_BY_TYPE[catalogType]}
        type={catalogType}
        items={payload.catalogsByType[catalogType] ?? []}
      />
    );
  }

  if (managerComponentId === "directories:departments") {
    return (
      <ClientContactDirectoriesManager
        departments={payload.departments}
        departmentsSource={payload.departmentsSource}
        jobTitles={payload.jobTitles}
        jobTitlesSource={payload.jobTitlesSource}
        pbxCategories={payload.pbxCategories}
        pbxCategoriesSource={payload.pbxCategoriesSource}
        correlations={payload.correlations}
        focusMode="department"
      />
    );
  }

  if (managerComponentId === "directories:job_titles") {
    return (
      <ClientContactDirectoriesManager
        departments={payload.departments}
        departmentsSource={payload.departmentsSource}
        jobTitles={payload.jobTitles}
        jobTitlesSource={payload.jobTitlesSource}
        pbxCategories={payload.pbxCategories}
        pbxCategoriesSource={payload.pbxCategoriesSource}
        correlations={payload.correlations}
        focusMode="jobTitle"
      />
    );
  }

  if (managerComponentId === "directories:pbx_categories") {
    return (
      <ClientContactDirectoriesManager
        departments={payload.departments}
        departmentsSource={payload.departmentsSource}
        jobTitles={payload.jobTitles}
        jobTitlesSource={payload.jobTitlesSource}
        pbxCategories={payload.pbxCategories}
        pbxCategoriesSource={payload.pbxCategoriesSource}
        correlations={payload.correlations}
        focusMode="pbxCategory"
      />
    );
  }

  if (managerComponentId === "directories:correlation") {
    return (
      <ClientContactDirectoriesManager
        departments={payload.departments}
        departmentsSource={payload.departmentsSource}
        jobTitles={payload.jobTitles}
        jobTitlesSource={payload.jobTitlesSource}
        pbxCategories={payload.pbxCategories}
        pbxCategoriesSource={payload.pbxCategoriesSource}
        correlations={payload.correlations}
        focusMode="correlation"
      />
    );
  }

  if (managerComponentId === "channels:acquisition_sources") {
    return <ClientAcquisitionSourceManager sources={payload.acquisitionSources} details={payload.acquisitionDetails} />;
  }

  if (managerComponentId === "rules:core") {
    return (
      <ClientRulesEditor
        initialAlertDays30={payload.rulesConfig.alertDays30}
        initialAlertDays15={payload.rulesConfig.alertDays15}
        initialAlertDays7={payload.rulesConfig.alertDays7}
        initialHealthProfileWeight={payload.rulesConfig.healthProfileWeight}
        initialHealthDocsWeight={payload.rulesConfig.healthDocsWeight}
      />
    );
  }

  if (managerComponentId === "rules:required_documents") {
    return (
      <ClientRequiredDocumentsRulesEditor
        rules={payload.requiredRules}
        documentTypeOptions={payload.requiredDocumentTypeOptions}
      />
    );
  }

  if (managerComponentId === "rules:operating_country") {
    return (
      <ClientOperatingCountryEditor
        initialConfig={payload.operatingCountryConfig}
        countryOptions={payload.operatingCountryOptions}
      />
    );
  }

  if (managerComponentId === "rules:date_format") {
    return <ClientDateFormatEditor initialDateFormat={payload.clientsDateFormat} />;
  }

  if (managerComponentId === "validations:geo") {
    return <GeoCatalogManager countryFirstMode />;
  }

  if (managerComponentId === "validations:documents") {
    return (
      <section className="space-y-3 rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Validaciones</p>
        <h4 className="text-sm font-semibold text-slate-900">Documentos activos por país</h4>
        <p className="text-xs text-slate-600">
          Este listado alimenta validaciones dinámicas y panel documental en Clientes.
        </p>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f8fafc] text-[#2e75ba]">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Documento</th>
                <th className="px-3 py-2 text-left font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {payload.validationDocumentTypes.map((item, index) => (
                <tr key={item.id} className={index % 2 ? "bg-slate-50/60" : "bg-white"}>
                  <td className="px-3 py-2 font-semibold text-slate-900">{item.name}</td>
                  <td className="px-3 py-2 text-slate-600">{item.isActive ? "Activo" : "Inactivo"}</td>
                </tr>
              ))}
              {!payload.validationDocumentTypes.length ? (
                <tr>
                  <td colSpan={2} className="px-3 py-4 text-center text-xs text-slate-500">
                    Sin documentos configurados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  if (managerComponentId === "future:payment_terms") {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Módulo pendiente: se habilita al activar Facturación/Contabilidad.
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
      No hay manager configurado para <span className="font-mono text-xs">{managerComponentId}</span>.
    </section>
  );
}
