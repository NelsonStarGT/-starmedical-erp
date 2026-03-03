import test from "node:test";
import assert from "node:assert/strict";
import { ClientProfileType } from "@prisma/client";
import { buildClientBulkDataRow } from "@/lib/clients/bulk/clientBulkExport";
import { buildClientBulkTemplateWorkbook } from "@/lib/clients/bulk/clientBulkTemplateWorkbook";
import {
  buildClientBulkSuggestedMapping,
  extractClientBulkRowValues,
  getClientBulkMissingRequiredColumns,
  getClientBulkTemplateExampleRow,
  getClientBulkTemplateHeadersDisplay,
  getClientBulkTemplateHeaders,
  resolveClientBulkMapping
} from "@/lib/clients/bulk/clientBulkSchema";

const EXPECTED_HEADERS: Record<ClientProfileType, string[]> = {
  [ClientProfileType.PERSON]: [
    "PrimerNombre*",
    "SegundoNombre",
    "TercerNombre",
    "PrimerApellido*",
    "SegundoApellido",
    "TercerApellido",
    "Sexo",
    "PaisDocumentoISO2",
    "TipoDocumento",
    "NumeroDocumento*",
    "TelefonoPrincipal*",
    "EmailPrincipal",
    "FechaNacimiento",
    "TipoSangre",
    "PaisResidencia",
    "DepartamentoResidencia",
    "CiudadResidencia",
    "DireccionResidencia",
    "SegmentosServicio",
    "CanalAdquisicion",
    "DetalleAdquisicion",
    "EmpresasVinculadas",
    "RolesEmpresa",
    "Notas"
  ],
  [ClientProfileType.COMPANY]: [
    "RazonSocial*",
    "NombreComercial*",
    "NIT*",
    "FormaJuridica",
    "FormaJuridicaOtro",
    "TamanoEmpresa",
    "ActividadEconomicaPrincipal",
    "ActividadesEconomicasSecundarias",
    "SitioWeb",
    "DireccionPrincipal*",
    "Pais*",
    "Departamento*",
    "Ciudad*",
    "CodigoPostal",
    "TelefonoPrincipal",
    "EmailPrincipal",
    "EmailFacturacion",
    "MonedaPreferida",
    "MonedasAceptadas",
    "CanalAdquisicion",
    "DetalleAdquisicion",
    "NotaComercial"
  ],
  [ClientProfileType.INSTITUTION]: [
    "NombreLegal*",
    "NombrePublico",
    "TipoInstitucion*",
    "RegimenInstitucional",
    "SectorInstitucional",
    "EsPublica",
    "NIT",
    "SitioWeb",
    "DireccionPrincipal*",
    "Pais*",
    "Departamento*",
    "Ciudad*",
    "CodigoPostal",
    "TelefonoPrincipal",
    "EmailPrincipal",
    "EmailFacturacion",
    "MonedaPreferida",
    "MonedasAceptadas",
    "CanalAdquisicion",
    "DetalleAdquisicion",
    "NotaComercial"
  ],
  [ClientProfileType.INSURER]: [
    "NombreLegal*",
    "NombreComercial",
    "NIT*",
    "TipoAseguradora*",
    "AlcanceAseguradora",
    "CodigoAseguradora",
    "RamoPrincipal",
    "RamosSecundarios",
    "PortalAutorizaciones",
    "EmailAutorizaciones",
    "EmailSiniestros",
    "TelefonoSoportePrestadores",
    "WhatsAppSoportePrestadores",
    "SitioWeb",
    "DireccionPrincipal*",
    "Pais*",
    "Departamento*",
    "Ciudad*",
    "CodigoPostal",
    "TelefonoPrincipal",
    "EmailPrincipal",
    "EmailFacturacion",
    "MonedaPreferida",
    "MonedasAceptadas",
    "CanalAdquisicion",
    "DetalleAdquisicion",
    "NotaComercial"
  ]
};

