export type PrismaSchemaIssueKind = "missing_table" | "legacy_schema";
export type PrismaSchemaRequirement = "REQUIRED" | "OPTIONAL";
export type PrismaSchemaDomain = "clients" | "reception" | "ops" | "portal" | "medical" | "global" | string;
export type PrismaSchemaClassification = "OPTIONAL" | "REQUIRED";

type ResolvePrismaSchemaFallbackInput<T> = {
  domain: PrismaSchemaDomain;
  context: string;
  requirement: PrismaSchemaRequirement;
  error: unknown;
  fallback?: T | (() => T);
};

type ResolvePrismaSchemaFallbackResult<T> =
  | { handled: false }
  | {
      handled: true;
      requirement: "OPTIONAL";
      issue: PrismaSchemaIssueKind;
      source: "fallback";
      badge: "fallback";
      value: T;
      notice: string;
    }
  | {
      handled: true;
      requirement: "REQUIRED";
      issue: PrismaSchemaIssueKind;
      error: PrismaRequiredTableDependencyError;
    };

const warnedSchemaIssues = new Set<string>();
export type PrismaSchemaEventPayload = {
  domain: PrismaSchemaDomain;
  context: string;
  issue: PrismaSchemaIssueKind;
  classification: PrismaSchemaClassification;
  code: string | null;
  table: string | null;
  actionHint: string;
  detail: string;
};
export type PrismaSchemaEventWriter = (payload: PrismaSchemaEventPayload) => void | Promise<void>;
let prismaSchemaEventWriterForTests: PrismaSchemaEventWriter | null = null;

function normalizePossibleTableName(value: string | null) {
  if (!value) return null;
  return value
    .trim()
    .replace(/^["'`]/, "")
    .replace(/["'`]$/, "")
    .replace(/^\w+\./, "");
}

function readPrismaErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && code.trim().length > 0) return code.trim();
  }
  return null;
}

function extractPrismaTableReference(error: unknown) {
  const message = readErrorMessage(error);
  const matchers = [
    /table\s+([^ ]+)\s+does not exist/i,
    /relation\s+([^ ]+)\s+does not exist/i,
    /column\s+"?([a-z0-9_.]+)"?\s+does not exist/i
  ];
  for (const matcher of matchers) {
    const match = message.match(matcher);
    if (match?.[1]) return normalizePossibleTableName(match[1]);
  }
  return null;
}

function buildPrismaSchemaActionHint(issue: PrismaSchemaIssueKind) {
  if (issue === "missing_table") {
    return "Ejecuta migraciones pendientes y vuelve a cargar el módulo.";
  }
  return "Actualiza migraciones y regenera Prisma Client para salir de compatibilidad legacy.";
}

function emitPrismaSchemaEvent(payload: PrismaSchemaEventPayload) {
  if (!prismaSchemaEventWriterForTests) return;
  const maybePromise = prismaSchemaEventWriterForTests(payload);
  if (maybePromise && typeof (maybePromise as Promise<unknown>).then === "function") {
    void (maybePromise as Promise<unknown>);
  }
}

export function setPrismaSchemaEventWriter(writer: PrismaSchemaEventWriter | null) {
  prismaSchemaEventWriterForTests = writer;
}

export function __setPrismaSchemaEventWriterForTests(writer: PrismaSchemaEventWriter | null) {
  setPrismaSchemaEventWriter(writer);
}

function readErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return String(error ?? "");
}

export function isPrismaMissingTableError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (code === "P2021") return true;
  }

  const message = readErrorMessage(error).toLowerCase();
  if (message.includes("column") && message.includes("does not exist")) return false;
  return (
    (message.includes("relation") && message.includes("does not exist")) ||
    (message.includes("table") && message.includes("does not exist"))
  );
}

export function isPrismaSchemaMismatchError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (code === "P2022") return true;
  }

  const message = readErrorMessage(error).toLowerCase();
  return (
    message.includes("unknown field") ||
    message.includes("unknown argument") ||
    message.includes("unknown arg") ||
    (message.includes("column") && message.includes("does not exist"))
  );
}

export function classifyPrismaSchemaIssue(error: unknown): PrismaSchemaIssueKind | null {
  if (isPrismaMissingTableError(error)) return "missing_table";
  if (isPrismaSchemaMismatchError(error)) return "legacy_schema";
  return null;
}

export class PrismaRequiredTableDependencyError extends Error {
  readonly code = "PRISMA_REQUIRED_TABLE_DEPENDENCY";
  readonly status = 503;
  readonly context: string;
  readonly domain: PrismaSchemaDomain;
  readonly issue: PrismaSchemaIssueKind;
  readonly detail: string;

