import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileBarChart2,
  FileText,
  FolderKanban,
  Gauge,
  HandCoins,
  Layers,
  List,
  MonitorCheck,
  Package,
  QrCode,
  ReceiptText,
  RefreshCw,
  Settings,
  Shield,
  ShoppingCart,
  SlidersHorizontal,
  Stethoscope,
  SquareKanban,
  Timer,
  UserCheck,
  UserRound,
  Users,
  UsersRound,
  Wallet
} from "lucide-react";

type ModuleMatchContext = {
  pathname: string;
  search: URLSearchParams;
};

export type ModuleNavItem = {
  key: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  matchPrefix?: string;
  preserveQueryKeys?: string[];
  isActive?: (ctx: ModuleMatchContext) => boolean;
  requiresConfigOpsView?: boolean;
  requiresConfigProcessingView?: boolean;
};

export type ModuleNavConfig = {
  moduleKey: string;
  moduleLabel: string;
  matchPrefixes: string[];
  items: ModuleNavItem[];
};

export const moduleNavRegistry: ModuleNavConfig[] = [
  {
    moduleKey: "configuracion",
    moduleLabel: "CONFIGURACION",
    matchPrefixes: ["/admin/configuracion"],
    items: [
      { key: "inicio", label: "Inicio", href: "/admin/configuracion", icon: Settings },
      { key: "tema", label: "Tema", href: "/admin/configuracion/tema", icon: SlidersHorizontal },
      { key: "navegacion", label: "Navegación", href: "/admin/configuracion/navegacion", icon: List },
      { key: "patentes", label: "Patentes", href: "/admin/configuracion/patentes", icon: FileText },
      { key: "facturacion", label: "Facturación", href: "/admin/configuracion/facturacion", icon: CreditCard },
      { key: "servicios", label: "Servicios", href: "/admin/configuracion/servicios", icon: Activity },
      {
        key: "procesamiento",
        label: "Procesamiento",
        href: "/admin/configuracion/procesamiento",
        icon: Layers,
        requiresConfigProcessingView: true
      },
      { key: "seguridad", label: "Seguridad", href: "/admin/configuracion/seguridad", icon: Shield }
    ]
  },
  {
    moduleKey: "facturacion",
    moduleLabel: "FACTURACION",
    matchPrefixes: ["/admin/facturacion"],
    items: [
      { key: "dashboard", label: "Dashboard", href: "/admin/facturacion", icon: Gauge },
      { key: "bandeja", label: "Bandeja", href: "/admin/facturacion/bandeja", matchPrefix: "/admin/facturacion/bandeja", icon: ClipboardList },
      { key: "documentos", label: "Documentos", href: "/admin/facturacion/documentos", icon: FileText },
      { key: "caja", label: "Caja", href: "/admin/facturacion/caja", icon: Wallet }
    ]
  },
  {
    moduleKey: "inventario",
    moduleLabel: "INVENTARIO",
    matchPrefixes: ["/admin/inventario"],
    items: [
      { key: "dashboard", label: "Dashboard", href: "/admin/inventario", icon: Gauge },
      { key: "productos", label: "Productos", href: "/admin/inventario/productos", icon: Package },
      { key: "servicios", label: "Servicios", href: "/admin/inventario/servicios", icon: BriefcaseBusiness },
      { key: "combos", label: "Combos", href: "/admin/inventario/combos", icon: Layers },
      { key: "movimientos", label: "Movimientos", href: "/admin/inventario/movimientos", icon: RefreshCw },
      { key: "solicitudes", label: "Solicitudes", href: "/admin/inventario/solicitudes", matchPrefix: "/admin/inventario/solicitudes", icon: FileText },
      { key: "ordenes", label: "Ordenes", href: "/admin/inventario/ordenes", matchPrefix: "/admin/inventario/ordenes", icon: ShoppingCart },
      { key: "configuracion", label: "Configuracion", href: "/admin/inventario/configuracion", matchPrefix: "/admin/inventario/configuracion", icon: Settings }
    ]
  },
  {
    moduleKey: "clientes",
    moduleLabel: "CLIENTES",
    matchPrefixes: ["/admin/clientes"],
    items: [
      { key: "dashboard", label: "Dashboard", href: "/admin/clientes", icon: Gauge },
      { key: "lista", label: "Lista", href: "/admin/clientes/lista", icon: List },
      { key: "personas", label: "Personas", href: "/admin/clientes/personas", icon: UserRound },
      { key: "empresas", label: "Empresas", href: "/admin/clientes/empresas", icon: Building2 },
      { key: "instituciones", label: "Instituciones", href: "/admin/clientes/instituciones", icon: BriefcaseBusiness },
      { key: "aseguradoras", label: "Aseguradoras", href: "/admin/clientes/aseguradoras", icon: Shield },
      {
        key: "configuracion",
        label: "Configuracion",
        href: "/admin/clientes/configuracion",
        icon: Settings,
        isActive: ({ pathname }) => pathname.startsWith("/admin/clientes/configuracion")
      },
      { key: "reportes", label: "Reportes", href: "/admin/clientes/reportes", icon: BarChart3 }
    ]
  },
  {
    moduleKey: "agenda",
    moduleLabel: "AGENDA",
    matchPrefixes: ["/admin/agenda"],
    items: [
      { key: "dashboard", label: "Dashboard", href: "/admin/agenda", icon: Gauge },
      { key: "citas", label: "Citas", href: "/admin/agenda/citas", icon: CalendarDays },
      { key: "configuracion", label: "Configuracion", href: "/admin/agenda/configuracion", icon: Settings }
    ]
  },
  {
    moduleKey: "usuarios",
    moduleLabel: "USUARIOS",
    matchPrefixes: ["/admin/usuarios"],
    items: [
      { key: "dashboard", label: "Dashboard", href: "/admin/usuarios", icon: Gauge },
      { key: "lista", label: "Gestion", href: "/admin/usuarios/lista", icon: UsersRound },
      { key: "permisos", label: "Permisos", href: "/admin/usuarios/permisos", icon: Shield },
      { key: "configuracion", label: "Configuracion", href: "/admin/usuarios/configuracion", icon: Settings }
    ]
  },
  {
    moduleKey: "crm",
    moduleLabel: "CRM",
    matchPrefixes: ["/admin/crm"],
    items: [
      { key: "dashboard", label: "Dashboard", href: "/admin/crm/dashboard", icon: Gauge, preserveQueryKeys: ["type"] },
      { key: "list", label: "Lista", href: "/admin/crm/list", icon: List, preserveQueryKeys: ["type"] },
      { key: "pipeline", label: "Pipeline", href: "/admin/crm/pipeline", icon: SquareKanban, preserveQueryKeys: ["type"] },
      { key: "inbox", label: "Inbox", href: "/admin/crm/inbox", icon: FolderKanban, preserveQueryKeys: ["type"] },
      { key: "actividades", label: "Actividades", href: "/admin/crm/actividades", icon: Activity, preserveQueryKeys: ["type"] },
      { key: "calendario", label: "Calendario", href: "/admin/crm/calendario", icon: CalendarDays, preserveQueryKeys: ["type"] },
      { key: "configuracion", label: "Configuracion", href: "/admin/crm/configuracion", icon: Settings, preserveQueryKeys: ["type"] }
    ]
  },
  {
    moduleKey: "recepcion",
    moduleLabel: "RECEPCIÓN",
    matchPrefixes: ["/admin/reception"],
    items: [
      { key: "dashboard", label: "Dashboard", href: "/admin/reception/dashboard", icon: Gauge },
      { key: "checkin", label: "Check-in", href: "/admin/reception/check-in", icon: QrCode },
      { key: "appointments", label: "Citas", href: "/admin/reception/appointments", icon: CalendarDays },
      { key: "availability", label: "Disponibilidad", href: "/admin/reception/availability", icon: Timer },
      { key: "queues", label: "Colas", href: "/admin/reception/queues", icon: UsersRound },
      { key: "cashier", label: "Caja", href: "/admin/reception/caja", icon: Wallet },
      { key: "registros", label: "Registros", href: "/admin/reception/registros", icon: ClipboardList },
      { key: "incidents", label: "Incidentes", href: "/admin/reception/incidents", icon: Stethoscope },
      { key: "worklist", label: "Worklist", href: "/admin/reception/worklist", icon: UserCheck },
      { key: "settings", label: "Configuracion", href: "/admin/reception/settings", icon: Settings },
      { key: "monitor", label: "Turnos", href: "/display/turnos", icon: MonitorCheck }
    ]
  },
  {
    moduleKey: "membresias",
    moduleLabel: "MEMBRESIAS",
    matchPrefixes: ["/admin/membresias"],
    items: [
      { key: "dashboard", label: "Dashboard", href: "/admin/membresias", icon: Gauge },
      { key: "contratos", label: "Contratos", href: "/admin/membresias/contratos/pacientes", matchPrefix: "/admin/membresias/contratos", icon: FileText },
      { key: "planes", label: "Planes", href: "/admin/membresias/planes", icon: Layers },
      { key: "renovaciones", label: "Renovaciones", href: "/admin/membresias/renovaciones", icon: RefreshCw },
      { key: "configuracion", label: "Configuracion", href: "/admin/membresias/configuracion", icon: Settings }
    ]
  },
  {
    moduleKey: "finanzas",
    moduleLabel: "FINANZAS",
    matchPrefixes: ["/admin/finanzas"],
    items: [
      { key: "dashboard", label: "Dashboard", href: "/admin/finanzas", icon: Gauge },
      { key: "receivables", label: "Cobros", href: "/admin/finanzas/receivables", icon: HandCoins },
      { key: "journal", label: "Asientos", href: "/admin/finanzas/journal", icon: ReceiptText },
      { key: "reportes", label: "Reportes", href: "/admin/finanzas/reportes", icon: FileBarChart2 }
    ]
  },
  {
    moduleKey: "empresas",
    moduleLabel: "EMPRESAS",
    matchPrefixes: ["/admin/empresas"],
    items: [
      { key: "empresas", label: "Empresas", href: "/admin/empresas", icon: Building2 },
      { key: "instituciones", label: "Instituciones", href: "/admin/empresas/instituciones", icon: BriefcaseBusiness },
      { key: "aseguradoras", label: "Aseguradoras", href: "/admin/empresas/aseguradoras", icon: Shield }
    ]
  },
  {
    moduleKey: "permissions",
    moduleLabel: "PERMISOS",
    matchPrefixes: ["/admin/permissions"],
    items: [
      { key: "permisos", label: "Permisos", href: "/admin/permissions", icon: Shield }
    ]
  },
  {
    moduleKey: "portales",
    moduleLabel: "PORTALES",
    matchPrefixes: ["/admin/portales"],
    items: [
      { key: "portales", label: "Portal", href: "/admin/portales", icon: Users }
    ]
  }
];

