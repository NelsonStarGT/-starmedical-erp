import { prisma } from "@/lib/prisma";
import {
  buildCallingCodeOptionLabel,
  normalizeCallingCodeValue,
  type CallingCodeOption
} from "@/lib/clients/callingCodeOptions";

export async function getCallingCodeOptions(input?: {
  q?: string;
  includeInactive?: boolean;
  limit?: number;
}) {
  const q = input?.q?.trim() ?? "";
  const includeInactive = Boolean(input?.includeInactive);
  const limit = Math.min(Math.max(input?.limit ?? 500, 25), 1000);

  const rows = await prisma.phoneCountryCode.findMany({
    where: {
      ...(includeInactive ? {} : { isActive: true }),
      ...(q
        ? {
            OR: [
              { countryName: { contains: q, mode: "insensitive" } },
              { iso2: { contains: q.toUpperCase() } },
              { dialCode: { contains: q } }
            ]
          }
        : {})
    },
    orderBy: [{ countryName: "asc" }],
    take: limit,
    select: {
      id: true,
      iso2: true,
      countryName: true,
      dialCode: true,
      minLength: true,
      maxLength: true,
      example: true,
      isActive: true
    }
  });

  const geoRows = await prisma.geoCountry.findMany({
    where: { iso2: { in: rows.map((row) => row.iso2.toUpperCase()) } },
    select: { id: true, iso2: true }
  });
  const geoCountryIdByIso2 = new Map(geoRows.map((row) => [row.iso2.toUpperCase(), row.id]));

  const items: CallingCodeOption[] = [];
  for (const row of rows) {
    const dialCode = normalizeCallingCodeValue(row.dialCode);
    if (!dialCode) continue;
    items.push({
      id: row.id,
      iso2: row.iso2.toUpperCase(),
      countryName: row.countryName,
      dialCode,
      callingCode: dialCode,
      minLength: Number.isFinite(row.minLength) ? row.minLength : 6,
      maxLength: Number.isFinite(row.maxLength) ? row.maxLength : 15,
      example: row.example ?? null,
      isActive: row.isActive,
      geoCountryId: geoCountryIdByIso2.get(row.iso2.toUpperCase()) ?? null
    });
  }

  return {
    items: items.map((row) => ({
      ...row,
      label: buildCallingCodeOptionLabel(row)
    }))
  };
}
