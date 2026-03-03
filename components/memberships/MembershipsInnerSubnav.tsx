"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { NavPills } from "@/components/subscriptions/NavPills";

type SubnavItem = {
  key: string;
  label: string;
  href: string;
  active: boolean;
};

function isPrefix(pathname: string, prefix: string) {
  if (pathname === prefix) return true;
  if (!pathname.startsWith(prefix)) return false;
  return pathname.charAt(prefix.length) === "/";
}

export function MembershipsInnerSubnav() {
  const pathname = usePathname() || "";

  const items = useMemo<SubnavItem[]>(() => {
    const isCatalog = pathname === "/admin/suscripciones/membresias" || pathname === "/admin/membresias";
    const isAffiliations =
      isPrefix(pathname, "/admin/suscripciones/membresias/afiliaciones") ||
      isPrefix(pathname, "/admin/suscripciones/membresias/contratos") ||
      isPrefix(pathname, "/admin/suscripciones/membresias/renovaciones") ||
      isPrefix(pathname, "/admin/membresias/contratos");
    const isPlans = isPrefix(pathname, "/admin/suscripciones/membresias/planes") || isPrefix(pathname, "/admin/membresias/planes");
    const isPrint = isPrefix(pathname, "/admin/suscripciones/membresias/impresion") || isPrefix(pathname, "/admin/membresias/impresion");
    const isConfig =
      isPrefix(pathname, "/admin/suscripciones/membresias/configuracion") || isPrefix(pathname, "/admin/membresias/configuracion");

    return [
      { key: "catalogo", label: "Catálogo", href: "/admin/suscripciones/membresias", active: isCatalog },
      {
        key: "afiliaciones",
        label: "Gestión",
        href: "/admin/suscripciones/membresias/afiliaciones/pacientes",
        active: isAffiliations
      },
      { key: "planes", label: "Planes", href: "/admin/suscripciones/membresias/planes", active: isPlans },
      { key: "impresion", label: "Impresión", href: "/admin/suscripciones/membresias/impresion", active: isPrint },
      {
        key: "configuracion",
        label: "Configuración",
        href: "/admin/suscripciones/membresias/configuracion",
        active: isConfig
      }
    ];
  }, [pathname]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <NavPills items={items} ariaLabel="Submenú interno de membresías" />
    </div>
  );
}
