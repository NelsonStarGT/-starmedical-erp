"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type JobRole = { id: string; name: string; isActive: boolean };
type SystemRole = { id: string; name: string; description?: string | null };
type UserItem = {
  id: string;
  email: string;
  name?: string | null;
  branchId?: string | null;
  isActive: boolean;
  profile: {
    jobRoleId: string | null;
    jobRole: { id: string; name: string } | null;
  } | null;
  roleBaseKeys: string[];
};

type UsersResponse = { items: UserItem[]; total: number; page: number; pageSize: number };

const statusLabel = (isActive: boolean) => (isActive ? "Activo" : "Inactivo");

export default function UsuariosLista() {
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [systemRoles, setSystemRoles] = useState<SystemRole[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    q: "",
    jobRoleId: "",
    roleBaseKey: "",
    status: ""
  });

  useEffect(() => {
    fetch("/api/admin/job-roles", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("roles");
        return res.json();
      })
      .then((json) => setJobRoles(json.data || []))
      .catch(() => setJobRoles([]));
    fetch("/api/admin/rbac/roles", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("rbac");
        const json = await res.json();
        const roles = (json.data || []).map((r: any) => ({
          id: r.id || r.name,
          name: r.name,
          description: r.description
        }));
        setSystemRoles(roles);
      })
      .catch(() => setSystemRoles([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.jobRoleId) params.set("jobRoleId", filters.jobRoleId);
    if (filters.roleBaseKey) params.set("roleBaseKey", filters.roleBaseKey);
    if (filters.status) params.set("status", filters.status);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    setLoading(true);
    fetch(`/api/users?${params.toString()}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "No autorizado");
        }
        return res.json();
      })
      .then((json) => {
        const data: UsersResponse = json.data || { items: [], total: 0, page: 1, pageSize };
        setUsers(data.items || []);
        setTotal(data.total || 0);
        setError(null);
      })
      .catch((err: any) => {
        setUsers([]);
        setTotal(0);
        setError(err?.message || "No se pudo cargar usuarios.");
      })
      .finally(() => setLoading(false));
  }, [filters, page, pageSize]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const jobRoleOptionsEmpty = jobRoles.length === 0;
  const systemRoleOptionsEmpty = systemRoles.length === 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 py-4">
          <div>
            <label className="text-xs font-medium text-slate-600">Búsqueda</label>
            <input
              value={filters.q}
              onChange={(e) => {
                setFilters({ ...filters, q: e.target.value });
                setPage(1);
              }}
              placeholder="Nombre o correo"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Rol operativo</label>
            <select
              value={filters.jobRoleId}
              onChange={(e) => {
                setFilters({ ...filters, jobRoleId: e.target.value });
                setPage(1);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">{jobRoleOptionsEmpty ? "Sin roles operativos — configurar" : "Todos"}</option>
              {jobRoles.map((rol) => (
                <option key={rol.id} value={rol.id}>
                  {rol.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Rol del sistema</label>
            <select
              value={filters.roleBaseKey}
              onChange={(e) => {
                setFilters({ ...filters, roleBaseKey: e.target.value });
                setPage(1);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">{systemRoleOptionsEmpty ? "Sin roles de sistema — revisar seed" : "Todos"}</option>
              {systemRoles.map((rol) => (
                <option key={rol.name} value={rol.name}>
                  {rol.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Estado</label>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value });
                setPage(1);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">Todos</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Correo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rol operativo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rol del sistema</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                    Cargando usuarios…
                  </td>
                </tr>
              )}
              {!loading &&
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{u.name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {u.profile?.jobRole ? (
                        u.profile.jobRole.name
                      ) : (
                        <span title="Asignar rol operativo" className="text-slate-400">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="flex flex-wrap gap-2">
                        {(u.roleBaseKeys || []).map((r) => (
                          <span
                            key={r}
                            className="inline-flex items-center rounded-full border border-[#2e75ba33] bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-semibold uppercase text-[#2e75ba]"
                          >
                            {r}
                          </span>
                        ))}
                        {(!u.roleBaseKeys || u.roleBaseKeys.length === 0) && (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.isActive ? "success" : "neutral"}>{statusLabel(u.isActive)}</Badge>
                    </td>
                  </tr>
                ))}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                    No hay usuarios con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <span>
              Página {page} de {totalPages} · {total} usuarios
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-50 hover:bg-white"
              >
                Anterior
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-50 hover:bg-white"
              >
                Siguiente
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
