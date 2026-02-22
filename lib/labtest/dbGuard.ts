import { isPrismaMissingTableError } from "@/lib/prisma/errors";

export function isMissingLabTableError(err: unknown): boolean {
  return isPrismaMissingTableError(err);
}
