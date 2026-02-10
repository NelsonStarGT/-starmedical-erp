import { ClientProfileType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildPortalClientProfileSelect,
  readPortalClientProfilePhotoUrl,
  safeSupportsClientProfilePhotoColumns,
  type PortalClientProfileSelectResult
} from "@/lib/portal/clientProfileSchema";
import { normalizeDpi, normalizeEmail, normalizePhone } from "@/lib/portal/security";

export type PortalPersonIdentity = {
  id: string;
  type: ClientProfileType;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  secondLastName: string | null;
  dpi: string | null;
  email: string | null;
  phone: string | null;
  nit: string | null;
  partyId: string | null;
  address: string | null;
  city: string | null;
  department: string | null;
  country: string | null;
  photoUrl: string | null;
};

function toPersonIdentity(candidate: PortalClientProfileSelectResult): PortalPersonIdentity {
  return {
    id: candidate.id,
    type: candidate.type,
    firstName: candidate.firstName ?? null,
    middleName: candidate.middleName ?? null,
    lastName: candidate.lastName ?? null,
    secondLastName: candidate.secondLastName ?? null,
    dpi: candidate.dpi ?? null,
    email: candidate.email ?? null,
    phone: candidate.phone ?? null,
    nit: candidate.nit ?? null,
    partyId: candidate.partyId ?? null,
    address: candidate.address ?? null,
    city: candidate.city ?? null,
    department: candidate.department ?? null,
    country: candidate.country ?? null,
    photoUrl: readPortalClientProfilePhotoUrl(candidate)
  };
}

function byExactEmail(candidates: PortalPersonIdentity[], normalizedEmail: string) {
  return candidates.filter((candidate) => normalizeEmail(candidate.email) === normalizedEmail);
}

function byPartialEmail(candidates: PortalPersonIdentity[], normalizedEmail: string) {
  return candidates.filter((candidate) => {
    const candidateEmail = normalizeEmail(candidate.email);
    if (!candidateEmail) return false;
    return candidateEmail.includes(normalizedEmail) || normalizedEmail.includes(candidateEmail);
  });
}

function byExactPhone(candidates: PortalPersonIdentity[], normalizedPhone: string) {
  return candidates.filter((candidate) => normalizePhone(candidate.phone) === normalizedPhone);
}

export function getPortalPersonDisplayName(person: {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  secondLastName: string | null;
}) {
  const fullName = [person.firstName, person.middleName, person.lastName, person.secondLastName].filter(Boolean).join(" ").trim();
  return fullName || "Paciente";
}

export async function resolvePortalPersonByIdentity(input: {
  dpi?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  const normalizedDpi = normalizeDpi(input.dpi);
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = normalizePhone(input.phone);

  if (!normalizedDpi || (!normalizedEmail && !normalizedPhone)) {
    return null;
  }

  const supportsPhoto = await safeSupportsClientProfilePhotoColumns("portal.identity");
  const profileSelect = buildPortalClientProfileSelect(supportsPhoto);
  const rows = (await prisma.clientProfile.findMany({
    where: {
      type: ClientProfileType.PERSON,
      deletedAt: null,
      dpi: normalizedDpi
    },
    take: 25,
    select: profileSelect
  })) as PortalClientProfileSelectResult[];
  const candidates = rows.map((row) => toPersonIdentity(row));

  if (!candidates.length) {
    return null;
  }

  if (normalizedEmail) {
    const exactEmailMatches = byExactEmail(candidates, normalizedEmail);
    if (exactEmailMatches.length === 1) return exactEmailMatches[0];

    const partialEmailMatches = byPartialEmail(candidates, normalizedEmail);
    if (partialEmailMatches.length === 1) return partialEmailMatches[0];
  }

  if (normalizedPhone) {
    const exactPhoneMatches = byExactPhone(candidates, normalizedPhone);
    if (exactPhoneMatches.length === 1) return exactPhoneMatches[0];
  }

  return null;
}
