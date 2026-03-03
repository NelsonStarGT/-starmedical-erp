import { ClientProfileType } from "@prisma/client";

export type ClientBulkParserKind =
  | "string"
  | "email"
  | "phone"
  | "date"
  | "boolean"
  | "list";

export type ClientBulkColumn = {
  key: string;
  headerDisplay: string;
  required: boolean;
  example: string;
  target: string;
  parser: ClientBulkParserKind;
  aliases?: string[];
};

export type ClientBulkSchema = {
  type: ClientProfileType;
  filenameCsv: string;
  filenameXlsx: string;
  columns: ClientBulkColumn[];
};

type MappingRecord = Record<string, string>;

function col(input: ClientBulkColumn): ClientBulkColumn {
  return {
    ...input,
    aliases: Array.isArray(input.aliases) ? input.aliases : []
  };
}

const PERSON_COLUMNS: ClientBulkColumn[] = [
  col({ key: "first_name", headerDisplay: "PrimerNombre", required: true, example: "Ana", target: "clientProfile.firstName", parser: "string", aliases: ["first_name", "primer_nombre", "firstName"] }),
  col({ key: "middle_name", headerDisplay: "SegundoNombre", required: false, example: "Lucia", target: "clientProfile.middleName", parser: "string", aliases: ["middle_name", "segundo_nombre", "middleName"] }),
  col({ key: "third_name", headerDisplay: "TercerNombre", required: false, example: "", target: "clientProfile.thirdName", parser: "string", aliases: ["third_name", "tercer_nombre", "thirdName"] }),
  col({ key: "last_name", headerDisplay: "PrimerApellido", required: true, example: "Torres", target: "clientProfile.lastName", parser: "string", aliases: ["last_name", "primer_apellido", "lastName"] }),
  col({ key: "second_last_name", headerDisplay: "SegundoApellido", required: false, example: "Lopez", target: "clientProfile.secondLastName", parser: "string", aliases: ["second_last_name", "segundo_apellido", "secondLastName"] }),
  col({ key: "third_last_name", headerDisplay: "TercerApellido", required: false, example: "", target: "clientProfile.thirdLastName", parser: "string", aliases: ["third_last_name", "tercer_apellido", "thirdLastName"] }),
  col({ key: "sex", headerDisplay: "Sexo", required: false, example: "FEMALE", target: "clientProfile.sex", parser: "string", aliases: ["sex", "sexo"] }),
  col({ key: "document_country_iso2", headerDisplay: "PaisDocumentoISO2", required: false, example: "GT", target: "clientIdentifier.country.iso2", parser: "string", aliases: ["document_country_iso2", "doc_country", "pais_documento"] }),
  col({ key: "document_type", headerDisplay: "TipoDocumento", required: false, example: "DPI", target: "clientIdentifier.documentType", parser: "string", aliases: ["document_type", "doc_type", "tipo_documento"] }),
  col({ key: "document_number", headerDisplay: "NumeroDocumento", required: true, example: "1234567890101", target: "clientProfile.dpi", parser: "string", aliases: ["document_number", "dpi", "numero_documento", "identity_document_value"] }),
  col({ key: "phone_primary", headerDisplay: "TelefonoPrincipal", required: true, example: "+50255550000", target: "clientProfile.phone/clientPhone", parser: "phone", aliases: ["phone_primary", "phone", "telefono", "celular"] }),
  col({ key: "email_primary", headerDisplay: "EmailPrincipal", required: false, example: "ana@example.com", target: "clientProfile.email/clientEmail", parser: "email", aliases: ["email_primary", "email", "correo"] }),
  col({ key: "birth_date", headerDisplay: "FechaNacimiento", required: false, example: "1998-06-01", target: "clientProfile.birthDate", parser: "date", aliases: ["birth_date", "fecha_nacimiento"] }),
  col({ key: "blood_type", headerDisplay: "TipoSangre", required: false, example: "O_POS", target: "clientProfile.bloodType", parser: "string", aliases: ["blood_type", "tipo_sangre"] }),
  col({ key: "residence_country", headerDisplay: "PaisResidencia", required: false, example: "Guatemala", target: "clientLocation.main.country", parser: "string", aliases: ["residence_country", "country", "pais_residencia"] }),
  col({ key: "residence_state", headerDisplay: "DepartamentoResidencia", required: false, example: "Guatemala", target: "clientLocation.main.department", parser: "string", aliases: ["residence_state", "department", "departamento", "residence_department"] }),
  col({ key: "residence_city", headerDisplay: "CiudadResidencia", required: false, example: "Guatemala", target: "clientLocation.main.city", parser: "string", aliases: ["residence_city", "city", "ciudad", "residence_municipality"] }),
  col({ key: "residence_address", headerDisplay: "DireccionResidencia", required: false, example: "Zona 10", target: "clientLocation.main.addressLine1", parser: "string", aliases: ["residence_address", "address", "direccion", "address_home"] }),
  col({ key: "service_segments", headerDisplay: "SegmentosServicio", required: false, example: "PARTICULAR", target: "clientProfile.serviceSegments", parser: "list", aliases: ["service_segments", "segmentos_servicio"] }),
  col({ key: "acquisition_source", headerDisplay: "CanalAdquisicion", required: false, example: "Referido", target: "clientProfile.acquisitionSource", parser: "string", aliases: ["acquisition_source", "source", "canal_adquisicion"] }),
  col({ key: "acquisition_detail", headerDisplay: "DetalleAdquisicion", required: false, example: "Medico tratante", target: "clientProfile.acquisitionDetailOption", parser: "string", aliases: ["acquisition_detail", "source_detail", "detalle_adquisicion"] }),
  col({
    key: "company_nit",
    headerDisplay: "EmpresaNIT",
    required: false,
    example: "1234567-8",
    target: "personCompanyLink.company.nit",
    parser: "string",
    aliases: ["company_nit", "empresa_nit", "nit_empresa"]
  }),
  col({
    key: "company_code",
    headerDisplay: "EmpresaCodigo",
    required: false,
    example: "E001",
    target: "personCompanyLink.company.clientCode",
    parser: "string",
    aliases: ["company_code", "empresa_codigo", "codigo_empresa", "company_client_code"]
  }),
  col({
    key: "company_name",
    headerDisplay: "EmpresaNombre",
    required: false,
    example: "Empresa Demo",
    target: "personCompanyLink.company.name",
    parser: "string",
    aliases: ["company_name", "empresa_nombre", "nombre_empresa"]
  }),
  col({
    key: "company_role",
    headerDisplay: "RolEmpresa",
    required: false,
    example: "Colaborador",
    target: "personCompanyLink.relationType",
    parser: "string",
    aliases: ["company_role", "rol_empresa", "empresa_rol"]
  }),
  col({
    key: "company_primary",
    headerDisplay: "EmpresaPrincipal",
    required: false,
    example: "true",
    target: "personCompanyLink.isPrimary",
    parser: "boolean",
    aliases: ["company_primary", "empresa_principal", "principal_empresa"]
  }),
  col({
    key: "company_active",
    headerDisplay: "VinculoActivo",
    required: false,
    example: "true",
    target: "personCompanyLink.isActive",
    parser: "boolean",
    aliases: ["company_active", "vinculo_activo", "empresa_activa"]
  }),
  col({
    key: "company_keys",
    headerDisplay: "EmpresasVinculadas (DEPRECATED)",
    required: false,
    example: "NIT:1234567-8;CODE:E001",
    target: "personCompanyLink.companyClientId[]",
    parser: "list",
    aliases: ["company_keys", "empresas_vinculadas", "empresa_keys", "companies", "EmpresasVinculadas"]
  }),
  col({
    key: "company_roles",
    headerDisplay: "RolesEmpresa (DEPRECATED)",
    required: false,
    example: "Colaborador;Supervisor",
    target: "personCompanyLink.relationType[]",
    parser: "list",
    aliases: ["company_roles", "roles_empresa", "empresa_roles", "RolesEmpresa"]
  }),
  col({ key: "notes", headerDisplay: "Notas", required: false, example: "Cliente con expediente previo.", target: "clientNote/admin", parser: "string", aliases: ["notes", "nota", "observaciones"] })
];

