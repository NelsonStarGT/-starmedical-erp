import { ClientProfileType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const KNOWN_SLUG_PREFIXES = ["diag-patient-", "diag-client-", "patient-", "cliente-", "client-"] as const;
const UUID_REGEX =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
const CUID_REGEX = /\bc[a-z0-9]{24}\b/i;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripKnownSlugPrefixes(slug: string) {
  for (const prefix of KNOWN_SLUG_PREFIXES) {
    if (slug.startsWith(prefix)) {
      return slug.slice(prefix.length);
    }
  }
  return slug;
}

function normalizeClientRef(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    decoded = trimmed;
  }

  const clean = decoded.replace(/[#?].*$/, "");
  const segment = clean.split("/").filter(Boolean).at(-1) ?? clean;
  return segment.trim();
}

function extractEmbeddedClientIds(input: string) {
  const ids = new Set<string>();
  const uuidMatch = input.match(UUID_REGEX)?.[0];
  if (uuidMatch) ids.add(uuidMatch);
  const cuidMatch = input.match(CUID_REGEX)?.[0];
  if (cuidMatch) ids.add(cuidMatch);
  return Array.from(ids);
}

function buildDisplayName(row: {
  type: ClientProfileType;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  secondLastName: string | null;
  companyName: string | null;
  tradeName: string | null;
}) {
  if (row.type === ClientProfileType.PERSON) {
    return [row.firstName, row.middleName, row.lastName, row.secondLastName].filter(Boolean).join(" ").trim();
  }
  return (row.companyName || row.tradeName || "").trim();
}

function buildCandidateSlugs(row: {
  type: ClientProfileType;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  secondLastName: string | null;
  companyName: string | null;
  tradeName: string | null;
}) {
  const candidates = new Set<string>();
  const displayName = buildDisplayName(row);
  const displaySlug = slugify(displayName);
  if (displaySlug) candidates.add(displaySlug);

  if (row.type === ClientProfileType.PERSON) {
    const firstNameSlug = slugify(row.firstName || "");
    const shortNameSlug = slugify([row.firstName, row.lastName].filter(Boolean).join(" "));
    if (firstNameSlug) {
      candidates.add(firstNameSlug);
      candidates.add(`diag-patient-${firstNameSlug}`);
      candidates.add(`patient-${firstNameSlug}`);
    }
    if (shortNameSlug) {
      candidates.add(shortNameSlug);
      candidates.add(`diag-patient-${shortNameSlug}`);
    }
    if (displaySlug) {
      candidates.add(`diag-patient-${displaySlug}`);
    }
  } else if (displaySlug) {
    candidates.add(`diag-client-${displaySlug}`);
    candidates.add(`client-${displaySlug}`);
    candidates.add(`cliente-${displaySlug}`);
  }

  return candidates;
}

export async function resolveClientIdFromRef(clientRefRaw: string) {
  const clientRef = normalizeClientRef(clientRefRaw);
  if (!clientRef) return null;

  const directCandidateIds = Array.from(new Set([clientRef, ...extractEmbeddedClientIds(clientRefRaw)]));

  const direct = await prisma.clientProfile.findFirst({
    where: {
      id: { in: directCandidateIds },
      deletedAt: null
    },
    select: { id: true }
  });
  if (direct) return direct.id;

  const identifierCandidates = Array.from(new Set([clientRefRaw.trim(), clientRef])).filter(Boolean);
  const byIdentifier = await prisma.clientProfile.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { dpi: { in: identifierCandidates } },
        { nit: { in: identifierCandidates } }
      ]
    },
    select: { id: true }
  });
  if (byIdentifier) return byIdentifier.id;

  const slugToken = slugify(clientRef);
  if (!slugToken) return null;
  const strippedToken = stripKnownSlugPrefixes(slugToken);
  const searchChunks = strippedToken
    .split("-")
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length >= 2)
    .slice(0, 5);
  if (!searchChunks.length) return null;

  const candidates = await prisma.clientProfile.findMany({
    where: {
      deletedAt: null,
      OR: searchChunks.flatMap((chunk) => [
        { firstName: { contains: chunk, mode: "insensitive" as const } },
        { middleName: { contains: chunk, mode: "insensitive" as const } },
        { lastName: { contains: chunk, mode: "insensitive" as const } },
        { secondLastName: { contains: chunk, mode: "insensitive" as const } },
        { companyName: { contains: chunk, mode: "insensitive" as const } },
        { tradeName: { contains: chunk, mode: "insensitive" as const } }
      ])
    },
    select: {
      id: true,
      type: true,
      firstName: true,
      middleName: true,
      lastName: true,
      secondLastName: true,
      companyName: true,
      tradeName: true
    },
    orderBy: { updatedAt: "desc" },
    take: 60
  });

  const exactSlugMatch = candidates.find((candidate) => {
    const slugs = buildCandidateSlugs(candidate);
    if (slugs.has(slugToken) || slugs.has(strippedToken)) return true;
    return Array.from(slugs).some((candidateSlug) => candidateSlug.startsWith(strippedToken) || strippedToken.startsWith(candidateSlug));
  });
  if (exactSlugMatch) return exactSlugMatch.id;

  const tailToken = searchChunks.at(-1) ?? "";
  const fallbackByTail = candidates.find((candidate) => {
    const firstNameSlug = slugify(candidate.firstName || "");
    const tradeSlug = slugify(candidate.tradeName || "");
    const companySlug = slugify(candidate.companyName || "");
    return firstNameSlug === tailToken || tradeSlug === tailToken || companySlug === tailToken;
  });
  if (fallbackByTail) return fallbackByTail.id;

  return null;
}
