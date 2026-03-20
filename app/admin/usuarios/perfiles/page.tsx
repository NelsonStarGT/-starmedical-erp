import fs from "node:fs";
import path from "node:path";
import ProfilesAdminPanel from "@/components/users/ProfilesAdminPanel";
import { prisma } from "@/lib/prisma";

function labelFromSegment(segment: string) {
  const map: Record<string, string> = {
    admin: "Administración",
    agenda: "Agenda",
    clientes: "Clientes",
    configuracion: "Configuración",
    crm: "CRM",
    finanzas: "Finanzas",
    inventario: "Inventario",
    lista: "Lista",
    permisos: "Permisos",
    perfiles: "Perfiles",
    seguridad: "Seguridad",
    usuarios: "Usuarios"
  };
  return map[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
}

function getOperationalModules() {
  const adminRoot = path.join(process.cwd(), "app", "admin");
  const modules: Array<{
    moduleKey: string;
    moduleLabel: string;
    sections: Array<{ key: string; label: string; href: string }>;
  }> = [];

  for (const entry of fs.readdirSync(adminRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const moduleDir = path.join(adminRoot, entry.name);
    const sections: Array<{ key: string; label: string; href: string }> = [];

    if (fs.existsSync(path.join(moduleDir, "page.tsx"))) {
      sections.push({
        key: "dashboard",
        label: "Dashboard",
        href: `/admin/${entry.name}`
      });
    }

    for (const child of fs.readdirSync(moduleDir, { withFileTypes: true })) {
      if (!child.isDirectory()) continue;
      const pagePath = path.join(moduleDir, child.name, "page.tsx");
      if (!fs.existsSync(pagePath)) continue;
      sections.push({
        key: child.name,
        label: labelFromSegment(child.name),
        href: `/admin/${entry.name}/${child.name}`
      });
    }

    if (sections.length === 0) continue;

    modules.push({
      moduleKey: entry.name.toUpperCase(),
      moduleLabel: labelFromSegment(entry.name),
      sections
    });
  }

  return modules.sort((left, right) => left.moduleLabel.localeCompare(right.moduleLabel, "es"));
}

export default async function UsuariosPerfilesPage() {
  const [roles, modules] = await Promise.all([
    prisma.role.findMany({
      orderBy: { name: "asc" },
      include: {
        permissions: true,
        _count: {
          select: {
            userRoles: true,
            permissions: true
          }
        }
      }
    }),
    Promise.resolve(getOperationalModules())
  ]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#d8eef2] bg-gradient-to-r from-[#e8f7f5] via-[#f1f9ff] to-[#f4fbff] px-4 py-4">
        <h1 className="text-xl font-semibold text-[#214467]">Perfiles</h1>
        <p className="mt-1 text-sm text-slate-600">
          Base operativa de perfiles alineada al esquema real de `main`, usando módulos y páginas detectados en esta rama.
        </p>
      </div>

      <ProfilesAdminPanel
        initialProfiles={roles.map((role) => ({
          id: role.id,
          name: role.name,
          description: role.description,
          isSystem: role.name.toUpperCase() === "ADMIN",
          userCount: role._count.userRoles,
          permissionCount: role._count.permissions,
          createdAt: role.createdAt.toISOString(),
          updatedAt: role.updatedAt.toISOString()
        }))}
        modules={modules}
      />
    </div>
  );
}
