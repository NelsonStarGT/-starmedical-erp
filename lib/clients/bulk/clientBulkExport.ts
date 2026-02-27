import { ClientProfileType, type Prisma } from "@prisma/client";
import { getClientBulkColumns, splitBulkCsvList } from "@/lib/clients/bulk/clientBulkSchema";

export type ClientBulkExportProfile = Prisma.ClientProfileGetPayload<{
  include: {
    status: { select: { name: true } };
    institutionType: { select: { name: true } };
    acquisitionSource: { select: { name: true; code: true } };
    acquisitionDetailOption: { select: { name: true; code: true } };
    companyRecord: {
      select: {
        id: true;
        kind: true;
        legalName: true;
        tradeName: true;
        taxId: true;
        billingEmail: true;
        billingPhone: true;
        website: true;
        notes: true;
        metadata: true;
      };
    };
    clientLocations: {
      where: { isPrimary: true; isActive: true };
      select: {
        address: true;
        addressLine1: true;
        postalCode: true;
        city: true;
        department: true;
        country: true;
      };
      take: 1;
    };
    clientNotes: {
      where: { noteType: "ADMIN" };
      select: { body: true; updatedAt: true };
      orderBy: { updatedAt: "desc" };
      take: 1;
    };
  };
}>;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function str(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function boolAsCsv(value: unknown) {
  if (typeof value !== "boolean") return "";
  return value ? "true" : "false";
}

function csvList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => str(item)).filter(Boolean).join(", ");
  }
  if (typeof value === "string") {
    return splitBulkCsvList(value).join(", ");
  }
  return "";
}

function profileAddress(profile: ClientBulkExportProfile) {
  const primaryLocation = profile.clientLocations[0];
  return {
    address: str(primaryLocation?.addressLine1 || primaryLocation?.address || profile.address),
    country: str(primaryLocation?.country || profile.country),
    department: str(primaryLocation?.department || profile.department),
    city: str(primaryLocation?.city || profile.city),
    postalCode: str(primaryLocation?.postalCode)
  };
}

export function buildClientBulkDataRow(type: ClientProfileType, profile: ClientBulkExportProfile) {
  const metadata = asRecord(profile.companyRecord?.metadata);
  const address = profileAddress(profile);
  const latestAdminNote = profile.clientNotes[0]?.body ?? "";

  const valueByKey: Record<string, string> = {
    first_name: str(profile.firstName),
    middle_name: str(profile.middleName),
    third_name: str(profile.thirdName),
    last_name: str(profile.lastName),
    second_last_name: str(profile.secondLastName),
    third_last_name: str(profile.thirdLastName),
    sex: str(profile.sex),
    document_country_iso2: str(metadata.identityCountryIso2),
    document_type: str(metadata.identityDocumentCode || (profile.dpi ? "DPI" : "")),
    document_number: str(profile.dpi),
    phone_primary: str(profile.phone),
    email_primary: str(profile.email),
    birth_date: profile.birthDate ? profile.birthDate.toISOString().slice(0, 10) : "",
    blood_type: str(profile.bloodType),
    residence_country: address.country,
    residence_state: address.department,
    residence_city: address.city,
    residence_address: address.address,
    service_segments: Array.isArray(profile.serviceSegments) ? profile.serviceSegments.map((segment) => String(segment)).join(", ") : "",
    acquisition_source: str(profile.acquisitionSource?.name),
    acquisition_detail: str(profile.acquisitionDetailOption?.name),
    notes: str(profile.companyRecord?.notes || metadata.personNotes || latestAdminNote),

    legal_name: str(profile.companyRecord?.legalName || profile.companyName),
    trade_name: str(profile.companyRecord?.tradeName || profile.tradeName),
    nit: str(profile.companyRecord?.taxId || profile.nit),
    legal_form: str(metadata.legalForm),
    legal_form_other: str(metadata.legalFormOther),
    company_size_range: str(metadata.companySizeRange),
    economic_activity_primary: str(metadata.economicActivityPrimary),
    economic_activity_secondary: csvList(metadata.economicActivitySecondary),
    website: str(profile.companyRecord?.website),
    address: address.address,
    country: address.country,
    department: address.department,
    city: address.city,
    postal_code: address.postalCode,
    billing_email: str(profile.companyRecord?.billingEmail),
    preferred_currency: str(metadata.preferredCurrencyCode),
    accepted_currencies: csvList(metadata.acceptedCurrencyCodes),

    public_name: str(profile.tradeName || profile.companyRecord?.tradeName),
    institution_type: str(profile.institutionType?.name),
    institution_category: str(metadata.institutionCategory),
    institution_sector: str(metadata.institutionSector),
    institution_is_public: boolAsCsv(profile.institutionIsPublic),

    insurer_type: str(metadata.insurerType),
    insurer_scope: str(metadata.insurerScope),
    insurer_code: str(metadata.insurerCode),
    insurer_line_primary: str(metadata.insurerLinePrimary),
    insurer_line_secondary: csvList(metadata.insurerLineSecondary),
    authorization_portal_url: str(metadata.authorizationPortalUrl),
    authorization_email: str(metadata.authorizationEmail),
    claims_email: str(metadata.claimsEmail),
    provider_support_phone: str(metadata.providerSupportPhone),
    provider_support_whatsapp: str(metadata.providerSupportWhatsApp)
  };

  return getClientBulkColumns(type).map((columnDef) => valueByKey[columnDef.key] ?? "");
}
