"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  resolveConfigCapabilities,
  type ConfigAccessUser,
  type ConfigCapability
} from "@/lib/security/configCapabilities";
import { cn } from "@/lib/utils";

type ConfigNavItem = {
  href: string;
  label: string;
  capability?: ConfigCapability;
  lockedReason?: string;
};

const configNavItems: ConfigNavItem[] = [
  { href: "/admin/configuracion", label: "Inicio" },
  { href: "/admin/configuracion/tema", label: "Tema" },
  { href: "/admin/configuracion/navegacion", label: "Navegación" },
  { href: "/admin/configuracion/patentes", label: "Patentes" },
  { href: "/admin/configuracion/facturacion", label: "Facturación" },
  { href: "/admin/configuracion/servicios", label: "Servicios" },
  {
    href: "/admin/configuracion/procesamiento",
    label: "Procesamiento",
    capability: "CONFIG_PROCESSING_VIEW",
    lockedReason: "Requiere SUPER_ADMIN, OPS o TENANT_ADMIN"
  },
  { href: "/admin/configuracion/seguridad", label: "Seguridad" }
];

function canAccessCapability(
  capabilities: ReturnType<typeof resolveConfigCapabilities>,
  capability?: ConfigCapability
) {
  if (!capability) return true;
  if (capability === "CONFIG_OPS_VIEW") return capabilities.canAccessConfigOps;
  if (capability === "CONFIG_PROCESSING_VIEW") return capabilities.canViewConfigProcessing;
  if (capability === "CONFIG_PROCESSING_WRITE") return capabilities.canWriteConfigProcessing;
  return false;
}

export default function ConfigSectionNav() {
  const pathname = usePathname();
  const [viewer, setViewer] = useState<ConfigAccessUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadViewer = async () => {
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setViewer(null);
          return;
        }

        const payload = (await response.json().catch(() => ({}))) as ConfigAccessUser;
        if (!cancelled) {
          setViewer({
            roles: Array.isArray(payload.roles) ? payload.roles : [],
            permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
            deniedPermissions: Array.isArray(payload.deniedPermissions)
              ? payload.deniedPermissions
              : []
          });
        }
      } catch {
        if (!cancelled) setViewer(null);
      }
    };

    void loadViewer();

    return () => {
      cancelled = true;
    };
  }, []);

  const capabilities = useMemo(() => resolveConfigCapabilities(viewer), [viewer]);

  return (
    <nav className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {configNavItems.map((item) => {
          const isActive = pathname === item.href;
          const canAccess = canAccessCapability(capabilities, item.capability);

          if (!canAccess) {
            const reason = item.lockedReason || "No autorizado";
            return (
              <span
                key={item.href}
                title={reason}
                aria-disabled="true"
                className="inline-flex min-w-fit cursor-not-allowed items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-dashed border-slate-200 bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-500"
              >
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                {item.label}
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex min-w-fit items-center justify-center whitespace-nowrap rounded-lg border px-3 py-2 text-center text-xs font-semibold transition",
                isActive
                  ? "border-[#2e75ba] bg-[#2e75ba] text-white"
                  : "border-slate-200 bg-[#F8FAFC] text-slate-700 hover:border-[#4aadf5]"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