const COMPANY_COLUMNS: ClientBulkColumn[] = [
  col({ key: "legal_name", headerDisplay: "RazonSocial", required: true, example: "Empresa Demo, S.A.", target: "clientProfile.companyName", parser: "string", aliases: ["legal_name", "company_name", "razon_social"] }),
  col({ key: "trade_name", headerDisplay: "NombreComercial", required: true, example: "Empresa Demo", target: "clientProfile.tradeName", parser: "string", aliases: ["trade_name", "nombre_comercial"] }),
  col({ key: "nit", headerDisplay: "NIT", required: true, example: "1234567-8", target: "clientProfile.nit", parser: "string", aliases: ["nit", "tax_id"] }),
  col({ key: "legal_form", headerDisplay: "FormaJuridica", required: false, example: "sociedad_anonima", target: "company.metadata.legalForm", parser: "string", aliases: ["legal_form", "forma_juridica"] }),
  col({ key: "legal_form_other", headerDisplay: "FormaJuridicaOtro", required: false, example: "", target: "company.metadata.legalFormOther", parser: "string", aliases: ["legal_form_other", "forma_juridica_otro"] }),
  col({ key: "company_size_range", headerDisplay: "TamanoEmpresa", required: false, example: "51_200", target: "company.metadata.companySizeRange", parser: "string", aliases: ["company_size_range", "tamano_empresa"] }),
  col({ key: "economic_activity_primary", headerDisplay: "ActividadEconomicaPrincipal", required: false, example: "servicios_medicos", target: "clientProfile.sector/company.metadata", parser: "string", aliases: ["economic_activity_primary", "actividad_economica_principal"] }),
  col({ key: "economic_activity_secondary", headerDisplay: "ActividadesEconomicasSecundarias", required: false, example: "laboratorio, imagenes", target: "company.metadata.economicActivitySecondary", parser: "list", aliases: ["economic_activity_secondary", "actividades_economicas_secundarias"] }),
  col({ key: "website", headerDisplay: "SitioWeb", required: false, example: "https://empresa.demo", target: "company.website", parser: "string", aliases: ["website", "sitio_web"] }),
  col({ key: "address", headerDisplay: "DireccionPrincipal", required: true, example: "Zona 4, Ciudad de Guatemala", target: "clientProfile.address/clientLocation.main", parser: "string", aliases: ["address", "direccion", "direccion_fiscal"] }),
  col({ key: "country", headerDisplay: "Pais", required: true, example: "Guatemala", target: "clientProfile.country/clientLocation.main", parser: "string", aliases: ["country", "pais"] }),
  col({ key: "department", headerDisplay: "Departamento", required: true, example: "Guatemala", target: "clientProfile.department/clientLocation.main", parser: "string", aliases: ["department", "departamento"] }),
  col({ key: "city", headerDisplay: "Ciudad", required: true, example: "Guatemala", target: "clientProfile.city/clientLocation.main", parser: "string", aliases: ["city", "ciudad", "municipio"] }),
  col({ key: "postal_code", headerDisplay: "CodigoPostal", required: false, example: "01004", target: "clientLocation.main.postalCode", parser: "string", aliases: ["postal_code", "codigo_postal"] }),
  col({ key: "phone_primary", headerDisplay: "TelefonoPrincipal", required: false, example: "+50255550001", target: "clientProfile.phone/clientPhone", parser: "phone", aliases: ["phone_primary", "phone", "telefono"] }),
  col({ key: "email_primary", headerDisplay: "EmailPrincipal", required: false, example: "contacto@empresa.demo", target: "clientProfile.email/clientEmail", parser: "email", aliases: ["email_primary", "email", "correo"] }),
  col({ key: "billing_email", headerDisplay: "EmailFacturacion", required: false, example: "facturacion@empresa.demo", target: "company.billingEmail", parser: "email", aliases: ["billing_email", "correo_facturacion"] }),
  col({ key: "preferred_currency", headerDisplay: "MonedaPreferida", required: false, example: "GTQ", target: "company.metadata.preferredCurrencyCode", parser: "string", aliases: ["preferred_currency", "moneda_preferida"] }),
  col({ key: "accepted_currencies", headerDisplay: "MonedasAceptadas", required: false, example: "GTQ, USD", target: "company.metadata.acceptedCurrencyCodes", parser: "list", aliases: ["accepted_currencies", "monedas_aceptadas"] }),
  col({ key: "acquisition_source", headerDisplay: "CanalAdquisicion", required: false, example: "Web", target: "clientProfile.acquisitionSource", parser: "string", aliases: ["acquisition_source", "source", "canal_adquisicion"] }),
  col({ key: "acquisition_detail", headerDisplay: "DetalleAdquisicion", required: false, example: "Landing corporativa", target: "clientProfile.acquisitionDetailOption", parser: "string", aliases: ["acquisition_detail", "source_detail", "detalle_adquisicion"] }),
  col({ key: "notes", headerDisplay: "NotaComercial", required: false, example: "Cliente corporativo de alto volumen.", target: "company.notes/clientNote", parser: "string", aliases: ["notes", "nota", "observaciones"] })
];

