import {
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ClipboardList,
  Clock3,
  FlaskConical,
  Bug,
  HeartPulse,
  Home,
  IdCard,
  LayoutGrid,
  MessageCircleMore,
  Settings,
  ShieldCheck,
  Users,
  Users2,
  ListChecks,
  type LucideIcon
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  disabled?: boolean;
  icon?: LucideIcon;
  tooltip?: string;
  children?: NavItem[];
  requiresReception?: boolean;
  requiresMedicalCommissions?: boolean;
  requiresMedicalOperations?: boolean;
  requiresMedicalConfig?: boolean;
  requiresPortales?: boolean;
  requiresConfigOpsView?: boolean;
  requiresConfigProcessingView?: boolean;
};

export type NavSection = {
  sectionLabel: string;
  items: NavItem[];
};

// Fuente única de verdad para navegación principal
export const navSections: NavSection[] = [
  {
    sectionLabel: "Comercial",
    items: [
      { label: "Inicio", href: "/admin", icon: Home },
      {
        label: "Clientes",
        href: "/admin/clientes/personas",
        icon: Users2
      },
      {
        label: "Empresas",
        href: "/admin/empresas",
        icon: Building2,
        children: [
          { label: "Empresas", href: "/admin/empresas" },
          { label: "Instituciones", href: "/admin/empresas/instituciones" },
          { label: "Aseguradoras", href: "/admin/empresas/aseguradoras" }
        ]
      },
      { label: "CRM", href: "/admin/crm", icon: BriefcaseBusiness },
      { label: "Membresías", href: "/admin/membresias", icon: IdCard },
      { label: "Agenda", href: "/admin/agenda", icon: CalendarDays }
    ]
  },
  {
    sectionLabel: "Administración",
    items: [
      { label: "Usuarios", href: "/admin/usuarios", icon: Users },
      { label: "Recepción", href: "/admin/recepcion", icon: ListChecks, requiresReception: true },
      { label: "RRHH", href: "/hr", icon: Users2 },
      { label: "Inventario", href: "/admin/inventario", icon: LayoutGrid },
      { label: "Finanzas", href: "/admin/finanzas", icon: Banknote },
      { label: "Marcaje", href: "/marcaje", icon: Clock3 },
      { label: "Facturación", href: "/admin/facturacion", icon: ClipboardList },
      {
        label: "Portales",
        href: "/admin/portales",
        icon: ShieldCheck,
        tooltip: "Control center Portal Paciente/Empresa",
        requiresPortales: true
      },
      {
        label: "Configuración",
        href: "/admin/configuracion",
        icon: Settings,
        children: [
          { label: "Inicio", href: "/admin/configuracion" },
          { label: "Tema", href: "/admin/configuracion/tema" },
          { label: "Navegación", href: "/admin/configuracion/navegacion" },
          { label: "Patentes", href: "/admin/configuracion/patentes" },
          { label: "Facturación", href: "/admin/configuracion/facturacion" },
          { label: "Servicios", href: "/admin/configuracion/servicios" },
          {
            label: "Procesamiento",
            href: "/admin/configuracion/procesamiento",
            requiresConfigProcessingView: true
          },
          { label: "Seguridad", href: "/admin/configuracion/seguridad" },
          {
            label: "Operaciones",
            href: "/admin/configuracion/operaciones",
            requiresConfigOpsView: true
          }
        ]
      }
    ]
  },
  {
    sectionLabel: "Médico",
    items: [
      {
        label: "Módulo médico",
        href: "/modulo-medico/dashboard",
        icon: HeartPulse,
        children: [
          { label: "Dashboard", href: "/modulo-medico/dashboard" },
          { label: "Mis pacientes", href: "/modulo-medico/agenda" },
          { label: "Diagnóstico", href: "/modulo-medico/diagnostico" },
          { label: "Comisiones", href: "/modulo-medico/comisiones", requiresMedicalCommissions: true },
          { label: "Operaciones", href: "/modulo-medico/operaciones", requiresMedicalOperations: true },
          { label: "Configuración", href: "/modulo-medico/configuracion", requiresMedicalConfig: true }
        ]
      },
      { label: "Encounter (demo)", href: "/modulo-medico/consultaM/demo-open", icon: ListChecks }
    ]
  },
  {
    sectionLabel: "Clínica",
    items: [
      {
        label: "Diagnóstico Clínico",
        href: "/diagnostics/orders",
        icon: FlaskConical,
        children: [
          { label: "Órdenes", href: "/diagnostics/orders" },
          { label: "Health checks", href: "/diagnostics/health-checks", icon: Bug }
        ]
      }
    ]
  },
  {
    sectionLabel: "Comunicaciones",
    items: [
      {
        label: "WhatsApp",
        href: "/ops/whatsapp",
        icon: MessageCircleMore,
        children: [{ label: "Automatizaciones", href: "/ops/whatsapp/automations" }]
      }
    ]
  },
  {
    sectionLabel: "Sistema",
    items: [{ label: "Automatizaciones", href: "/automations", icon: Settings }]
  }
];

export function filterNavSections(
  sections: NavSection[],
  options?: {
    canAccessReception?: boolean;
    canAccessMedicalCommissions?: boolean;
    canAccessMedicalOperations?: boolean;
    canAccessMedicalConfig?: boolean;
    canAccessPortales?: boolean;
    canAccessConfigOps?: boolean;
    canAccessConfigProcessing?: boolean;
  }
) {
  const canAccessReception = options?.canAccessReception ?? false;
  const canAccessMedicalCommissions = options?.canAccessMedicalCommissions ?? false;
  const canAccessMedicalOperations = options?.canAccessMedicalOperations ?? false;
  const canAccessMedicalConfig = options?.canAccessMedicalConfig ?? false;
  const canAccessPortales = options?.canAccessPortales ?? false;
  const canAccessConfigOps = options?.canAccessConfigOps ?? false;
  const canAccessConfigProcessing = options?.canAccessConfigProcessing ?? false;

  function allowItem(item: NavItem) {
    if (item.requiresReception && !canAccessReception) return false;
    if (item.requiresMedicalCommissions && !canAccessMedicalCommissions) return false;
    if (item.requiresMedicalOperations && !canAccessMedicalOperations) return false;
    if (item.requiresMedicalConfig && !canAccessMedicalConfig) return false;
    if (item.requiresPortales && !canAccessPortales) return false;
    if (item.requiresConfigOpsView && !canAccessConfigOps) return false;
    if (item.requiresConfigProcessingView && !canAccessConfigProcessing) return false;
    return true;
  }

  return sections
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => allowItem(item))
        .map((item) => {
          if (!item.children) return item;
          const children = item.children.filter((child) => allowItem(child));
          return {
            ...item,
            children: children.length > 0 ? children : undefined
          };
        })
    }))
    .filter((section) => section.items.length > 0);
}

export function flattenNavItems(sections: NavSection[]) {
  return sections.flatMap((section) => section.items);
}

function normalizeAccessToken(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

type NavAccessUser = {
  roles?: string[] | null;
  permissions?: string[] | null;
};

export function canSeePortales(user: NavAccessUser | null | undefined) {
  const roleSet = new Set((user?.roles ?? []).map(normalizeAccessToken));
  if (roleSet.has("SUPER_ADMIN") || roleSet.has("ADMIN")) return true;

  return (user?.permissions ?? []).some((permission) =>
    normalizeAccessToken(permission).startsWith("PORTAL_")
  );
}

// Compatibilidad: vista plana para componentes que aún la consumen (sin filtros)
export const navItems: NavItem[] = navSections.flatMap((section) => section.items);
