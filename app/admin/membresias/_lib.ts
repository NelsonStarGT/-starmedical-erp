export async function safeFetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    },
    cache: "no-store"
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "No se pudo obtener información");
  return json as T;
}

export function money(amount: number | null | undefined, currency = "GTQ") {
  const value = Number(amount || 0);
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

export function dateLabel(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-GT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function contractStatusBadgeClass(status: string) {
  if (status === "ACTIVO") return "bg-emerald-100 text-emerald-700";
  if (status === "PENDIENTE") return "bg-amber-100 text-amber-700";
  if (status === "PENDIENTE_PAGO") return "bg-amber-100 text-amber-800";
  if (status === "SUSPENDIDO") return "bg-rose-100 text-rose-700";
  if (status === "VENCIDO") return "bg-slate-200 text-slate-700";
  if (status === "CANCELADO") return "bg-slate-300 text-slate-700";
  return "bg-slate-100 text-slate-700";
}