const INSTITUTION_COLUMNS: ClientBulkColumn[] = [
  col({ key: "legal_name", headerDisplay: "NombreLegal", required: true, example: "Hospital Central Nacional", target: "clientProfile.companyName", parser: "string", aliases: ["legal_name", "company_name", "nombre_legal"] }),
  col({ key: "public_name", headerDisplay: "NombrePublico", required: false, example: "Hospital Central", target: "clientProfile.tradeName", parser: "string", aliases: ["public_name", "trade_name", "nombre_publico"] }),
  col({ key: "institution_type", headerDisplay: "TipoInstitucion", required: true, example: "Hospital", target: "clientProfile.institutionType", parser: "string", aliases: ["institution_type", "tipo_institucion"] }),
  col({ key: "institution_category", headerDisplay: "RegimenInstitucional", required: false, example: "publico", target: "clientProfile.institutionCategory", parser: "string", aliases: ["institution_category", "regimen_institucional"] }),
  col({ key: "institution_sector", headerDisplay: "SectorInstitucional", required: false, example: "publico", target: "company.metadata.institutionSector", parser: "string", aliases: ["institution_sector", "sector_institucional"] }),
  col({ key: "institution_is_public", headerDisplay: "EsPublica", required: false, example: "true", target: "clientProfile.institutionIsPublic", parser: "boolean", aliases: ["institution_is_public", "es_publica"] }),
  col({ key: "nit", headerDisplay: "NIT", required: false, example: "1234567-9", target: "clientProfile.nit", parser: "string", aliases: ["nit", "tax_id"] }),
  col({ key: "website", headerDisplay: "SitioWeb", required: false, example: "https://institucion.demo", target: "company.website", parser: "string", aliases: ["website", "sitio_web"] }),
  col({ key: "address", headerDisplay: "DireccionPrincipal", required: true, example: "Zona 1", target: "clientProfile.address/clientLocation.main", parser: "string", aliases: ["address", "direccion"] }),
  col({ key: "country", headerDisplay: "Pais", required: true, example: "Guatemala", target: "clientProfile.country/clientLocation.main", parser: "string", aliases: ["country", "pais"] }),
  col({ key: "department", headerDisplay: "Departamento", required: true, example: "Guatemala", target: "clientProfile.department/clientLocation.main", parser: "string", aliases: ["department", "departamento"] }),
  col({ key: "city", headerDisplay: "Ciudad", required: true, example: "Guatemala", target: "clientProfile.city/clientLocation.main", parser: "string", aliases: ["city", "ciudad", "municipio"] }),
  col({ key: "postal_code", headerDisplay: "CodigoPostal", required: false, example: "01001", target: "clientLocation.main.postalCode", parser: "string", aliases: ["postal_code", "codigo_postal"] }),
  col({ key: "phone_primary", headerDisplay: "TelefonoPrincipal", required: false, example: "+50255550002", target: "clientProfile.phone/clientPhone", parser: "phone", aliases: ["phone_primary", "phone", "telefono"] }),
  col({ key: "email_primary", headerDisplay: "EmailPrincipal", required: false, example: "info@institucion.demo", target: "clientProfile.email/clientEmail", parser: "email", aliases: ["email_primary", "email", "correo"] }),
  col({ key: "billing_email", headerDisplay: "EmailFacturacion", required: false, example: "facturacion@institucion.demo", target: "company.billingEmail", parser: "email", aliases: ["billing_email", "correo_facturacion"] }),
  col({ key: "preferred_currency", headerDisplay: "MonedaPreferida", required: false, example: "GTQ", target: "company.metadata.preferredCurrencyCode", parser: "string", aliases: ["preferred_currency", "moneda_preferida"] }),
  col({ key: "accepted_currencies", headerDisplay: "MonedasAceptadas", required: false, example: "GTQ, USD", target: "company.metadata.acceptedCurrencyCodes", parser: "list", aliases: ["accepted_currencies", "monedas_aceptadas"] }),
  col({ key: "acquisition_source", headerDisplay: "CanalAdquisicion", required: false, example: "Referido", target: "clientProfile.acquisitionSource", parser: "string", aliases: ["acquisition_source", "source", "canal_adquisicion"] }),
  col({ key: "acquisition_detail", headerDisplay: "DetalleAdquisicion", required: false, example: "Contacto institucional", target: "clientProfile.acquisitionDetailOption", parser: "string", aliases: ["acquisition_detail", "source_detail", "detalle_adquisicion"] }),
  col({ key: "notes", headerDisplay: "NotaComercial", required: false, example: "Institucion pagadora con convenio activo.", target: "company.notes/clientNote", parser: "string", aliases: ["notes", "nota", "observaciones"] })
];

