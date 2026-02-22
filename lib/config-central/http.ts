import { NextResponse } from "next/server";

export type ConfigCentralIssue = {
  path: string;
  message: string;
};

export function forbidden403(error = "No autorizado") {
  return NextResponse.json(
    {
      ok: false,
      code: "FORBIDDEN",
      error
    },
    { status: 403 }
  );
}

export function validation422(error: string, issues?: ConfigCentralIssue[]) {
  return NextResponse.json(
    {
      ok: false,
      code: "VALIDATION_ERROR",
      error,
      ...(issues && issues.length > 0 ? { issues } : {})
    },
    { status: 422 }
  );
}

export function conflict409(error: string, conflict?: Record<string, unknown>) {
  return NextResponse.json(
    {
      ok: false,
      code: "CONFLICT",
      error,
      ...(conflict ? { conflict } : {})
    },
    { status: 409 }
  );
}

export function service503(code = "DB_NOT_READY", error = "Servicio no disponible.") {
  return NextResponse.json(
    {
      ok: false,
      code,
      error
    },
    { status: 503 }
  );
}

export function notFound404(error: string) {
  return NextResponse.json(
    {
      ok: false,
      code: "NOT_FOUND",
      error
    },
    { status: 404 }
  );
}

export function server500(error = "Error interno del servidor.") {
  return NextResponse.json(
    {
      ok: false,
      code: "INTERNAL_ERROR",
      error
    },
    { status: 500 }
  );
}
