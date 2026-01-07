'use client';

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useUserData } from "@/components/users/UserProvider";
import { Role, RoleType, Sucursal, TipoContrato, TipoJornada, DocumentoDefinicion } from "@/lib/types";

export default function UsuariosConfiguracion() {
  const {
    roles,
    sucursales,
    tiposContrato,
    tiposJornada,
    documentosDef,
    addRole,
    addSucursal,
    addTipoContrato,
    addTipoJornada,
    addDocumentoDef
  } = useUserData();

  const [roleForm, setRoleForm] = useState<Partial<Role>>({ nombre: "", tipo: "Administrativo", estado: "Activo" });
  const [sucursalForm, setSucursalForm] = useState<Partial<Sucursal>>({ nombre: "", codigo: "", ciudad: "", departamento: "", estado: "Activa" });
  const [contratoForm, setContratoForm] = useState<Partial<TipoContrato>>({ nombre: "", descripcion: "" });
  const [jornadaForm, setJornadaForm] = useState<Partial<TipoJornada>>({ nombre: "" });
  const [docForm, setDocForm] = useState<Partial<DocumentoDefinicion>>({ nombre: "", obligatorio: false, requiereVencimiento: false });
  const [message, setMessage] = useState("");

  const roleTypes: RoleType[] = ["Clínico", "Administrativo", "Soporte"];

  const nextId = (list: { id: number }[]) => (list.length ? Math.max(...list.map((i) => i.id)) + 1 : 1);

  const handleAddRole = () => {
    if (!roleForm.nombre || !roleForm.tipo) return;
    addRole({
      id: nextId(roles),
      nombre: roleForm.nombre,
      descripcion: roleForm.descripcion,
      tipo: roleForm.tipo as RoleType,
      estado: (roleForm.estado as Role["estado"]) || "Activo"
    });
    setRoleForm({ nombre: "", tipo: "Administrativo", estado: "Activo" });
    setMessage("Rol agregado.");
  };

  const handleAddSucursal = () => {
    if (!sucursalForm.nombre || !sucursalForm.codigo) return;
    addSucursal({
      id: nextId(sucursales),
      nombre: sucursalForm.nombre,
      codigo: sucursalForm.codigo,
      ciudad: sucursalForm.ciudad || "",
      departamento: sucursalForm.departamento || "",
      estado: (sucursalForm.estado as Sucursal["estado"]) || "Activa"
    });
    setSucursalForm({ nombre: "", codigo: "", ciudad: "", departamento: "", estado: "Activa" });
    setMessage("Sucursal agregada.");
  };

  const handleAddContrato = () => {
    if (!contratoForm.nombre) return;
    addTipoContrato({
      id: nextId(tiposContrato),
      nombre: contratoForm.nombre,
      descripcion: contratoForm.descripcion
    });
    setContratoForm({ nombre: "", descripcion: "" });
    setMessage("Tipo de contrato agregado.");
  };

  const handleAddJornada = () => {
    if (!jornadaForm.nombre) return;
    addTipoJornada({ id: nextId(tiposJornada), nombre: jornadaForm.nombre });
    setJornadaForm({ nombre: "" });
    setMessage("Tipo de jornada agregado.");
  };

  const handleAddDocumento = () => {
    if (!docForm.nombre) return;
    addDocumentoDef({
      id: nextId(documentosDef),
      nombre: docForm.nombre,
      obligatorio: Boolean(docForm.obligatorio),
      requiereVencimiento: Boolean(docForm.requiereVencimiento)
    });
    setDocForm({ nombre: "", obligatorio: false, requiereVencimiento: false });
    setMessage("Documento agregado.");
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Catálogo de roles</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 overflow-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Nombre</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Tipo</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Estado</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {roles.map((rol) => (
                  <tr key={rol.id}>
                    <td className="px-4 py-2 text-sm font-semibold text-slate-900">{rol.nombre}</td>
                    <td className="px-4 py-2 text-sm text-slate-700">{rol.tipo}</td>
                    <td className="px-4 py-2">
                      <Badge variant={rol.estado === "Activo" ? "success" : "neutral"}>{rol.estado}</Badge>
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-600">{rol.descripcion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3">
            <input
              placeholder="Nombre del rol"
              value={roleForm.nombre}
              onChange={(e) => setRoleForm({ ...roleForm, nombre: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <select
              value={roleForm.tipo}
              onChange={(e) => setRoleForm({ ...roleForm, tipo: e.target.value as RoleType })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              {roleTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select
              value={roleForm.estado}
              onChange={(e) => setRoleForm({ ...roleForm, estado: e.target.value as Role["estado"] })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
            <textarea
              placeholder="Descripción"
              value={roleForm.descripcion}
              onChange={(e) => setRoleForm({ ...roleForm, descripcion: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <button
              onClick={handleAddRole}
              className="w-full rounded-xl bg-brand-primary px-4 py-2 text-white font-semibold shadow-sm hover:shadow-md"
            >
              Guardar rol
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sucursales / ubicaciones</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 overflow-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Nombre</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Código</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Ciudad</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {sucursales.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 text-sm font-semibold text-slate-900">{s.nombre}</td>
                    <td className="px-4 py-2 text-sm text-slate-700">{s.codigo}</td>
                    <td className="px-4 py-2 text-sm text-slate-700">
                      {s.ciudad} / {s.departamento}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={s.estado === "Activa" ? "success" : "neutral"}>{s.estado}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3">
            <input
              placeholder="Nombre de sucursal"
              value={sucursalForm.nombre}
              onChange={(e) => setSucursalForm({ ...sucursalForm, nombre: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <input
              placeholder="Código interno"
              value={sucursalForm.codigo}
              onChange={(e) => setSucursalForm({ ...sucursalForm, codigo: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <input
              placeholder="Ciudad"
              value={sucursalForm.ciudad}
              onChange={(e) => setSucursalForm({ ...sucursalForm, ciudad: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <input
              placeholder="Departamento"
              value={sucursalForm.departamento}
              onChange={(e) => setSucursalForm({ ...sucursalForm, departamento: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <select
              value={sucursalForm.estado}
              onChange={(e) => setSucursalForm({ ...sucursalForm, estado: e.target.value as Sucursal["estado"] })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="Activa">Activa</option>
              <option value="Inactiva">Inactiva</option>
            </select>
            <button
              onClick={handleAddSucursal}
              className="w-full rounded-xl bg-brand-primary px-4 py-2 text-white font-semibold shadow-sm hover:shadow-md"
            >
              Guardar sucursal
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipos de contrato y jornadas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-2">Tipos de contrato</h4>
              <ul className="space-y-2">
                {tiposContrato.map((t) => (
                  <li key={t.id} className="rounded-xl border border-slate-200 p-3 bg-white">
                    <p className="text-sm font-semibold text-slate-900">{t.nombre}</p>
                    <p className="text-xs text-slate-500">{t.descripcion}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-2">Tipos de jornada</h4>
              <ul className="space-y-2">
                {tiposJornada.map((t) => (
                  <li key={t.id} className="rounded-xl border border-slate-200 p-3 bg-white">
                    <p className="text-sm font-semibold text-slate-900">{t.nombre}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="space-y-3">
            <input
              placeholder="Nombre de contrato"
              value={contratoForm.nombre}
              onChange={(e) => setContratoForm({ ...contratoForm, nombre: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <input
              placeholder="Descripción"
              value={contratoForm.descripcion}
              onChange={(e) => setContratoForm({ ...contratoForm, descripcion: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <button
              onClick={handleAddContrato}
              className="w-full rounded-xl bg-brand-primary px-4 py-2 text-white font-semibold shadow-sm hover:shadow-md"
            >
              Guardar contrato
            </button>

            <input
              placeholder="Nombre de jornada"
              value={jornadaForm.nombre}
              onChange={(e) => setJornadaForm({ ...jornadaForm, nombre: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <button
              onClick={handleAddJornada}
              className="w-full rounded-xl bg-brand-primary px-4 py-2 text-white font-semibold shadow-sm hover:shadow-md"
            >
              Guardar jornada
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentos requeridos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 overflow-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Documento</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Obligatorio</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                    Requiere vencimiento
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {documentosDef.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-2 text-sm font-semibold text-slate-900">{d.nombre}</td>
                    <td className="px-4 py-2 text-sm text-slate-700">{d.obligatorio ? "Sí" : "No"}</td>
                    <td className="px-4 py-2 text-sm text-slate-700">
                      {d.requiereVencimiento ? "Sí" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3">
            <input
              placeholder="Nombre del documento"
              value={docForm.nombre}
              onChange={(e) => setDocForm({ ...docForm, nombre: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(docForm.obligatorio)}
                onChange={(e) => setDocForm({ ...docForm, obligatorio: e.target.checked })}
              />
              Obligatorio
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(docForm.requiereVencimiento)}
                onChange={(e) => setDocForm({ ...docForm, requiereVencimiento: e.target.checked })}
              />
              Requiere fecha de vencimiento
            </label>
            <button
              onClick={handleAddDocumento}
              className="w-full rounded-xl bg-brand-primary px-4 py-2 text-white font-semibold shadow-sm hover:shadow-md"
            >
              Guardar documento
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