const INSURER_COLUMNS: ClientBulkColumn[] = [
  col({ key: "legal_name", headerDisplay: "NombreLegal", required: true, example: "Aseguradora Demo, S.A.", target: "clientProfile.companyName", parser: "string", aliases: ["legal_name", "company_name", "nombre_legal"] }),
  col({ key: "trade_name", headerDisplay: "NombreComercial", required: false, example: "Aseguradora Demo", target: "clientProfile.tradeName", parser: "string", aliases: ["trade_name", "nombre_comercial"] }),
  col({ key: "nit", headerDisplay: "NIT", required: true, example: "1234567-0", target: "clientProfile.nit", parser: "string", aliases: ["nit", "tax_id"] }),
  col({ key: "insurer_type", headerDisplay: "TipoAseguradora", required: true, example: "privada", target: "company.metadata.insurerType", parser: "string", aliases: ["insurer_type", "tipo_aseguradora"] }),
  col({ key: "insurer_scope", headerDisplay: "AlcanceAseguradora", required: false, example: "regional", target: "company.metadata.insurerScope", parser: "string", aliases: ["insurer_scope", "alcance_aseguradora"] }),
  col({ key: "insurer_code", headerDisplay: "CodigoAseguradora", required: false, example: "ASEG-DEMO", target: "company.metadata.insurerCode", parser: "string", aliases: ["insurer_code", "codigo_aseguradora"] }),
  col({ key: "insurer_line_primary", headerDisplay: "RamoPrincipal", required: false, example: "salud", target: "company.metadata.insurerLinePrimary", parser: "string", aliases: ["insurer_line_primary", "ramo_principal"] }),
  col({ key: "insurer_line_secondary", headerDisplay: "RamosSecundarios", required: false, example: "vida, accidentes", target: "company.metadata.insurerLineSecondary", parser: "list", aliases: ["insurer_line_secondary", "ramos_secundarios"] }),
  col({ key: "authorization_portal_url", headerDisplay: "PortalAutorizaciones", required: false, example: "https://portal.aseguradora.demo", target: "company.metadata.authorizationPortalUrl", parser: "string", aliases: ["authorization_portal_url", "portal_autorizaciones"] }),
  col({ key: "authorization_email", headerDisplay: "EmailAutorizaciones", required: false, example: "autorizaciones@aseguradora.demo", target: "company.metadata.authorizationEmail", parser: "email", aliases: ["authorization_email", "email_autorizaciones"] }),
  col({ key: "claims_email", headerDisplay: "EmailSiniestros", required: false, example: "siniestros@aseguradora.demo", target: "company.metadata.claimsEmail", parser: "email", aliases: ["claims_email", "email_siniestros"] }),
  col({ key: "provider_support_phone", headerDisplay: "TelefonoSoportePrestadores", required: false, example: "+50255550003", target: "company.metadata.providerSupportPhone", parser: "phone", aliases: ["provider_support_phone", "telefono_soporte_prestadores"] }),
  col({ key: "provider_support_whatsapp", headerDisplay: "WhatsAppSoportePrestadores", required: false, example: "+50255550004", target: "company.metadata.providerSupportWhatsApp", parser: "phone", aliases: ["provider_support_whatsapp", "whatsapp_soporte_prestadores"] }),
  col({ key: "website", headerDisplay: "SitioWeb", required: false, example: "https://aseguradora.demo", target: "company.website", parser: "string", aliases: ["website", "sitio_web"] }),
  col({ key: "address", headerDisplay: "DireccionPrincipal", required: true, example: "Zona 15", target: "clientProfile.address/clientLocation.main", parser: "string", aliases: ["address", "direccion"] }),
  col({ key: "country", headerDisplay: "Pais", required: true, example: "Guatemala", target: "clientProfile.country/clientLocation.main", parser: "string", aliases: ["country", "pais"] }),
  col({ key: "department", headerDisplay: "Departamento", required: true, example: "Guatemala", target: "clientProfile.department/clientLocation.main", parser: "string", aliases: ["department", "departamento"] }),
  col({ key: "city", headerDisplay: "Ciudad", required: true, example: "Guatemala", target: "clientProfile.city/clientLocation.main", parser: "string", aliases: ["city", "ciudad", "municipio"] }),
  col({ key: "postal_code", headerDisplay: "CodigoPostal", required: false, example: "01015", target: "clientLocation.main.postalCode", parser: "string", aliases: ["postal_code", "codigo_postal"] }),
  col({ key: "phone_primary", headerDisplay: "TelefonoPrincipal", required: false, example: "+50255550005", target: "clientProfile.phone/clientPhone", parser: "phone", aliases: ["phone_primary", "phone", "telefono"] }),
  col({ key: "email_primary", headerDisplay: "EmailPrincipal", required: false, example: "info@aseguradora.demo", target: "clientProfile.email/clientEmail", parser: "email", aliases: ["email_primary", "email", "correo"] }),
  col({ key: "billing_email", headerDisplay: "EmailFacturacion", required: false, example: "facturacion@aseguradora.demo", target: "company.billingEmail", parser: "email", aliases: ["billing_email", "correo_facturacion"] }),
  col({ key: "preferred_currency", headerDisplay: "MonedaPreferida", required: false, example: "GTQ", target: "company.metadata.preferredCurrencyCode", parser: "string", aliases: ["preferred_currency", "moneda_preferida"] }),
  col({ key: "accepted_currencies", headerDisplay: "MonedasAceptadas", required: false, example: "GTQ, USD", target: "company.metadata.acceptedCurrencyCodes", parser: "list", aliases: ["accepted_currencies", "monedas_aceptadas"] }),
  col({ key: "acquisition_source", headerDisplay: "CanalAdquisicion", required: false, example: "Directo", target: "clientProfile.acquisitionSource", parser: "string", aliases: ["acquisition_source", "source", "canal_adquisicion"] }),
  col({ key: "acquisition_detail", headerDisplay: "DetalleAdquisicion", required: false, example: "Convenio comercial", target: "clientProfile.acquisitionDetailOption", parser: "string", aliases: ["acquisition_detail", "source_detail", "detalle_adquisicion"] }),
  col({ key: "notes", headerDisplay: "NotaComercial", required: false, example: "Aseguradora con portal activo.", target: "company.notes/clientNote", parser: "string", aliases: ["notes", "nota", "observaciones"] })
];

