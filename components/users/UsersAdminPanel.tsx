"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type BranchAccess = {
  id?: string;
  branchId: string;
  branchName?: string;
  accessMode: "LOCKED" | "SWITCH";
  isDefault: boolean;
};

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  tenantId: string | null;
  branchId: string | null;
  roleNames: string[];
  branchAccesses: BranchAccess[];
};

type RoleOption = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
};

type BranchOption = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
};

type UsersAdminPanelProps = {
  initialItems: UserRow[];
  initialTotal: number;
  initialPage: number;
  initialPageSize: number;
  roles: RoleOption[];
  branches: BranchOption[];
};

type Filters = {
  q: string;
  roleName: string;
  branchId: string;
  status: "" | "active" | "inactive";
};

type EditorState = {
  email: string;
  displayName: string;
  password: string;
  isActive: boolean;
  branchId: string;
  roleNames: string[];
  branchAccesses: Array<{
    branchId: string;
    accessMode: "LOCKED" | "SWITCH";
    isDefault: boolean;
  }>;
};

const emptyFilters: Filters = {
  q: "",
  roleName: "",
  branchId: "",
  status: ""
};

function createEmptyEditor(): EditorState {
  return {
    email: "",
    displayName: "",
    password: "",
    isActive: true,
    branchId: "",
    roleNames: [],
    branchAccesses: []
  };
}

function editorFromUser(user: UserRow): EditorState {
  return {
    email: user.email,
    displayName: user.name || "",
    password: "",
    isActive: user.isActive,
    branchId: user.branchId || "",
    roleNames: user.roleNames || [],
    branchAccesses: (user.branchAccesses || []).map((access) => ({
      branchId: access.branchId,
      accessMode: access.accessMode,
      isDefault: access.isDefault
    }))
  };
}

function defaultBranchAccess(branchId: string): EditorState["branchAccesses"][number] {
  return {
    branchId,
    accessMode: "LOCKED",
    isDefault: true
  };
}

