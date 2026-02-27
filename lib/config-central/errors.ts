import {
  isPrismaMissingTableError,
  isPrismaSchemaMismatchError,
  logPrismaSchemaIssue
} from "@/lib/prisma/errors.server";

export { isPrismaSchemaMismatchError };

export function isCentralConfigCompatError(error: unknown): boolean {
  return isPrismaMissingTableError(error) || isPrismaSchemaMismatchError(error);
}

export function warnDevCentralCompat(context: string, error: unknown) {
  if (isPrismaMissingTableError(error)) {
    logPrismaSchemaIssue(context, error, { domain: "global", issue: "missing_table", dedupe: false });
    return;
  }

  if (process.env.NODE_ENV === "production") return;
  const message = error instanceof Error ? error.message : String(error);
  console.warn(
    `[DEV][config-central] ${context}: fallback por schema mismatch. ` +
      `Ejecuta migraciones + prisma generate. Details: ${message}`
  );
}
