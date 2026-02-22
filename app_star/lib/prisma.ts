import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaDiagnosticsLogged?: boolean;
};

function maskDatabaseUrl(rawUrl: string | undefined): string {
  if (!rawUrl) return "(missing)";
  try {
    const url = new URL(rawUrl);
    const schema = url.searchParams.get("schema");
    const credentials = url.username ? `${url.username}:***@` : "";
    const port = url.port ? `:${url.port}` : "";
    const query = schema ? `?schema=${schema}` : url.search;
    return `${url.protocol}//${credentials}${url.hostname}${port}${url.pathname}${query}`;
  } catch {
    return "(invalid)";
  }
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

if (process.env.SM_DB_DIAGNOSTICS === "1" && !globalForPrisma.prismaDiagnosticsLogged) {
  const rawUrl = process.env.DATABASE_URL;
  const maskedUrl = maskDatabaseUrl(rawUrl);
  const provider = rawUrl?.startsWith("postgres") ? "postgresql" : "unknown";
  const schema = (() => {
    try {
      return rawUrl ? new URL(rawUrl).searchParams.get("schema") ?? "(default)" : "(missing)";
    } catch {
      return "(invalid)";
    }
  })();

  console.info(`[SM_DB_DIAGNOSTICS] provider=${provider} schema=${schema} url=${maskedUrl}`);
  globalForPrisma.prismaDiagnosticsLogged = true;
}