const CLIENT_BULK_SCHEMA_REGISTRY: Record<ClientProfileType, ClientBulkSchema> = {
  [ClientProfileType.PERSON]: {
    type: ClientProfileType.PERSON,
    filenameCsv: "plantilla-clientes-personas.csv",
    filenameXlsx: "plantilla-clientes-personas.xlsx",
    columns: PERSON_COLUMNS
  },
  [ClientProfileType.COMPANY]: {
    type: ClientProfileType.COMPANY,
    filenameCsv: "plantilla-clientes-empresas.csv",
    filenameXlsx: "plantilla-clientes-empresas.xlsx",
    columns: COMPANY_COLUMNS
  },
  [ClientProfileType.INSTITUTION]: {
    type: ClientProfileType.INSTITUTION,
    filenameCsv: "plantilla-clientes-instituciones.csv",
    filenameXlsx: "plantilla-clientes-instituciones.xlsx",
    columns: INSTITUTION_COLUMNS
  },
  [ClientProfileType.INSURER]: {
    type: ClientProfileType.INSURER,
    filenameCsv: "plantilla-clientes-aseguradoras.csv",
    filenameXlsx: "plantilla-clientes-aseguradoras.xlsx",
    columns: INSURER_COLUMNS
  }
};

export function getClientBulkSchema(type: ClientProfileType): ClientBulkSchema {
  return CLIENT_BULK_SCHEMA_REGISTRY[type];
}

