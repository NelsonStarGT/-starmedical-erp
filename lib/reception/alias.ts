export const RECEPTION_ALIAS_PREFIX = "/admin/recepcion";
export const RECEPTION_CANONICAL_PREFIX = "/admin/reception";

const RECEPTION_SEGMENT_MAP: Record<string, string> = {
  cola: "queues",
  citas: "appointments",
  admisiones: "check-in",
  caja: "caja",
  dashboard: "dashboard",
  "check-in": "check-in",
  appointments: "appointments",
  availability: "availability",
  queues: "queues",
  registros: "registros",
  incidents: "incidents",
  worklist: "worklist",
  settings: "settings",
  companies: "companies",
  "solicitudes-portal": "solicitudes-portal",
  visit: "visit"
};

export function resolveReceptionAliasPath(pathname: string): string | null {
  if (pathname === RECEPTION_ALIAS_PREFIX) return `${RECEPTION_CANONICAL_PREFIX}/dashboard`;
  if (!pathname.startsWith(`${RECEPTION_ALIAS_PREFIX}/`)) return null;

  const suffix = pathname.slice(RECEPTION_ALIAS_PREFIX.length + 1);
  if (!suffix) return `${RECEPTION_CANONICAL_PREFIX}/dashboard`;

  const segments = suffix.split("/").filter(Boolean);
  if (segments.length === 0) return `${RECEPTION_CANONICAL_PREFIX}/dashboard`;

  const [firstSegment, ...remaining] = segments;
  const mappedFirstSegment = RECEPTION_SEGMENT_MAP[firstSegment] ?? firstSegment;
  const mappedPath = [mappedFirstSegment, ...remaining].join("/");
  return `${RECEPTION_CANONICAL_PREFIX}/${mappedPath}`;
}
