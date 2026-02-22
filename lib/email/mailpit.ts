import {
  EmailSandboxSettingsSnapshot,
  normalizeTenantId,
  tenantSlugFromId
} from "@/lib/email/sandbox-config";

export type MailpitInboxSummary = {
  id: string;
  messageId: string | null;
  subject: string;
  createdAt: string | null;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  snippet: string;
  size: number;
  attachmentsCount: number;
  tenantId: string | null;
  env: string | null;
  module: string | null;
  read: boolean;
};

export type MailpitInboxDetail = {
  id: string;
  messageId: string | null;
  subject: string;
  date: string | null;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  text: string | null;
  html: string | null;
  headers: Record<string, string[]>;
  attachmentsBlocked: true;
  attachmentsNotice: string;
  tenantId: string | null;
  env: string | null;
  module: string | null;
  size: number;
};

export class MailpitRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "MailpitRequestError";
    this.status = status;
    this.code = code;
  }
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parseAddress(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    const candidate = value as { Address?: unknown; address?: unknown; Name?: unknown; name?: unknown };
    const address = readString(candidate.Address) || readString(candidate.address);
    const name = readString(candidate.Name) || readString(candidate.name);
    if (name && address) return `${name} <${address}>`;
    return address || name;
  }
  return "";
}

function parseAddressList(value: unknown): string[] {
  return toArray(value)
    .map((item) => parseAddress(item))
    .filter(Boolean);
}

function parseAddressEmails(value: unknown): string[] {
  return toArray(value)
    .map((item) => {
      if (!item) return "";
      if (typeof item === "string") return item.trim();
      if (typeof item === "object") {
        const candidate = item as { Address?: unknown; address?: unknown };
        return readString(candidate.Address) || readString(candidate.address);
      }
      return "";
    })
    .filter(Boolean);
}

function parseHeaders(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>).map(([key, headerValue]) => {
    if (Array.isArray(headerValue)) {
      return [key, headerValue.map((item) => String(item)).filter(Boolean)] as const;
    }
    if (headerValue == null) {
      return [key, []] as const;
    }
    return [key, [String(headerValue)]] as const;
  });
  return Object.fromEntries(entries);
}

function getHeaderValues(headers: Record<string, string[]>, key: string): string[] {
  const target = key.toLowerCase();
  const match = Object.entries(headers).find(([headerKey]) => headerKey.toLowerCase() === target);
  return match?.[1] || [];
}

function getFirstHeaderValue(headers: Record<string, string[]>, key: string): string | null {
  const first = getHeaderValues(headers, key)[0];
  if (!first) return null;
  return String(first).trim() || null;
}

