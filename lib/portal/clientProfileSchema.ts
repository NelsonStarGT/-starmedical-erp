import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";

const warnedPhotoColumnContexts = new Set<string>();

const PORTAL_CLIENT_PROFILE_SELECT_BASE = {
  id: true,
  type: true,
  companyName: true,
  firstName: true,
  middleName: true,
  lastName: true,
  secondLastName: true,
  dpi: true,
  nit: true,
  partyId: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  department: true,
  country: true
} as const satisfies Prisma.ClientProfileSelect;

const PORTAL_CLIENT_PROFILE_SELECT_WITH_PHOTO = {
  ...PORTAL_CLIENT_PROFILE_SELECT_BASE,
  photoUrl: true
} as const satisfies Prisma.ClientProfileSelect;

type PortalClientProfileWithPhoto = Prisma.ClientProfileGetPayload<{ select: typeof PORTAL_CLIENT_PROFILE_SELECT_WITH_PHOTO }>;
type PortalClientProfileWithoutPhoto = Prisma.ClientProfileGetPayload<{ select: typeof PORTAL_CLIENT_PROFILE_SELECT_BASE }>;

export type PortalClientProfileSelectResult = PortalClientProfileWithPhoto | PortalClientProfileWithoutPhoto;

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
  return isPrismaUnknownFieldError(error, "photoUrl") || isPrismaMissingColumnError(error, "photoUrl");
}

function warnDevPhotoColumnsUnavailable(context: string, error: unknown) {
  if (process.env.NODE_ENV === "production") return;
  if (warnedPhotoColumnContexts.has(context)) return;
  warnedPhotoColumnContexts.add(context);

  const details = toErrorMessage(error);
  console.warn(
    `[DEV][db] ${context}: ClientProfile.photoUrl no disponible para portal. ` +
      "Aplicando fallback sin foto. Ejecuta `npm run db:migrate:deploy` y `npx prisma generate`. " +
      `Details: ${details}`
  );
}

export async function safeSupportsClientProfilePhotoColumns(context = "portal.clientProfile.photoColumns"): Promise<boolean> {
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

export function buildPortalClientProfileSelect(supportsPhoto: boolean) {
  return supportsPhoto ? PORTAL_CLIENT_PROFILE_SELECT_WITH_PHOTO : PORTAL_CLIENT_PROFILE_SELECT_BASE;
}

export function readPortalClientProfilePhotoUrl(profile: PortalClientProfileSelectResult | null | undefined) {
  if (!profile) return null;
  return "photoUrl" in profile ? profile.photoUrl ?? null : null;
}
