export function isPrismaMissingTableError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (code === "P2021") return true;
  }

  const message = (() => {
    if (typeof error === "object" && error !== null && "message" in error) {
      return String((error as { message?: unknown }).message ?? "");
    }
    return "";
  })();

  const msg = message.toLowerCase();
  return msg.includes("does not exist") || (msg.includes("relation") && msg.includes("does not exist"));
}

export function warnDevMissingTable(context: string, error: unknown) {
  if (process.env.NODE_ENV === "production") return;
  if (!isPrismaMissingTableError(error)) return;
  const message = error instanceof Error ? error.message : String(error);
  console.warn(
    `[DEV][db] ${context}: missing table (P2021). ` +
      `Run \`npm run db:migrate:deploy\` (or \`npx prisma migrate deploy\`). ` +
      `Details: ${message}`
  );
}