function parseDate(value: unknown) {
  const dateValue = readString(value).trim();
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function getId(message: any) {
  return readString(message?.ID || message?.id || message?.messageId || message?.MessageID);
}

function parseAttachmentsCount(summary: any): number {
  if (typeof summary?.Attachments === "number") return summary.Attachments;
  if (typeof summary?.attachments === "number") return summary.attachments;
  if (Array.isArray(summary?.Attachments)) return summary.Attachments.length;
  if (Array.isArray(summary?.attachments)) return summary.attachments.length;
  return 0;
}

function pickTenantId(headers: Record<string, string[]>) {
  const fromHeader = getFirstHeaderValue(headers, "X-Tenant-Id");
  if (fromHeader) return normalizeTenantId(fromHeader);
  return null;
}

function parseAliasTenantId(address: string, aliasDomain: string): string | null {
  const normalizedAddress = String(address || "").trim().toLowerCase();
  const normalizedDomain = String(aliasDomain || "").trim().toLowerCase();
  const suffix = `@${normalizedDomain}`;
  if (!normalizedAddress.endsWith(suffix)) return null;
  const localPart = normalizedAddress.slice(0, -suffix.length);
  const plusIndex = localPart.indexOf("+");
  if (plusIndex <= 0) return null;
  const tenantSlug = localPart.slice(0, plusIndex).trim();
  return tenantSlug || null;
}

function matchesTenantAlias(addresses: string[], tenantId: string, aliasDomain: string) {
  const tenantSlug = tenantSlugFromId(tenantId);
  return addresses.some((address) => {
    const aliasTenant = parseAliasTenantId(address, aliasDomain);
    return aliasTenant === tenantSlug;
  });
}

function resolveMessageTenant(headers: Record<string, string[]>, toEmails: string[], aliasDomain: string): string | null {
  const byHeader = pickTenantId(headers);
  if (byHeader) return byHeader;
  const byAlias = toEmails
    .map((address) => parseAliasTenantId(address, aliasDomain))
    .find((value): value is string => Boolean(value));
  return byAlias || null;
}

function messageBelongsToTenant(params: {
  tenantId: string;
  headers: Record<string, string[]>;
  toEmails: string[];
  aliasDomain: string;
}) {
  const headerTenantId = pickTenantId(params.headers);
  if (headerTenantId) {
    return headerTenantId === normalizeTenantId(params.tenantId);
  }
  return matchesTenantAlias(params.toEmails, params.tenantId, params.aliasDomain);
}

function normalizeSummary(summary: any, headers: Record<string, string[]>, aliasDomain: string): MailpitInboxSummary {
  const id = getId(summary);
  const toList = parseAddressList(summary?.To ?? summary?.to);
  const ccList = parseAddressList(summary?.Cc ?? summary?.cc);
  const bccList = parseAddressList(summary?.Bcc ?? summary?.bcc);
  const toEmails = parseAddressEmails(summary?.To ?? summary?.to);

  return {
    id,
    messageId: readString(summary?.MessageID || summary?.messageId || summary?.messageID) || null,
    subject: readString(summary?.Subject || summary?.subject || "(sin asunto)") || "(sin asunto)",
    createdAt: parseDate(summary?.Created || summary?.created || summary?.Date || summary?.date),
    from: parseAddress(summary?.From ?? summary?.from),
    to: toList,
    cc: ccList,
    bcc: bccList,
    snippet: readString(summary?.Snippet || summary?.snippet),
    size: Number(summary?.Size || summary?.size || 0),
    attachmentsCount: parseAttachmentsCount(summary),
    tenantId: resolveMessageTenant(headers, toEmails, aliasDomain),
    env: getFirstHeaderValue(headers, "X-Env"),
    module: getFirstHeaderValue(headers, "X-Module"),
    read: Boolean(summary?.Read || summary?.read)
  };
}

function normalizeDetail(
  detail: any,
  headers: Record<string, string[]>,
  aliasDomain: string
): MailpitInboxDetail {
  const toList = parseAddressList(detail?.To ?? detail?.to);
  const ccList = parseAddressList(detail?.Cc ?? detail?.cc);
  const bccList = parseAddressList(detail?.Bcc ?? detail?.bcc);
  const toEmails = parseAddressEmails(detail?.To ?? detail?.to);

  return {
    id: getId(detail),
    messageId: readString(detail?.MessageID || detail?.messageId || detail?.messageID) || null,
    subject: readString(detail?.Subject || detail?.subject || "(sin asunto)") || "(sin asunto)",
    date: parseDate(detail?.Date || detail?.date || detail?.Created || detail?.created),
    from: parseAddress(detail?.From ?? detail?.from),
    to: toList,
    cc: ccList,
    bcc: bccList,
    text: readString(detail?.Text || detail?.text) || null,
    html: readString(detail?.HTML || detail?.html) || null,
    headers,
    attachmentsBlocked: true,
    attachmentsNotice: "bloqueado por seguridad",
    tenantId: resolveMessageTenant(headers, toEmails, aliasDomain),
    env: getFirstHeaderValue(headers, "X-Env"),
    module: getFirstHeaderValue(headers, "X-Module"),
    size: Number(detail?.Size || detail?.size || 0)
  };
}

async function fetchMailpitJson(
  settings: EmailSandboxSettingsSnapshot,
  path: string,
  init?: RequestInit,
  timeoutMs = 8_000
) {
  const base = `http://${settings.mailpitHost}:${settings.mailpitApiPort}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {})
      }
    });

    const raw = await response.text();
    let payload: any = {};
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = {};
      }
    }
    if (!response.ok) {
      const message = (payload && typeof payload.error === "string" ? payload.error : "Mailpit request failed") ||
        "Mailpit request failed";
      throw new MailpitRequestError(response.status, "MAILPIT_ERROR", message);
    }

    return payload;
  } catch (error: any) {
    if (error instanceof MailpitRequestError) throw error;
    if (error?.name === "AbortError") {
      throw new MailpitRequestError(503, "MAILPIT_TIMEOUT", "Timeout consultando Mailpit.");
    }
    throw new MailpitRequestError(503, "MAILPIT_UNAVAILABLE", "No se pudo conectar con Mailpit.");
  } finally {
    clearTimeout(timer);
  }
}

export async function listTenantMessages(params: {
  settings: EmailSandboxSettingsSnapshot;
  tenantId: string;
  limit: number;
  start: number;
}) {
  const tenantId = normalizeTenantId(params.tenantId);
  const tenantSlug = tenantSlugFromId(tenantId);
  const query = encodeURIComponent(`${tenantSlug}+`);
  const payload = await fetchMailpitJson(
    params.settings,
    `/api/v1/search?query=${query}&start=${params.start}&limit=${params.limit}`
  );
  const rawMessages = Array.isArray(payload?.messages) ? payload.messages : [];

  const normalized: MailpitInboxSummary[] = [];

  for (const rawMessage of rawMessages) {
    const messageId = getId(rawMessage);
    if (!messageId) continue;
    const headers = await getMessageHeaders(params.settings, messageId).catch(() => ({}));
    const toEmails = parseAddressEmails(rawMessage?.To ?? rawMessage?.to);
    if (
      !messageBelongsToTenant({
        tenantId,
        headers,
        toEmails,
        aliasDomain: params.settings.aliasDomain
      })
    ) {
      continue;
    }

    normalized.push(normalizeSummary(rawMessage, headers, params.settings.aliasDomain));
  }

  return normalized;
}

export async function getTenantMessageDetail(params: {
  settings: EmailSandboxSettingsSnapshot;
  tenantId: string;
  id: string;
}) {
  const tenantId = normalizeTenantId(params.tenantId);
  const detail = await fetchMailpitJson(params.settings, `/api/v1/message/${encodeURIComponent(params.id)}`);
  const headers = await getMessageHeaders(params.settings, params.id).catch(() => ({}));
  const toEmails = parseAddressEmails(detail?.To ?? detail?.to);

  if (
    !messageBelongsToTenant({
      tenantId,
      headers,
      toEmails,
      aliasDomain: params.settings.aliasDomain
    })
  ) {
    return null;
  }

  return normalizeDetail(detail, headers, params.settings.aliasDomain);
}

export async function getMessageHeaders(settings: EmailSandboxSettingsSnapshot, id: string) {
  const payload = await fetchMailpitJson(settings, `/api/v1/message/${encodeURIComponent(id)}/headers`);
  return parseHeaders(payload);
}

export async function deleteMessages(settings: EmailSandboxSettingsSnapshot, ids: string[]) {
  const cleanIds = ids.map((id) => String(id).trim()).filter(Boolean);
  if (cleanIds.length === 0) return;
  await fetchMailpitJson(settings, `/api/v1/messages`, {
    method: "DELETE",
    body: JSON.stringify({ IDs: cleanIds })
  }).catch(() => undefined);
}

export function isMessageExpired(messageIsoDate: string | null, retentionDays: number) {
  if (!messageIsoDate) return false;
  if (!Number.isInteger(retentionDays) || retentionDays <= 0) return false;
  const createdAt = new Date(messageIsoDate);
  if (Number.isNaN(createdAt.getTime())) return false;
  const threshold = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  return createdAt.getTime() < threshold;
}
