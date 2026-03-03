export function normalizeSubscriptionsErrorMessage(message: unknown, fallback: string) {
  const normalized = String(message || "").trim();
  if (!normalized) return fallback;
  if (/no autenticado|unauthenticated/i.test(normalized)) return "Sin datos disponibles";
  if (/no autorizado|forbidden|permiso/i.test(normalized)) return "Permisos insuficientes";
  return normalized;
}
