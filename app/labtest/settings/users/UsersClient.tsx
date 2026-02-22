"use client";

import { useEffect, useMemo, useState } from "react";
import { LabRole } from "@prisma/client";
import { safeFetchJson } from "@/lib/http/safeFetchJson";

type AccessRow = {
  id: string;
  userId: string;
  role: LabRole;
  branchId: string | null;
  isActive: boolean;
  user?: { id: string; email: string; name: string | null; branchId: string | null; isActive: boolean };
};

type UserOption = { id: string; name: string | null; email: string; branchId: string | null; isActive: boolean };

export default function UsersClient({ canEdit }: { canEdit: boolean }) {
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [options, setOptions] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [role, setRole] = useState<LabRole>("LAB_TECH");
  const [branchId, setBranchId] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);

  const loadAccess = async () => {
    try {
      const res = await safeFetchJson<{ ok: boolean; data: AccessRow[] }>("/api/labtest/access");
      setRows(res.data || []);
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  useEffect(() => {
    loadAccess();
  }, []);

  const searchUsers = async () => {
    if (!searchTerm.trim()) return;
    try {
      const res = await safeFetchJson<{ data: { items: UserOption[] } }>(`/api/users?q=${encodeURIComponent(searchTerm)}`);
      setOptions(res.data.items || []);
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  const addAccess = async () => {
    if (!selectedUserId) return setMessage("Selecciona un usuario");
    try {
      await safeFetchJson("/api/labtest/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, role, branchId: branchId || null, isActive: true })
      });
      setMessage("Acceso agregado/actualizado");
      setSelectedUserId("");
      setBranchId("");
      loadAccess();
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  const toggleActive = async (row: AccessRow) => {
    try {
      await safeFetchJson("/api/labtest/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, userId: row.userId, role: row.role, branchId: row.branchId, isActive: !row.isActive })
      });
      loadAccess();
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  const roleLabel = useMemo(
    () => ({
      LAB_TECH: "Técnico",
      LAB_SUPERVISOR: "Supervisor",
      LAB_ADMIN: "Admin"
    }),
    []
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Usuarios LabTest</p>
        <h2 className="text-2xl font-semibold text-[#163d66]">Control de acceso</h2>
        <p className="text-sm text-slate-600">Roles TECH / SUPERVISOR / ADMIN por sede.</p>
        {!canEdit && <p className="mt-2 text-xs font-semibold text-amber-700">Solo lectura.</p>}
      </div>

      {canEdit && (
        <div className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Agregar usuario</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="space-y-1 text-sm text-slate-700">
                <span>Buscar usuario (correo o nombre)</span>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-[#dce7f5] px-3 py-2"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={searchUsers}
                    className="rounded-full border border-[#dce7f5] px-3 py-2 text-sm font-semibold text-[#2e75ba]"
                  >
                    Buscar
                  </button>
                </div>
              </label>
              <label className="space-y-1 text-sm text-slate-700">
                <span>Usuarios encontrados</span>
                <select
                  className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">Selecciona</option>
                  {options.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email} ({u.email})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="space-y-2">
              <label className="space-y-1 text-sm text-slate-700">
                <span>Rol LabTest</span>
                <select
                  className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                  value={role}
                  onChange={(e) => setRole(e.target.value as LabRole)}
                >
                  <option value="LAB_TECH">Técnico</option>
                  <option value="LAB_SUPERVISOR">Supervisor</option>
                  <option value="LAB_ADMIN">Admin</option>
                </select>
              </label>
              <label className="space-y-1 text-sm text-slate-700">
                <span>Sede (branchId, opcional)</span>
                <input
                  className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  placeholder="GLOBAL si se deja vacío"
                />
              </label>
              <button
                type="button"
                onClick={addAccess}
                className="rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f8f87]"
              >
                Guardar acceso
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[#dce7f5] bg-white shadow-sm">
        <table className="min-w-full divide-y divide-[#e5edf8]">
          <thead className="bg-[#2e75ba] text-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Usuario</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Rol</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Sede</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Estado</th>
              {canEdit && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eef3fb]">
            {rows.map((row, idx) => (
              <tr key={row.id} className={idx % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"}>
                <td className="px-4 py-3 text-sm text-slate-700">
                  <div className="font-semibold text-[#163d66]">{row.user?.name || row.user?.email || row.userId}</div>
                  <div className="text-xs text-slate-500">{row.user?.email}</div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{roleLabel[row.role]}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{row.branchId || "GLOBAL"}</td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      row.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {row.isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>
                {canEdit && (
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => toggleActive(row)}
                      className="rounded-full border border-[#dce7f5] px-3 py-1 text-xs font-semibold text-[#2e75ba] hover:bg-[#e8f1ff]"
                    >
                      {row.isActive ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {message && <div className="rounded-xl border border-[#dce7f5] bg-[#f8fafc] px-3 py-2 text-sm text-[#1f6f68]">{message}</div>}
    </div>
  );
}