function matchesPathPrefix(pathname: string, prefix: string) {
  if (pathname === prefix) return true;
  if (!pathname.startsWith(prefix)) return false;
  return pathname.charAt(prefix.length) === "/";
}

export function resolveModuleNavConfig(
  pathnameInput: string | null | undefined,
  options?: {
    canAccessConfigOps?: boolean;
    canAccessConfigProcessing?: boolean;
  }
): ModuleNavConfig | null {
  const pathname = String(pathnameInput || "").trim();
  if (!pathname.startsWith("/admin")) return null;

  let selected: ModuleNavConfig | null = null;
  let selectedLength = -1;

  for (const moduleConfig of moduleNavRegistry) {
    const match = moduleConfig.matchPrefixes.find((prefix) => matchesPathPrefix(pathname, prefix));
    if (!match) continue;
    if (match.length > selectedLength) {
      selected = moduleConfig;
      selectedLength = match.length;
    }
  }

  if (!selected) return null;

  const canAccessConfigOps = options?.canAccessConfigOps ?? false;
  const canAccessConfigProcessing = options?.canAccessConfigProcessing ?? false;
  const filteredItems = selected.items.filter((item) => {
    if (item.requiresConfigOpsView && !canAccessConfigOps) return false;
    if (item.requiresConfigProcessingView && !canAccessConfigProcessing) return false;
    return true;
  });

  return {
    ...selected,
    items: filteredItems
  };
}
