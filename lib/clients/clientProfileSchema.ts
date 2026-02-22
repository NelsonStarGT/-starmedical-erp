import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";

const warnedPhotoColumnContexts = new Set<string>();

const CLIENT_PROFILE_SELECT_BASE = {
  id: true,
  type: true,
  companyName: true,
  tradeName: true,
  firstName: true,
  middleName: true,
  lastName: true,
  secondLastName: true,
  dpi: true,
  nit: true,
  phone: true,
  phoneE164: true,
  email: true,
  address: true,
  city: true,
  department: true,
  country: true,
  statusId: true,
  status: { select: { name: true } },
  institutionTypeId: true,
  institutionType: { select: { name: true } },
  createdAt: true
} as const satisfies Prisma.ClientProfileSelect;

const CLIENT_PROFILE_SELECT_WITH_PHOTO = {
  ...CLIENT_PROFILE_SELECT_BASE,
  photoUrl: true,
  photoAssetId: true
} as const satisfies Prisma.ClientProfileSelect;

type ClientProfileWithPhoto = Prisma.ClientProfileGetPayload<{ select: typeof CLIENT_PROFILE_SELECT_WITH_PHOTO }>;
type ClientProfileWithoutPhoto = Prisma.ClientProfileGetPayload<{ select: typeof CLIENT_PROFILE_SELECT_BASE }>;

export type ClientProfileSelectResult = ClientProfileWithPhoto | ClientProfileWithoutPhoto;

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function isPrismaUnknownFieldError(error: unknown, fieldName?: string) {
  const message = toErrorMessage(error).toLowerCase();
  if (!message.includes("unknown field")) return false;
  if (!fieldName) return true;
  return message.includes(fieldName.toLowerCase());
}

function isPrismaMissingColumnError(error: unknown, columnName?: string) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (code === "P2022") return true;
  }

  const message = toErrorMessage(error).toLowerCase();
  if (!(message.includes("column") && message.includes("does not exist"))) return false;
  if (!columnName) return true;
  return message.includes(columnName.toLowerCase());
}

function isClientProfilePhotoColumnsUnavailableError(error: unknown) {
  return (
    isPrismaUnknownFieldError(error, "photoUrl") ||
    isPrismaUnknownFieldError(error, "photoAssetId") ||
    isPrismaMissingColumnError(error, "photoUrl") ||
    isPrismaMissingColumnError(error, "photoAssetId")
  );
}

function warnDevPhotoColumnsUnavailable(context: string, error: unknown) {
  if (process.env.NODE_ENV === "production") return;
  if (warnedPhotoColumnContexts.has(context)) return;
  warnedPhotoColumnContexts.add(context);

  const details = toErrorMessage(error);
  console.warn(
    `[DEV][db] ${context}: ClientProfile.photoUrl/photoAssetId no disponibles. ` +
      "Aplicando fallback sin foto. Ejecuta `npm run db:migrate:deploy` y `npx prisma generate`. " +
      `Details: ${details}`
  );
}

export async function safeSupportsClientProfilePhotoColumns(context = "clients.clientProfile.photoColumns"): Promise<boolean> {
  try {
    await prisma.clientProfile.findFirst({
      where: { deletedAt: null },
      select: { id: true, photoUrl: true },
      orderBy: { createdAt: "desc" }
    });
    return true;
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable(`${context}.clientProfile.findFirst`, error);
      return false;
    }
    if (isClientProfilePhotoColumnsUnavailableError(error)) {
      warnDevPhotoColumnsUnavailable(`${context}.clientProfile.findFirst`, error);
      return false;
    }
    throw error;
  }
}

export function buildClientProfileSelect(supportsPhoto: boolean) {
  return supportsPhoto ? CLIENT_PROFILE_SELECT_WITH_PHOTO : CLIENT_PROFILE_SELECT_BASE;
}

export function readClientProfilePhotoFields(
  profile: ClientProfileSelectResult | null | undefined
): { photoUrl: string | null; photoAssetId: string | null } {
  if (!profile) return { photoUrl: null, photoAssetId: null };

  const photoUrl = "photoUrl" in profile ? profile.photoUrl ?? null : null;
  const photoAssetId = "photoAssetId" in profile ? profile.photoAssetId ?? null : null;
  return { photoUrl, photoAssetId };
}
