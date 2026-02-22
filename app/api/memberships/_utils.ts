import { NextResponse } from "next/server";
import { MembershipError } from "@/lib/memberships/service";

export function handleMembershipApiError(error: unknown) {
  if (error instanceof MembershipError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
}

export function parseBooleanStatus(value: string | boolean) {
  if (typeof value === "boolean") return value;
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "true" || normalized === "activo" || normalized === "activa" || normalized === "1") return true;
  if (normalized === "false" || normalized === "inactivo" || normalized === "inactiva" || normalized === "0") return false;
  throw new MembershipError("status inválido", 400);
}
