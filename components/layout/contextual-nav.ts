export type ContextualNavItem = {
  id: string;
  label: string;
  href: string;
  matchPrefix?: string;
};

export type ContextualNavModule = {
  id: string;
  label: string;
  matchPrefixes: string[];
  items: ContextualNavItem[];
};

const CONTEXTUAL_MODULES: ContextualNavModule[] = [
  {
    id: "configuracion",
    label: "Configuracion",
    matchPrefixes: ["/admin/configuracion"],
    items: [
      { id: "inicio", label: "Inicio", href: "/admin/configuracion" },
      { id: "tema", label: "Tema", href: "/admin/configuracion/tema" },
      { id: "navegacion", label: "Navegacion", href: "/admin/configuracion/navegacion" },
      { id: "patentes", label: "Patentes", href: "/admin/configuracion/patentes" },
      { id: "facturacion", label: "Facturacion", href: "/admin/configuracion/facturacion" },
      { id: "servicios", label: "Servicios", href: "/admin/configuracion/servicios" },
      { id: "procesamiento", label: "Procesamiento", href: "/admin/configuracion/procesamiento" },
      { id: "seguridad", label: "Seguridad", href: "/admin/configuracion/seguridad" }
    ]
  },
  {
    id: "facturacion",
    label: "Facturacion",
    matchPrefixes: ["/admin/facturacion"],
    items: [
      { id: "dashboard", label: "Dashboard", href: "/admin/facturacion" },
      { id: "bandeja", label: "Bandeja", href: "/admin/facturacion/bandeja", matchPrefix: "/admin/facturacion/bandeja" },
      { id: "documentos", label: "Documentos", href: "/admin/facturacion/documentos" },
      { id: "caja", label: "Caja", href: "/admin/facturacion/caja" }
    ]
  },
  {
    id: "inventario",
    label: "Inventario",
    matchPrefixes: ["/admin/inventario"],
    items: [
      { id: "dashboard", label: "Dashboard", href: "/admin/inventario" },
      { id: "productos", label: "Productos", href: "/admin/inventario/productos" },
      { id: "servicios", label: "Servicios", href: "/admin/inventario/servicios" },
      { id: "combos", label: "Combos", href: "/admin/inventario/combos" },
      { id: "movimientos", label: "Movimientos", href: "/admin/inventario/movimientos" },
      { id: "solicitudes", label: "Solicitudes", href: "/admin/inventario/solicitudes", matchPrefix: "/admin/inventario/solicitudes" },
      { id: "ordenes", label: "Ordenes", href: "/admin/inventario/ordenes", matchPrefix: "/admin/inventario/ordenes" },
      { id: "configuracion", label: "Configuracion", href: "/admin/inventario/configuracion", matchPrefix: "/admin/inventario/configuracion" }
    ]
  },
  {
    id: "clientes",
    label: "Clientes",
    matchPrefixes: ["/admin/clientes"],
    items: [
      { id: "dashboard", label: "Dashboard", href: "/admin/clientes" },
      { id: "lista", label: "Lista", href: "/admin/clientes/lista" },
      { id: "personas", label: "Personas", href: "/admin/clientes/personas" },
      { id: "empresas", label: "Empresas", href: "/admin/clientes/empresas" },
      { id: "instituciones", label: "Instituciones", href: "/admin/clientes/instituciones" },
      { id: "aseguradoras", label: "Aseguradoras", href: "/admin/clientes/aseguradoras" },
      { id: "configuracion", label: "Configuracion", href: "/admin/clientes/configuracion" }
    ]
  },
  {
    id: "agenda",
    label: "Agenda",
    matchPrefixes: ["/admin/agenda"],
    items: [
      { id: "dashboard", label: "Dashboard", href: "/admin/agenda" },
      { id: "citas", label: "Citas", href: "/admin/agenda/citas" },
      { id: "configuracion", label: "Configuracion", href: "/admin/agenda/configuracion" }
    ]
  },
  {
    id: "usuarios",
    label: "Usuarios",
    matchPrefixes: ["/admin/usuarios"],
    items: [
      { id: "dashboard", label: "Dashboard", href: "/admin/usuarios" },
      { id: "lista", label: "Gestion", href: "/admin/usuarios/lista" },
      { id: "permisos", label: "Permisos", href: "/admin/usuarios/permisos" },
      { id: "configuracion", label: "Configuracion", href: "/admin/usuarios/configuracion" }
    ]
  },
  {
    id: "recepcion",
    label: "Recepcion",
    matchPrefixes: ["/admin/recepcion", "/admin/reception"],
    items: [
      { id: "dashboard", label: "Dashboard", href: "/admin/recepcion" },
      { id: "checkin", label: "Check-in", href: "/admin/recepcion/check-in" },
      { id: "appointments", label: "Citas", href: "/admin/recepcion/appointments" },
      { id: "availability", label: "Disponibilidad", href: "/admin/recepcion/availability" },
      { id: "queues", label: "Colas", href: "/admin/recepcion/queues" },
      { id: "registros", label: "Registros", href: "/admin/recepcion/registros" },
      { id: "incidents", label: "Incidentes", href: "/admin/recepcion/incidents" },
      { id: "settings", label: "Configuracion", href: "/admin/recepcion/settings" }
    ]
  },
  {
    id: "crm",
    label: "CRM",
    matchPrefixes: ["/admin/crm"],
    items: [
      { id: "dashboard", label: "Dashboard", href: "/admin/crm/dashboard" },
      { id: "list", label: "Lista", href: "/admin/crm/list" },
      { id: "pipeline", label: "Pipeline", href: "/admin/crm/pipeline" },
      { id: "inbox", label: "Inbox", href: "/admin/crm/inbox" },
      { id: "actividades", label: "Actividades", href: "/admin/crm/actividades" },
      { id: "calendario", label: "Calendario", href: "/admin/crm/calendario" },
      { id: "configuracion", label: "Configuracion", href: "/admin/crm/configuracion" }
    ]
  },
  {
    id: "membresias",
    label: "Membresias",
    matchPrefixes: ["/admin/membresias"],
    items: [
      { id: "dashboard", label: "Dashboard", href: "/admin/membresias" },
      { id: "contratos", label: "Contratos", href: "/admin/membresias/contratos" },
      { id: "planes", label: "Planes", href: "/admin/membresias/planes" },
      { id: "renovaciones", label: "Renovaciones", href: "/admin/membresias/renovaciones" },
      { id: "configuracion", label: "Configuracion", href: "/admin/membresias/configuracion" }
    ]
  },
  {
    id: "finanzas",
    label: "Finanzas",
    matchPrefixes: ["/admin/finanzas"],
    items: [
      { id: "dashboard", label: "Dashboard", href: "/admin/finanzas" },
      { id: "receivables", label: "Cobros", href: "/admin/finanzas/receivables" },
      { id: "journal", label: "Asientos", href: "/admin/finanzas/journal" },
      { id: "reportes", label: "Reportes", href: "/admin/finanzas/reportes" }
    ]
  },
  {
    id: "empresas",
    label: "Empresas",
    matchPrefixes: ["/admin/empresas"],
    items: [
      { id: "empresas", label: "Empresas", href: "/admin/empresas" },
      { id: "instituciones", label: "Instituciones", href: "/admin/empresas/instituciones" },
      { id: "aseguradoras", label: "Aseguradoras", href: "/admin/empresas/aseguradoras" }
    ]
  }
];

