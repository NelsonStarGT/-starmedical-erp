import {
  HomeIcon,
  UsersIcon,
  UserGroupIcon,
  BuildingOffice2Icon,
  Squares2X2Icon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  BanknotesIcon,
  BriefcaseIcon,
  IdentificationIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ClockIcon,
  BeakerIcon,
  BugAntIcon,
  QueueListIcon,
  HeartIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline";

export type NavItem = {
  label: string;
  href: string;
  disabled?: boolean;
  icon?: typeof HomeIcon;
  tooltip?: string;
  children?: NavItem[];
  requiresReception?: boolean;
  requiresMedicalCommissions?: boolean;
  requiresMedicalOperations?: boolean;
  requiresMedicalConfig?: boolean;
  requiresPortales?: boolean;
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
      { label: "Inicio", href: "/admin", icon: HomeIcon },
      {
        label: "Clientes",
        href: "/admin/clientes/personas",
        icon: UserGroupIcon
      },
      {
        label: "Empresas",
        href: "/admin/empresas",
        icon: BuildingOffice2Icon,
        children: [
          { label: "Empresas", href: "/admin/empresas" },
          { label: "Instituciones", href: "/admin/empresas/instituciones" },
          { label: "Aseguradoras", href: "/admin/empresas/aseguradoras" }
        ]
      },
      { label: "CRM", href: "/admin/crm", icon: BriefcaseIcon },
      { label: "Membresías", href: "/admin/membresias", icon: IdentificationIcon },
      { label: "Agenda", href: "/admin/agenda", icon: CalendarDaysIcon }
    ]
  },
  {
    sectionLabel: "Administración",
    items: [
      { label: "Usuarios", href: "/admin/usuarios", icon: UsersIcon },
      { label: "Recepción", href: "/admin/reception", icon: QueueListIcon, requiresReception: true },
      { label: "RRHH", href: "/hr", icon: UserGroupIcon },
      { label: "Inventario", href: "/admin/inventario", icon: Squares2X2Icon },
      { label: "Finanzas", href: "/admin/finanzas", icon: BanknotesIcon },
      { label: "Marcaje", href: "/marcaje", icon: ClockIcon },
      { label: "Facturación", href: "/admin/facturacion", icon: ClipboardDocumentListIcon },
      {
        label: "Portales",
        href: "/admin/portales",
        icon: ShieldCheckIcon,
        tooltip: "Control center Portal Paciente/Empresa",
        requiresPortales: true
      },
      { label: "Configuración", href: "/admin/configuracion", icon: Cog6ToothIcon }
    ]
  },
  {
    sectionLabel: "Médico",
    items: [
      {
        label: "Módulo médico",
        href: "/modulo-medico/dashboard",
        icon: HeartIcon,
        children: [
          { label: "Dashboard", href: "/modulo-medico/dashboard" },
          { label: "Mis pacientes", href: "/modulo-medico/agenda" },
          { label: "Diagnóstico", href: "/modulo-medico/diagnostico" },
          { label: "Comisiones", href: "/modulo-medico/comisiones", requiresMedicalCommissions: true },
          { label: "Operaciones", href: "/modulo-medico/operaciones", requiresMedicalOperations: true },
          { label: "Configuración", href: "/modulo-medico/configuracion", requiresMedicalConfig: true }
        ]
      },
      { label: "Encounter (demo)", href: "/modulo-medico/consultaM/demo-open", icon: QueueListIcon }
    ]
  },
  {
    sectionLabel: "Clínica",
    items: [
      {
        label: "Diagnóstico Clínico",
        href: "/diagnostics/orders",
        icon: BeakerIcon,
        children: [
          { label: "Órdenes", href: "/diagnostics/orders" },
          { label: "Health checks", href: "/diagnostics/health-checks", icon: BugAntIcon }
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
        icon: ChatBubbleOvalLeftEllipsisIcon,
        children: [{ label: "Automatizaciones", href: "/ops/whatsapp/automations" }]
      }
    ]
  },
  {
    sectionLabel: "Sistema",
    items: [{ label: "Automatizaciones", href: "/automations", icon: Cog6ToothIcon }]
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
  }
) {
  const canAccessReception = options?.canAccessReception ?? false;
  const canAccessMedicalCommissions = options?.canAccessMedicalCommissions ?? false;
  const canAccessMedicalOperations = options?.canAccessMedicalOperations ?? false;
  const canAccessMedicalConfig = options?.canAccessMedicalConfig ?? false;
  const canAccessPortales = options?.canAccessPortales ?? false;

  function allowItem(item: NavItem) {
    if (item.requiresReception && !canAccessReception) return false;
    if (item.requiresMedicalCommissions && !canAccessMedicalCommissions) return false;
    if (item.requiresMedicalOperations && !canAccessMedicalOperations) return false;
    if (item.requiresMedicalConfig && !canAccessMedicalConfig) return false;
    if (item.requiresPortales && !canAccessPortales) return false;
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