export function getClientBulkColumns(type: ClientProfileType) {
  return getClientBulkSchema(type).columns;
}

export function getClientBulkTemplateHeaders(type: ClientProfileType) {
  return getClientBulkColumns(type).map((columnDef) => `${columnDef.headerDisplay}${columnDef.required ? "*" : ""}`);
}

export function getClientBulkTemplateHeadersDisplay(type: ClientProfileType) {
  return getClientBulkColumns(type).map((columnDef) => columnDef.headerDisplay);
}

export function getClientBulkRequiredHeaders(type: ClientProfileType) {
  return getClientBulkColumns(type)
    .filter((columnDef) => columnDef.required)
    .map((columnDef) => `${columnDef.headerDisplay}*`);
}

export function getClientBulkTemplateExampleRow(type: ClientProfileType) {
  return getClientBulkColumns(type).map((columnDef) => columnDef.example ?? "");
}

export function normalizeClientBulkHeader(value: string) {
  return value
    .replace(/\*/g, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function buildClientBulkSuggestedMapping(type: ClientProfileType, availableColumns: string[]) {
  const normalizedColumns = new Map<string, string>();
  availableColumns.forEach((columnName) => {
    normalizedColumns.set(normalizeClientBulkHeader(columnName), columnName);
  });

  const mapping: Record<string, string | null> = {};
  for (const columnDef of getClientBulkColumns(type)) {
    const candidates = [
      columnDef.headerDisplay,
      `${columnDef.headerDisplay}*`,
      columnDef.key,
      ...(columnDef.aliases ?? [])
    ]
      .map((token) => normalizeClientBulkHeader(token))
      .filter(Boolean);

    const sourceColumn = candidates
      .map((candidate) => normalizedColumns.get(candidate))
      .find((value) => Boolean(value));
    mapping[columnDef.key] = sourceColumn ?? null;
  }

  return mapping;
}

export function resolveClientBulkMapping(
  type: ClientProfileType,
  providedMappingRaw: string | null,
  suggestedMapping: Record<string, string | null>
) {
  let providedMapping: MappingRecord | null = null;
  if (providedMappingRaw) {
    try {
      providedMapping = JSON.parse(providedMappingRaw) as MappingRecord;
    } catch {
      providedMapping = null;
    }
  }

  const output: MappingRecord = Object.create(null);
  for (const columnDef of getClientBulkColumns(type)) {
    const fromProvided = providedMapping?.[columnDef.key];
    const fromSuggested = suggestedMapping[columnDef.key];
    const selected = typeof fromProvided === "string" && fromProvided.trim() ? fromProvided.trim() : fromSuggested ?? "";
    if (selected) output[columnDef.key] = selected;
  }

  return output;
}

export function getClientBulkMissingRequiredColumns(type: ClientProfileType, mapping: Record<string, string>) {
  return getClientBulkColumns(type).filter((columnDef) => columnDef.required && !mapping[columnDef.key]);
}

export function extractClientBulkRowValues(
  type: ClientProfileType,
  rowValues: Record<string, string>,
  mapping: Record<string, string>
) {
  const values: Record<string, string> = Object.create(null);
  for (const columnDef of getClientBulkColumns(type)) {
    const sourceColumn = mapping[columnDef.key];
    values[columnDef.key] = sourceColumn ? String(rowValues[sourceColumn] || "").trim() : "";
  }
  return values;
}

export function splitBulkCsvList(raw: string) {
  return raw
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseBulkCsvBoolean(raw: string) {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;
  if (["1", "true", "si", "sí", "yes", "y"].includes(normalized)) return true;
  if (["0", "false", "no", "n"].includes(normalized)) return false;
  return null;
}

export function parseBulkCsvIsoDate(raw: string) {
  const value = raw.trim();
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function normalizeBulkCsvPhone(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.replace(/[^\d+]/g, "");
}
