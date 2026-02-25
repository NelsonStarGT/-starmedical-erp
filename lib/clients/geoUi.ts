export function isGeoAuthErrorLike(input: unknown): boolean {
  const message = typeof input === "string" ? input : "";
  const normalized = message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return normalized.includes("no autenticado") || normalized.includes("no autorizado");
}

export function mapGeoLoadErrorMessage(input: unknown, fallback: string): string {
  const message = typeof input === "string" ? input.trim() : "";
  if (isGeoAuthErrorLike(message)) {
    return "No se pudo cargar geografia. Verifica tu sesion y recarga la pagina.";
  }
  return message || fallback;
}

export function sanitizeGeoDivisionDisplayName(name: string, code?: string | null): string {
  const safeName = (name || "").trim();
  const safeCode = (code || "").trim();
  if (!safeName || !safeCode) return safeName;

  const codePattern = new RegExp(`\\s+${safeCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  return safeName.replace(codePattern, "").trim();
}
