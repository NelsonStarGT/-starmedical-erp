import { ClientProfileType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CandidateClient = {
  id: string;
  nit: string | null;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  secondLastName: string | null;
};

function normalize(value?: string | null) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function normalizePhone(value?: string | null) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits.length >= 8 ? digits : null;
}

function buildPersonName(client: CandidateClient) {
  return [client.firstName, client.middleName, client.lastName, client.secondLastName].filter(Boolean).join(" ").trim() || null;
}

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  return {
    commit: args.has("--commit"),
    limit: (() => {
      const limitFlag = process.argv.find((arg) => arg.startsWith("--limit="));
      if (!limitFlag) return 500;
      const value = Number(limitFlag.split("=")[1]);
      return Number.isFinite(value) && value > 0 ? Math.floor(value) : 500;
    })()
  };
}

async function resolvePartyIds(client: CandidateClient) {
  const conditions: Prisma.PartyWhereInput[] = [];
  const nit = normalize(client.nit);
  const email = normalize(client.email)?.toLowerCase() ?? null;
  const phone = normalizePhone(client.phone);
  const personName = buildPersonName(client);

  if (nit) conditions.push({ nit });
  if (email) conditions.push({ email: { equals: email, mode: "insensitive" } });
  if (phone) conditions.push({ phone: { contains: phone } });
  if (personName) conditions.push({ name: { contains: personName, mode: "insensitive" } });

  if (!conditions.length) return [];
  const rows = await prisma.party.findMany({
    where: { OR: conditions },
    select: { id: true },
    take: 10
  });
  return rows.map((row) => row.id);
}

async function main() {
  const { commit, limit } = parseArgs();
  const candidates = await prisma.clientProfile.findMany({
    where: {
      type: ClientProfileType.PERSON,
      deletedAt: null,
      partyId: null
    },
    select: {
      id: true,
      nit: true,
      email: true,
      phone: true,
      firstName: true,
      middleName: true,
      lastName: true,
      secondLastName: true
    },
    take: limit
  });

  let linked = 0;
  let ambiguous = 0;
  let noMatch = 0;
  const updates: Array<{ clientId: string; partyId: string }> = [];

  for (const client of candidates) {
    const partyIds = await resolvePartyIds(client);
    if (partyIds.length === 1) {
      updates.push({ clientId: client.id, partyId: partyIds[0] });
    } else if (partyIds.length > 1) {
      ambiguous += 1;
    } else {
      noMatch += 1;
    }
  }

  if (commit && updates.length > 0) {
    for (const update of updates) {
      await prisma.clientProfile.update({
        where: { id: update.clientId },
        data: { partyId: update.partyId }
      });
      linked += 1;
    }
  }

  const mode = commit ? "APPLY" : "DRY_RUN";
  console.info(`[portal.link-party] mode=${mode}`);
  console.info(`[portal.link-party] candidates=${candidates.length}`);
  console.info(`[portal.link-party] single_match=${updates.length}`);
  console.info(`[portal.link-party] ambiguous=${ambiguous}`);
  console.info(`[portal.link-party] no_match=${noMatch}`);
  if (commit) {
    console.info(`[portal.link-party] linked=${linked}`);
  } else if (updates.length) {
    console.info("[portal.link-party] use --commit to persist links");
  }
}

main()
  .catch((error) => {
    console.error("[portal.link-party] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