  constructor(input: {
    context: string;
    domain: PrismaSchemaDomain;
    issue: PrismaSchemaIssueKind;
    detail: string;
    message?: string;
  }) {
    super(
      input.message ??
        (input.issue === "missing_table"
          ? `Falta una tabla requerida para ${input.domain}. Ejecuta migraciones y vuelve a intentar.`
          : `El esquema actual para ${input.domain} está en modo legacy. Actualiza migraciones y Prisma Client.`)
    );
    this.name = "PrismaRequiredTableDependencyError";
    this.context = input.context;
    this.domain = input.domain;
    this.issue = input.issue;
    this.detail = input.detail;
  }
}

export function logPrismaSchemaIssue(
  context: string,
  error: unknown,
  input?: {
    domain?: PrismaSchemaDomain;
    issue?: PrismaSchemaIssueKind;
    dedupe?: boolean;
    emitEvent?: boolean;
    classification?: PrismaSchemaClassification;
  }
) {
  const shouldWarn = process.env.NODE_ENV !== "production";
  const issue = input?.issue ?? classifyPrismaSchemaIssue(error);
  if (!issue) return;

  const dedupe = input?.dedupe ?? true;
  const dedupeKey = `${issue}:${context}`;
  if (dedupe && warnedSchemaIssues.has(dedupeKey)) return;
  warnedSchemaIssues.add(dedupeKey);

  const domain = input?.domain ?? "global";
  const detail = readErrorMessage(error);
  const code = readPrismaErrorCode(error);
  const table = extractPrismaTableReference(error);
  const actionHint = buildPrismaSchemaActionHint(issue);
  const classification = input?.classification ?? "OPTIONAL";

  if (issue === "missing_table") {
    if (shouldWarn) {
      console.warn(
        `[DEV][db:${domain}] ${context}: missing table (P2021). ` +
          "Run `npm run db:migrate:deploy` or `npx prisma migrate deploy`. " +
          `Details: ${detail}`
      );
    }
    if (input?.emitEvent !== false) {
      emitPrismaSchemaEvent({
        domain,
        context,
        issue,
        classification,
        code,
        table,
        actionHint,
        detail
      });
    }
    return;
  }

  if (shouldWarn) {
    console.warn(
      `[DEV][db:${domain}] ${context}: legacy schema fallback (P2022/unknown field). ` +
        "Run migrations and regenerate Prisma Client. " +
        `Details: ${detail}`
    );
  }
  if (input?.emitEvent !== false) {
    emitPrismaSchemaEvent({
      domain,
      context,
      issue,
      classification,
      code,
      table,
      actionHint,
      detail
    });
  }
}

export function resolvePrismaSchemaFallback<T>(
  input: ResolvePrismaSchemaFallbackInput<T>
): ResolvePrismaSchemaFallbackResult<T> {
  const issue = classifyPrismaSchemaIssue(input.error);
  if (!issue) return { handled: false };

  logPrismaSchemaIssue(input.context, input.error, {
    domain: input.domain,
    issue,
    dedupe: true,
    emitEvent: false,
    classification: input.requirement
  });
  const detail = readErrorMessage(input.error);
  const code = readPrismaErrorCode(input.error);
  const table = extractPrismaTableReference(input.error);
  const actionHint = buildPrismaSchemaActionHint(issue);
  emitPrismaSchemaEvent({
    domain: input.domain,
    context: input.context,
    issue,
    classification: input.requirement,
    code,
    table,
    actionHint,
    detail
  });

  if (input.requirement === "REQUIRED") {
    return {
      handled: true,
      requirement: "REQUIRED",
      issue,
      error: new PrismaRequiredTableDependencyError({
        context: input.context,
        domain: input.domain,
        issue,
        detail
      })
    };
  }

  if (typeof input.fallback === "undefined") {
    throw new Error(`resolvePrismaSchemaFallback(${input.context}) requires fallback value for OPTIONAL requirement.`);
  }

  const value = typeof input.fallback === "function" ? (input.fallback as () => T)() : input.fallback;
  const notice =
    issue === "missing_table"
      ? "Fallback activo por tabla faltante."
      : "Fallback activo por esquema legacy (compatibilidad).";

  return {
    handled: true,
    requirement: "OPTIONAL",
    issue,
    source: "fallback",
    badge: "fallback",
    value,
    notice
  };
}

export function warnDevMissingTable(context: string, error: unknown) {
  logPrismaSchemaIssue(context, error, { issue: "missing_table", domain: "global", dedupe: false });
}
