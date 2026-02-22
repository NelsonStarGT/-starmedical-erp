import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";

export function isPrismaSchemaMismatchError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (code === "P2022") return true;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("unknown field") ||
    message.includes("unknown argument") ||
    message.includes("unknown arg") ||
    (message.includes("column") && message.includes("does not exist"))
  );
}

export function isCentralConfigCompatError(error: unknown): boolean {
  return isPrismaMissingTableError(error) || isPrismaSchemaMismatchError(error);
}

export function warnDevCentralCompat(context: string, error: unknown) {
  if (isPrismaMissingTableError(error)) {
    warnDevMissingTable(context, error);
    return;
  }

  if (process.env.NODE_ENV === "production") return;
  const message = error instanceof Error ? error.message : String(error);
  console.warn(
    `[DEV][config-central] ${context}: fallback por schema mismatch. ` +
      `Ejecuta migraciones + prisma generate. Details: ${message}`
  );
}