function buildMockProfile(type: ClientProfileType) {
  const now = new Date("2026-02-27T10:00:00.000Z");
  return {
    id: `client-${type.toLowerCase()}`,
    tenantId: "tenant-alpha",
    clientCode: `C-${type.slice(0, 3)}`,
    type,
    companyName: type === ClientProfileType.PERSON ? null : "Entidad Demo",
    tradeName: type === ClientProfileType.PERSON ? null : "Demo",
    firstName: type === ClientProfileType.PERSON ? "Ana" : null,
    middleName: type === ClientProfileType.PERSON ? "Lucia" : null,
    thirdName: null,
    lastName: type === ClientProfileType.PERSON ? "Torres" : null,
    secondLastName: type === ClientProfileType.PERSON ? "Lopez" : null,
    thirdLastName: null,
    sex: null,
    birthDate: type === ClientProfileType.PERSON ? new Date("1998-06-01T00:00:00.000Z") : null,
    bloodType: null,
    address: "Zona 10",
    city: "Guatemala",
    department: "Guatemala",
    country: "Guatemala",
    nit: type === ClientProfileType.PERSON ? null : "1234567-8",
    dpi: type === ClientProfileType.PERSON ? "1234567890101" : null,
    email: "info@demo.test",
    phone: "+50255550000",
    serviceSegments: ["PARTICULAR"],
    status: { name: "Activo" },
    institutionType: type === ClientProfileType.INSTITUTION ? { name: "Hospital" } : null,
    acquisitionSource: { name: "Referido", code: "referido" },
    acquisitionDetailOption: { name: "Contacto", code: "contacto" },
    companyRecord:
      type === ClientProfileType.PERSON
        ? null
        : {
            id: `company-${type.toLowerCase()}`,
            kind: type === ClientProfileType.COMPANY ? "COMPANY" : type === ClientProfileType.INSTITUTION ? "INSTITUTION" : "INSURER",
            legalName: "Entidad Demo",
            tradeName: "Demo",
            taxId: "1234567-8",
            billingEmail: "facturacion@demo.test",
            billingPhone: "+50255550001",
            website: "https://demo.test",
            notes: "Nota demo",
            metadata:
              type === ClientProfileType.INSURER
                ? {
                    insurerType: "privada",
                    insurerLinePrimary: "salud",
                    insurerLineSecondary: ["vida"]
                  }
                : {
                    legalForm: "sociedad_anonima",
                    preferredCurrencyCode: "GTQ",
                    acceptedCurrencyCodes: ["GTQ", "USD"]
                  }
          },
    clientLocations: [
      {
        address: "Zona 10",
        addressLine1: "Zona 10",
        postalCode: "01010",
        city: "Guatemala",
        department: "Guatemala",
        country: "Guatemala"
      }
    ],
    clientNotes: [{ body: "Nota importada", updatedAt: now }],
    createdAt: now,
    updatedAt: now
  } as any;
}

for (const type of Object.values(ClientProfileType)) {
  test(`contract ${type}: XLSX headers == CSV display y CSV marca requeridos con *`, () => {
    const xlsxHeaders = getClientBulkTemplateHeadersDisplay(type);
    const csvHeaders = getClientBulkTemplateHeaders(type);
    assert.deepEqual(
      xlsxHeaders,
      csvHeaders.map((header) => header.replace(/\*/g, ""))
    );
    assert.ok(csvHeaders.some((header) => header.endsWith("*")));
  });

  test(`template ${type}: headers correctos y orden fijo`, () => {
    const headers = getClientBulkTemplateHeaders(type);
    assert.deepEqual(headers, EXPECTED_HEADERS[type]);
  });

  test(`export ${type}: usa los mismos headers de plantilla`, () => {
    const headers = getClientBulkTemplateHeaders(type);
    const row = buildClientBulkDataRow(type, buildMockProfile(type));
    assert.equal(row.length, headers.length);
  });

  test(`import ${type}: valida headers requeridos`, () => {
    const headers = getClientBulkTemplateHeaders(type);
    const suggestedFull = buildClientBulkSuggestedMapping(type, headers);
    const mappingFull = resolveClientBulkMapping(type, null, suggestedFull);
    assert.equal(getClientBulkMissingRequiredColumns(type, mappingFull).length, 0);

    const partialHeaders = headers.slice(1);
    const suggestedPartial = buildClientBulkSuggestedMapping(type, partialHeaders);
    const mappingPartial = resolveClientBulkMapping(type, null, suggestedPartial);
    assert.ok(getClientBulkMissingRequiredColumns(type, mappingPartial).length > 0);
  });

  test(`import ${type}: acepta headers con y sin *`, () => {
    const headersWithStar = getClientBulkTemplateHeaders(type);
    const headersNoStar = getClientBulkTemplateHeadersDisplay(type);

    const suggestedWithStar = buildClientBulkSuggestedMapping(type, headersWithStar);
    const mappingWithStar = resolveClientBulkMapping(type, null, suggestedWithStar);
    assert.equal(getClientBulkMissingRequiredColumns(type, mappingWithStar).length, 0);

    const suggestedNoStar = buildClientBulkSuggestedMapping(type, headersNoStar);
    const mappingNoStar = resolveClientBulkMapping(type, null, suggestedNoStar);
    assert.equal(getClientBulkMissingRequiredColumns(type, mappingNoStar).length, 0);
  });

  test(`round-trip mínimo ${type}: plantilla -> fila -> mapping`, () => {
    const headers = getClientBulkTemplateHeaders(type);
    const sample = getClientBulkTemplateExampleRow(type);
    const rowValues = headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = sample[index] ?? "";
      return acc;
    }, {});

    const requiredHeader = headers.find((header) => header.endsWith("*"));
    if (requiredHeader) rowValues[requiredHeader] = "valor_requerido";

    const suggested = buildClientBulkSuggestedMapping(type, headers);
    const mapping = resolveClientBulkMapping(type, null, suggested);
    const extracted = extractClientBulkRowValues(type, rowValues, mapping);

    assert.ok(Object.keys(extracted).length > 0);
  });
}

test("xlsx plantilla incluye estructura zip y estilos", () => {
  const buffer = buildClientBulkTemplateWorkbook(ClientProfileType.PERSON);
  assert.equal(buffer[0], 0x50); // P
  assert.equal(buffer[1], 0x4b); // K
  const text = buffer.toString("utf8");
  assert.ok(text.includes("xl/styles.xml"));
  assert.ok(text.includes("xl/worksheets/sheet1.xml"));
  assert.ok(text.includes("xl/worksheets/sheet2.xml"));
});
