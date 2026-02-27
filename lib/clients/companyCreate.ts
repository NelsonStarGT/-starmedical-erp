import { isPrismaMissingTableError } from "@/lib/prisma/errors";

export const COMPANY_LOGO_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const COMPANY_LOGO_ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
export const COMPANY_DOCUMENT_ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/jpg", "image/png"]);

export type CompanyBranchDraftInput = {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  department?: string | null;
  country?: string | null;
  geoCountryId?: string | null;
  geoAdmin1Id?: string | null;
  geoAdmin2Id?: string | null;
  geoAdmin3Id?: string | null;
  geoPostalCode?: string | null;
  geoFreeState?: string | null;
  geoFreeCity?: string | null;
};

export type NormalizedCompanyBranchDraft = {
  name: string;
  address: string | null;
  city: string | null;
  department: string | null;
  country: string | null;
  geoCountryId: string | null;
  geoAdmin1Id: string | null;
  geoAdmin2Id: string | null;
  geoAdmin3Id: string | null;
  geoPostalCode: string | null;
  geoFreeState: string | null;
  geoFreeCity: string | null;
};

export type CompanyDocumentWizardDraft = {
  title: string;
  hasExpiry: boolean;
  expiryDate?: string | null;
  fileAssetId?: string | null;
};

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizeCompanyWebsite(input?: string | null): { value: string | null; error: string | null } {
  const raw = normalizeOptional(input);
  if (!raw) return { value: null, error: null };

  const candidate = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { value: null, error: "Sitio web inválido." };
    }
    if (!parsed.hostname) {
      return { value: null, error: "Sitio web inválido." };
    }
    return { value: parsed.toString(), error: null };
  } catch {
    return { value: null, error: "Sitio web inválido." };
  }
}

export function validateCompanyLogoAsset(input: {
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
}): { ok: true } | { ok: false; error: string } {
  const mimeType = input.mimeType.trim().toLowerCase();
  if (!COMPANY_LOGO_ALLOWED_MIME_TYPES.has(mimeType)) {
    return { ok: false, error: "Logo inválido. Solo se permiten JPG, PNG o WEBP." };
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > COMPANY_LOGO_MAX_SIZE_BYTES) {
    return { ok: false, error: "Logo inválido. Máximo 10MB." };
  }
  const storageKey = input.storageKey.trim();
  if (!storageKey.startsWith("clients/logos/") && !storageKey.startsWith("clients/photos/") && !storageKey.startsWith("uploads/")) {
    return { ok: false, error: "Logo inválido. Debe subirse en el flujo permitido." };
  }
  return { ok: true };
}

export function normalizeCompanyBranchDrafts(branches?: CompanyBranchDraftInput[] | null): NormalizedCompanyBranchDraft[] {
  if (!Array.isArray(branches) || branches.length === 0) return [];

  const normalized: NormalizedCompanyBranchDraft[] = [];
  for (const row of branches) {
    const name = normalizeOptional(row?.name);
    const address = normalizeOptional(row?.address);
    const city = normalizeOptional(row?.city);
    const department = normalizeOptional(row?.department);
    const country = normalizeOptional(row?.country);
    const geoCountryId = normalizeOptional(row?.geoCountryId);
    const geoAdmin1Id = normalizeOptional(row?.geoAdmin1Id);
    const geoAdmin2Id = normalizeOptional(row?.geoAdmin2Id);
    const geoAdmin3Id = normalizeOptional(row?.geoAdmin3Id);
    const geoPostalCode = normalizeOptional(row?.geoPostalCode);
    const geoFreeState = normalizeOptional(row?.geoFreeState);
    const geoFreeCity = normalizeOptional(row?.geoFreeCity);

    const hasAnyData = Boolean(
      name ||
        address ||
        city ||
        department ||
        country ||
        geoCountryId ||
        geoAdmin1Id ||
        geoAdmin2Id ||
        geoAdmin3Id ||
        geoPostalCode ||
        geoFreeState ||
        geoFreeCity
    );
    if (!hasAnyData) continue;

    normalized.push({
      name: name ?? "",
      address,
      city,
      department,
      country,
      geoCountryId,
      geoAdmin1Id,
      geoAdmin2Id,
      geoAdmin3Id,
      geoPostalCode,
      geoFreeState,
      geoFreeCity
    });
  }

  return normalized;
}

export function validateCompanyBranchDraft(input: {
  branch: NormalizedCompanyBranchDraft;
  rowNumber: number;
}): string | null {
  const { branch, rowNumber } = input;
  if (!branch.name.trim()) return `Sucursal #${rowNumber}: nombre de sucursal requerido.`;
  if (!branch.address?.trim()) return `Sucursal #${rowNumber}: dirección exacta requerida.`;
  return null;
}

export function validateCompanyDocumentWizardDrafts(
  rows: CompanyDocumentWizardDraft[]
): { ok: true } | { ok: false; error: string } {
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row) continue;
    const hasFile = Boolean(normalizeOptional(row.fileAssetId));
    if (!hasFile) continue;
    if (!normalizeOptional(row.title)) {
      return { ok: false, error: `Documento #${index + 1}: título requerido.` };
    }
    if (row.hasExpiry) {
      const dateValue = normalizeOptional(row.expiryDate);
      if (!dateValue) {
        return { ok: false, error: `Documento #${index + 1}: selecciona fecha de vencimiento.` };
      }
      const parsed = new Date(dateValue);
      if (Number.isNaN(parsed.getTime())) {
        return { ok: false, error: `Documento #${index + 1}: fecha de vencimiento inválida.` };
      }
    }
  }

  return { ok: true };
}

export function isMissingPbxTableError(error: unknown) {
  if (isPrismaMissingTableError(error)) return true;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();
  return message.includes("clientpbxcategorydirectory") && message.includes("does not exist");
}
