export type HomeQuickActionKey =
  | "reception_checkin"
  | "reception_queues"
  | "billing_tray"
  | "billing_cashier"
  | "agenda_appointments"
  | "diagnostics_orders"
  | "clients_search"
  | "memberships_contracts"
  | "users_list";

export type HomeKpiKey =
  | "users_active"
  | "appointments_today"
  | "in_service_now"
  | "queue_operational"
  | "diagnostic_orders_today"
  | "memberships_active"
  | "clients_registered"
  | "branches_active";

export type HomeDashboardSettings = {
  quickActionKeys: HomeQuickActionKey[];
  kpiKeys: HomeKpiKey[];
};

export const HOME_QUICK_ACTION_CATALOG: Array<{
  key: HomeQuickActionKey;
  label: string;
  description: string;
  href: string;
  module: string;
  requiresReception?: boolean;
}> = [
  {
    key: "reception_checkin",
    label: "Check-in",
    description: "Ingreso rapido de paciente.",
    href: "/admin/reception/check-in",
    module: "Recepcion",
    requiresReception: true
  },
  {
    key: "reception_queues",
    label: "Colas",
    description: "Turnos en espera y llamados.",
    href: "/admin/reception/queues",
    module: "Recepcion",
    requiresReception: true
  },
  {
    key: "billing_tray",
    label: "Bandeja de cobro",
    description: "Casos listos para facturar.",
    href: "/admin/facturacion/bandeja",
    module: "Facturacion"
  },
  {
    key: "billing_cashier",
    label: "Caja",
    description: "Cobros y movimientos del turno.",
    href: "/admin/facturacion/caja",
    module: "Facturacion"
  },
  {
    key: "agenda_appointments",
    label: "Citas",
    description: "Crear y gestionar agenda diaria.",
    href: "/admin/agenda/citas",
    module: "Agenda"
  },
  {
    key: "diagnostics_orders",
    label: "Ordenes diagnostico",
    description: "Recepcion y seguimiento de ordenes.",
    href: "/diagnostics/orders",
    module: "Diagnostico"
  },
  {
    key: "clients_search",
    label: "Buscar cliente",
    description: "Acceso directo a ficha.",
    href: "/admin/clientes/buscar",
    module: "Clientes"
  },
  {
    key: "memberships_contracts",
    label: "Contratos membresia",
    description: "Renovaciones y pendientes.",
    href: "/admin/suscripciones/membresias/afiliaciones/pacientes",
    module: "Suscripciones"
  },
  {
    key: "users_list",
    label: "Usuarios",
    description: "Gestion de acceso y perfiles.",
    href: "/admin/usuarios/lista",
    module: "Usuarios"
  }
];

export const HOME_KPI_CATALOG: Array<{
  key: HomeKpiKey;
  label: string;
  tone: "primary" | "info" | "ok" | "warning";
  helperGlobal: string;
  helperBranch: string;
}> = [
  {
    key: "users_active",
    label: "Usuarios activos",
    tone: "primary",
    helperGlobal: "Cuentas habilitadas para operar",
    helperBranch: "Equipo activo en sucursal"
  },
  {
    key: "appointments_today",
    label: "Citas de hoy",
    tone: "ok",
    helperGlobal: "Agenda clinica no cancelada",
    helperBranch: "Agenda de tu sucursal"
  },
  {
    key: "in_service_now",
    label: "En atencion ahora",
    tone: "primary",
    helperGlobal: "Pacientes en servicio",
    helperBranch: "Pacientes en servicio (sucursal)"
  },
  {
    key: "queue_operational",
    label: "Turnos en operacion",
    tone: "warning",
    helperGlobal: "En cola, llamados o en servicio",
    helperBranch: "Cola activa de tu sucursal"
  },
  {
    key: "diagnostic_orders_today",
    label: "Ordenes diagnosticas hoy",
    tone: "info",
    helperGlobal: "Ordenes emitidas hoy",
    helperBranch: "Ordenes del dia en sucursal"
  },
  {
    key: "memberships_active",
    label: "Membresias activas",
    tone: "ok",
    helperGlobal: "Contratos con estado ACTIVO",
    helperBranch: "Contratos activos de sucursal"
  },
  {
    key: "clients_registered",
    label: "Clientes registrados",
    tone: "info",
    helperGlobal: "Perfiles activos (dato global)",
    helperBranch: "Perfiles activos (dato global)"
  },
  {
    key: "branches_active",
    label: "Sucursales activas",
    tone: "ok",
    helperGlobal: "Sedes operativas configuradas (global)",
    helperBranch: "Sedes operativas configuradas (global)"
  }
];

export const DEFAULT_HOME_DASHBOARD_SETTINGS: HomeDashboardSettings = {
  quickActionKeys: HOME_QUICK_ACTION_CATALOG.map((item) => item.key),
  kpiKeys: HOME_KPI_CATALOG.map((item) => item.key)
};

export function normalizeHomeDashboardSettings(input: unknown): HomeDashboardSettings {
  const raw = (input || {}) as Partial<HomeDashboardSettings>;
  const allowedQuick = new Set<HomeQuickActionKey>(HOME_QUICK_ACTION_CATALOG.map((item) => item.key));
  const allowedKpis = new Set<HomeKpiKey>(HOME_KPI_CATALOG.map((item) => item.key));

  const quickActionKeys = Array.from(
    new Set(
      (Array.isArray(raw.quickActionKeys) ? raw.quickActionKeys : [])
        .map((item) => String(item))
        .filter((item): item is HomeQuickActionKey => allowedQuick.has(item as HomeQuickActionKey))
    )
  );

  const kpiKeys = Array.from(
    new Set(
      (Array.isArray(raw.kpiKeys) ? raw.kpiKeys : [])
        .map((item) => String(item))
        .filter((item): item is HomeKpiKey => allowedKpis.has(item as HomeKpiKey))
    )
  );

  return {
    quickActionKeys: quickActionKeys.length ? quickActionKeys : [...DEFAULT_HOME_DASHBOARD_SETTINGS.quickActionKeys],
    kpiKeys: kpiKeys.length ? kpiKeys : [...DEFAULT_HOME_DASHBOARD_SETTINGS.kpiKeys]
  };
}
