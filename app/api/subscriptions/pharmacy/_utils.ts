import { NextResponse } from "next/server";
import { PharmacySubscriptionError } from "@/lib/subscriptions/pharmacy/service";
import { z } from "zod";

const booleanQuerySchema = z.union([
  z.boolean(),
  z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^(true|false|1|0)$/)
    .transform((value) => (value === "1" ? "true" : value === "0" ? "false" : value))
    .pipe(z.coerce.boolean())
]);

export function parseBooleanQueryParam(value: string | null) {
  if (value === null) return undefined;
  const parsed = booleanQuerySchema.safeParse(value);
  if (!parsed.success) {
    throw new PharmacySubscriptionError("Parámetro booleano inválido", 400);
  }
  return parsed.data;
}

export function handlePharmacyApiError(error: unknown) {
  if (error instanceof PharmacySubscriptionError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
}