function normalizeToken(value: string) {
  return value.trim().toLowerCase();
}

function matchesPathPrefix(pathname: string, prefix: string) {
  if (pathname === prefix) return true;
  if (!pathname.startsWith(prefix)) return false;
  return pathname.charAt(prefix.length) === "/";
}

function contextualItemMatchesToken(item: ContextualNavItem, token: string) {
  const normalizedToken = normalizeToken(token);
  if (!normalizedToken) return false;

  const normalizedId = normalizeToken(item.id);
  if (normalizedId === normalizedToken) return true;

  const normalizedHref = normalizeToken(item.href);
  if (normalizedHref === normalizedToken) return true;

  const normalizedLabel = normalizeToken(item.label).replace(/\s+/g, "-");
  if (normalizedLabel === normalizedToken) return true;

  return false;
}

export function resolveContextualModule(pathnameInput: string | null | undefined): ContextualNavModule | null {
  const pathname = String(pathnameInput || "").trim();
  if (!pathname.startsWith("/admin")) return null;

  let selected: ContextualNavModule | null = null;
  let selectedPrefixLength = -1;

  CONTEXTUAL_MODULES.forEach((module) => {
    const prefix = module.matchPrefixes.find((entry) => matchesPathPrefix(pathname, entry));
    if (!prefix) return;
    if (prefix.length > selectedPrefixLength) {
      selected = module;
      selectedPrefixLength = prefix.length;
    }
  });

  return selected;
}

export function isContextualItemActive(pathnameInput: string | null | undefined, item: ContextualNavItem) {
  const pathname = String(pathnameInput || "").trim();
  if (!pathname) return false;

  const base = item.matchPrefix || item.href;
  if (!base) return false;
  return matchesPathPrefix(pathname, base);
}

export function applyPolicyOrderToContextualItems(items: ContextualNavItem[], policyOrder: string[] | null | undefined) {
  if (!Array.isArray(policyOrder) || policyOrder.length === 0) return [...items];

  const ordered: ContextualNavItem[] = [];
  const consumed = new Set<string>();

  policyOrder.forEach((token) => {
    const match = items.find((item) => !consumed.has(item.id) && contextualItemMatchesToken(item, token));
    if (!match) return;
    ordered.push(match);
    consumed.add(match.id);
  });

  items.forEach((item) => {
    if (!consumed.has(item.id)) ordered.push(item);
  });

  return ordered;
}
