import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

type Handler = (req: NextRequest, ctx?: any) => Promise<NextResponse>;

type ApiErrorBody = {
  error: string;
  code?: string;
  details?: Record<string, any> | null;
  requestId?: string;
};

type NormalizedError = { status: number; body: ApiErrorBody };

export function safeJson(req: NextRequest) {
  return req.json().catch(() => {
    throw { status: 400, body: { error: "JSON inválido" } };
  });
}

export function mapPrismaError(err: any): NormalizedError {
  const code = err?.code || (err instanceof Prisma.PrismaClientKnownRequestError ? err.code : undefined);
  if (code === "P2002") {
    const fields = (err?.meta?.target as string[] | undefined) || [];
    return {
      status: 409,
      body: { error: "Duplicado", code, details: fields.length ? { fields } : undefined }
    };
  }
  if (code === "P2003") {
    return { status: 409, body: { error: "Relación inválida", code } };
  }
  if (code === "P2022") {
    return { status: 500, body: { error: "Schema de DB no coincide", code } };
  }
  return { status: 500, body: { error: "Error inesperado", code: "INTERNAL_ERROR" } };
}

function logError(err: any, requestId: string, path: string) {
  console.error({
    requestId,
    path,
    code: err?.code,
    message: err?.message || err?.body?.error || "unknown_error"
  });
}

function normalizeError(err: any, requestId: string, path: string): NormalizedError {
  if (err?.status && err?.body) {
    const body: ApiErrorBody = { requestId, ...err.body };
    logError(err, requestId, path);
    return { status: err.status, body };
  }
  const mapped = mapPrismaError(err);
  const body: ApiErrorBody = { ...mapped.body, requestId };
  logError(err, requestId, path);
  return { status: mapped.status, body };
}

export function withApiErrorHandling(handler: Handler): Handler {
  return async (req, ctx) => {
    const requestId = randomUUID();
    try {
      return await handler(req, { ...ctx, requestId });
    } catch (err: any) {
      const mapped = normalizeError(err, requestId, req.nextUrl.pathname);
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
  };
}