export default function UsersAdminPanel(props: UsersAdminPanelProps) {
  const [items, setItems] = useState<UserRow[]>(props.initialItems);
  const [total, setTotal] = useState(props.initialTotal);
  const [page, setPage] = useState(props.initialPage);
  const [pageSize] = useState(props.initialPageSize);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(props.initialItems[0]?.id || null);
  const [mode, setMode] = useState<"create" | "edit">(props.initialItems.length > 0 ? "edit" : "create");
  const [editor, setEditor] = useState<EditorState>(() =>
    props.initialItems.length > 0 ? editorFromUser(props.initialItems[0]) : createEmptyEditor()
  );
  const [resetPassword, setResetPassword] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedUser = useMemo(
    () => items.find((item) => item.id === selectedUserId) || null,
    [items, selectedUserId]
  );

  async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const details = Array.isArray(payload?.details?.password) ? ` ${payload.details.password.join(" ")}` : "";
      throw new Error(String(payload?.error || "No se pudo completar la operación.") + details);
    }
    return payload as T;
  }

  function selectForEdit(user: UserRow) {
    setMode("edit");
    setSelectedUserId(user.id);
    setEditor(editorFromUser(user));
    setResetPassword("");
    setMessage(null);
  }

  function startCreateMode() {
    setMode("create");
    setSelectedUserId(null);
    setEditor(createEmptyEditor());
    setResetPassword("");
    setMessage(null);
  }

  async function loadUsers(nextPage = page, nextFilters = filters) {
    const params = new URLSearchParams();
    if (nextFilters.q) params.set("q", nextFilters.q);
    if (nextFilters.roleName) params.set("roleName", nextFilters.roleName);
    if (nextFilters.branchId) params.set("branchId", nextFilters.branchId);
    if (nextFilters.status) params.set("status", nextFilters.status);
    params.set("page", String(nextPage));
    params.set("pageSize", String(pageSize));

    const payload = await fetchJson<{
      data: { items: UserRow[]; total: number; page: number; pageSize: number };
    }>(`/api/users?${params.toString()}`, { cache: "no-store" });

    setItems(payload.data.items);
    setTotal(payload.data.total);
    setPage(payload.data.page);

    if (mode === "edit" && selectedUserId) {
      const refreshed = payload.data.items.find((item) => item.id === selectedUserId);
      if (refreshed) {
        setEditor(editorFromUser(refreshed));
      }
    }
  }

  function toggleRole(roleName: string) {
    setEditor((current) => ({
      ...current,
      roleNames: current.roleNames.includes(roleName)
        ? current.roleNames.filter((value) => value !== roleName)
        : [...current.roleNames, roleName].sort()
    }));
  }

  function setPrimaryBranch(branchId: string) {
    setEditor((current) => {
      const remaining = current.branchAccesses.filter((access) => access.branchId !== branchId);
      const nextAccesses = branchId
        ? [{ ...defaultBranchAccess(branchId) }, ...remaining.map((access) => ({ ...access, isDefault: false }))]
        : remaining.map((access, index) => ({ ...access, isDefault: index === 0 }));

      return {
        ...current,
        branchId,
        branchAccesses: nextAccesses
      };
    });
  }

  function toggleBranchAccess(branchId: string, enabled: boolean) {
    setEditor((current) => {
      const exists = current.branchAccesses.some((access) => access.branchId === branchId);
      if (enabled && !exists) {
        return {
          ...current,
          branchAccesses: [
            ...current.branchAccesses,
            {
              branchId,
              accessMode: branchId === current.branchId ? "LOCKED" : "SWITCH",
              isDefault: current.branchAccesses.length === 0
            }
          ]
        };
      }
      if (!enabled && exists) {
        const nextAccesses = current.branchAccesses
          .filter((access) => access.branchId !== branchId)
          .map((access, index) => ({ ...access, isDefault: access.isDefault && index === 0 }));
        return {
          ...current,
          branchId: current.branchId === branchId ? "" : current.branchId,
          branchAccesses: nextAccesses
        };
      }
      return current;
    });
  }

  function updateBranchAccess(branchId: string, patch: Partial<BranchAccess>) {
    setEditor((current) => ({
      ...current,
      branchAccesses: current.branchAccesses.map((access) => {
        const next = access.branchId === branchId ? { ...access, ...patch } : access;
        return patch.isDefault ? { ...next, isDefault: next.branchId === branchId } : next;
      })
    }));
  }

  function submitEditor() {
    startTransition(async () => {
      try {
        setMessage(null);

        if (mode === "create") {
          if (!editor.password.trim()) throw new Error("Password inicial requerido.");
          const created = await fetchJson<{ data: { userId: string } }>("/api/users", {
            method: "POST",
            body: JSON.stringify({
              email: editor.email,
              displayName: editor.displayName,
              password: editor.password,
              roles: editor.roleNames,
              isActive: editor.isActive,
              branchId: editor.branchId || undefined,
              branchAccesses: editor.branchAccesses
            })
          });
          setSelectedUserId(created.data.userId);
          setMode("edit");
          setMessage({ tone: "success", text: "Usuario creado y persistido correctamente." });
        } else if (selectedUserId) {
          await fetchJson(`/api/users/${selectedUserId}`, {
            method: "PATCH",
            body: JSON.stringify({
              email: editor.email,
              displayName: editor.displayName,
              isActive: editor.isActive,
              branchId: editor.branchId || null
            })
          });
          await fetchJson(`/api/users/${selectedUserId}/roles`, {
            method: "PUT",
            body: JSON.stringify({ roles: editor.roleNames })
          });
          await fetchJson(`/api/users/${selectedUserId}/branch-access`, {
            method: "PUT",
            body: JSON.stringify({
              branchId: editor.branchId || null,
              branchAccesses: editor.branchAccesses
            })
          });
          setMessage({ tone: "success", text: "Usuario actualizado correctamente." });
        }

        await loadUsers(1, filters);
      } catch (error) {
        setMessage({
          tone: "error",
          text: error instanceof Error ? error.message : "No se pudo guardar el usuario."
        });
      }
    });
  }

  function toggleStatus(user: UserRow) {
    startTransition(async () => {
      try {
        await fetchJson(`/api/users/${user.id}`, {
          method: "PATCH",
          body: JSON.stringify({ isActive: !user.isActive })
        });
        setMessage({
          tone: "success",
          text: user.isActive ? "Usuario desactivado." : "Usuario activado."
        });
        await loadUsers(page, filters);
      } catch (error) {
        setMessage({
          tone: "error",
          text: error instanceof Error ? error.message : "No se pudo cambiar el estado."
        });
      }
    });
  }

  function submitPasswordReset() {
    if (!selectedUserId || !resetPassword.trim()) return;
    startTransition(async () => {
      try {
        await fetchJson(`/api/users/${selectedUserId}/reset-password`, {
          method: "POST",
          body: JSON.stringify({ newPassword: resetPassword })
        });
        setResetPassword("");
        setMessage({ tone: "success", text: "Password restablecido." });
      } catch (error) {
        setMessage({
          tone: "error",
          text: error instanceof Error ? error.message : "No se pudo restablecer el password."
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      {message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            message.tone === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <input
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
            placeholder="Nombre o correo"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={filters.roleName}
            onChange={(event) => setFilters((current) => ({ ...current, roleName: event.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Todos los roles</option>
            {props.roles.map((role) => (
              <option key={role.id} value={role.name}>
                {role.name}
              </option>
            ))}
          </select>
          <select
            value={filters.branchId}
            onChange={(event) => setFilters((current) => ({ ...current, branchId: event.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Todas las sucursales</option>
            {props.branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({ ...current, status: event.target.value as Filters["status"] }))
            }
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadUsers(1, filters)}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Buscar
            </button>
            <button
              type="button"
              onClick={() => {
                setFilters(emptyFilters);
                void loadUsers(1, emptyFilters);
              }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Limpiar
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Usuarios reales</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="info">{total} registrados</Badge>
              <button
                type="button"
                onClick={startCreateMode}
                className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Nuevo usuario
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Usuario</th>
                    <th className="px-3 py-2">Roles</th>
                    <th className="px-3 py-2">Sucursal</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className={selectedUserId === item.id ? "bg-slate-50" : undefined}>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-900">{item.name || "Sin nombre"}</p>
                        <p className="text-xs text-slate-500">{item.email}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {item.roleNames.map((roleName) => (
                            <Badge key={roleName} variant="neutral">
                              {roleName}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600">
                        {item.branchAccesses.length > 0
                          ? item.branchAccesses.map((access) => access.branchName || access.branchId).join(", ")
                          : item.branchId || "Sin acceso asignado"}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={item.isActive ? "success" : "warning"}>
                          {item.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => selectForEdit(item)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleStatus(item)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                          >
                            {item.isActive ? "Desactivar" : "Activar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-10 text-center text-sm text-slate-500">
                        No hay usuarios para los filtros actuales.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Página {page} · {items.length} elementos visibles
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || isPending}
                  onClick={() => void loadUsers(page - 1, filters)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={page * pageSize >= total || isPending}
                  onClick={() => void loadUsers(page + 1, filters)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{mode === "create" ? "Crear usuario" : "Editar usuario"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3">
              <input
                value={editor.displayName}
                onChange={(event) => setEditor((current) => ({ ...current, displayName: event.target.value }))}
                placeholder="Nombre visible"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={editor.email}
                onChange={(event) => setEditor((current) => ({ ...current, email: event.target.value }))}
                placeholder="Correo"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              {mode === "create" ? (
                <input
                  value={editor.password}
                  onChange={(event) => setEditor((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Password inicial"
                  type="password"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              ) : null}
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={editor.isActive}
                  onChange={(event) => setEditor((current) => ({ ...current, isActive: event.target.checked }))}
                />
                Usuario activo
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">Roles</p>
              <div className="grid gap-2 md:grid-cols-2">
                {props.roles.map((role) => (
                  <label key={role.id} className="flex items-start gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={editor.roleNames.includes(role.name)}
                      onChange={() => toggleRole(role.name)}
                    />
                    <span>
                      <span className="block font-medium">{role.name}</span>
                      <span className="block text-xs text-slate-500">
                        {role.description || (role.isSystem ? "Rol de sistema" : "Rol personalizado")}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">Sucursal principal</p>
              <select
                value={editor.branchId}
                onChange={(event) => setPrimaryBranch(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Sin sucursal principal</option>
                {props.branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">Accesos por sucursal</p>
              <div className="space-y-2">
                {props.branches.map((branch) => {
                  const access = editor.branchAccesses.find((row) => row.branchId === branch.id);
                  return (
                    <div key={branch.id} className="rounded-xl border border-slate-200 px-3 py-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={Boolean(access)}
                            onChange={(event) => toggleBranchAccess(branch.id, event.target.checked)}
                          />
                          <span>{branch.name}</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            value={access?.accessMode || "LOCKED"}
                            disabled={!access}
                            onChange={(event) =>
                              updateBranchAccess(branch.id, {
                                accessMode: event.target.value as "LOCKED" | "SWITCH"
                              })
                            }
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                          >
                            <option value="LOCKED">LOCKED</option>
                            <option value="SWITCH">SWITCH</option>
                          </select>
                          <label className="flex items-center gap-1 text-xs text-slate-600">
                            <input
                              type="radio"
                              name="default-branch"
                              checked={Boolean(access?.isDefault)}
                              disabled={!access}
                              onChange={() => updateBranchAccess(branch.id, { isDefault: true })}
                            />
                            Default
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={submitEditor}
                className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {mode === "create" ? "Crear usuario" : "Guardar cambios"}
              </button>
              {mode === "edit" ? (
                <button
                  type="button"
                  onClick={startCreateMode}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Nuevo
                </button>
              ) : null}
            </div>

            {mode === "edit" && selectedUser ? (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Reset administrativo de contraseña</p>
                  <p className="text-xs text-slate-500">
                    El reset actualiza el hash persistido; las sesiones JWT ya emitidas expiran con su TTL actual.
                  </p>
                </div>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  placeholder={`Nuevo password para ${selectedUser.email}`}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={!resetPassword.trim() || isPending}
                  onClick={submitPasswordReset}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
                >
                  Restablecer password
                </button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
