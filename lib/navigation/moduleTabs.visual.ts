export type ModuleTabsVisualItem = {
  key: string;
  label: string;
};

export type ModuleTabsResolvedItem = ModuleTabsVisualItem & {
  href?: string;
  matchPrefix?: string;
  disabled?: boolean;
};

export const MODULE_TABS_VISUAL = {
  clientes: [
    { key: "dashboard", label: "Dashboard" },
    { key: "personas", label: "Personas" },
    { key: "empresas", label: "Empresas" },
    { key: "instituciones", label: "Instituciones" },
    { key: "aseguradoras", label: "Aseguradoras" },
    { key: "documentos", label: "Documentos" },
    { key: "configuracion", label: "Configuración" }
  ],
  crm: [
    { key: "dashboard", label: "Dashboard" },
    { key: "bandeja", label: "Bandeja" },
    { key: "pipeline", label: "Pipeline" },
    { key: "worklist", label: "Worklist" },
    { key: "calendario", label: "Calendario" },
    { key: "reportes", label: "Reportes" },
    { key: "configuracion", label: "Configuración" }
  ],
  membresias: [
    { key: "dashboard", label: "Dashboard" },
    { key: "gestion", label: "Gestión" },
    { key: "planes", label: "Planes" },
    { key: "renovaciones", label: "Renovaciones" },
    { key: "cobranza", label: "Cobranza" },
    { key: "configuracion", label: "Configuración" }
  ],
  suscripciones: [
    { key: "dashboard", label: "Dashboard" },
    { key: "membresias", label: "Membresías" },
    { key: "farmacia", label: "Farmacia" },
    { key: "pasarela", label: "Pasarela" },
    { key: "configuracion", label: "Configuración" }
  ],
  agenda: [
    { key: "dashboard", label: "Dashboard" },
    { key: "calendario", label: "Calendario" },
    { key: "citas", label: "Citas" },
    { key: "recursos", label: "Recursos" },
    { key: "configuracion", label: "Configuración" }
  ],
  recepcion: [
    { key: "dashboard", label: "Dashboard" },
    { key: "admision", label: "Admisión" },
    { key: "agenda", label: "Agenda / Citas" },
    { key: "operativa", label: "Lista operativa" },
    { key: "colas", label: "Colas" },
    { key: "registros", label: "Registros" },
    { key: "configuracion", label: "Configuración" }
  ],
  rrhh: [
    { key: "dashboard", label: "Dashboard" },
    { key: "empleados", label: "Empleados" },
    { key: "asistencia", label: "Asistencia" },
    { key: "nomina", label: "Nómina" },
    { key: "documentos", label: "Documentos" },
    { key: "ajustes", label: "Ajustes" }
  ],
  inventario: [
    { key: "dashboard", label: "Dashboard" },
    { key: "productos", label: "Productos" },
    { key: "servicios", label: "Servicios" },
    { key: "combos", label: "Combos / Paquetes" },
    { key: "movimientos", label: "Movimientos" },
    { key: "ordenes", label: "Órdenes" },
    { key: "configuracion", label: "Configuración" },
    { key: "reportes", label: "Reportes" }
  ],
  facturacion: [
    { key: "dashboard", label: "Dashboard" },
    { key: "bandejas", label: "Bandejas" },
    { key: "documentos", label: "Documentos" },
    { key: "caja", label: "Caja" },
    { key: "configuracion", label: "Configuración" }
  ],
  usuarios: [
    { key: "dashboard", label: "Dashboard" },
    { key: "usuarios", label: "Usuarios" },
    { key: "roles", label: "Roles y permisos" },
    { key: "sucursales", label: "Sucursales" },
    { key: "configuracion", label: "Configuración" }
  ],
  marcaje: [
    { key: "dashboard", label: "Dashboard" },
    { key: "marcajes", label: "Marcajes" },
    { key: "dispositivos", label: "Dispositivos" },
    { key: "tokens", label: "Tokens / Links" },
    { key: "incidencias", label: "Incidencias" },
    { key: "configuracion", label: "Configuración" },
    { key: "reportes", label: "Reportes" }
  ]
} as const;

export type ModuleKey = keyof typeof MODULE_TABS_VISUAL;

type ResolveOptions = {
  hrefs: Record<string, string | undefined>;
  matchPrefixes?: Record<string, string | undefined>;
  disabledKeys?: string[];
  extra?: ModuleTabsResolvedItem[];
};

export function resolveModuleTabs(module: ModuleKey, options: ResolveOptions): ModuleTabsResolvedItem[] {
  const { hrefs, matchPrefixes, disabledKeys, extra } = options;
  const disabledSet = new Set(disabledKeys ?? []);
  const resolved = MODULE_TABS_VISUAL[module].map((item) => {
    const href = hrefs[item.key];
    const disabled = disabledSet.has(item.key) || !href;
    const matchPrefix = matchPrefixes?.[item.key];
    return { ...item, href, disabled, matchPrefix };
  });
  return extra ? [...resolved, ...extra] : resolved;
}
