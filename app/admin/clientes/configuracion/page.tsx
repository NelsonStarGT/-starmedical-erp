"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useClientData } from "@/components/clients/ClientProvider";
import {
  CondicionPago,
  DocumentoClienteDefinicion,
  SectorIndustria,
  TipoCliente,
  TipoRelacionComercial
} from "@/lib/types";

export default function ClientesConfiguracion() {
  const {
    tiposCliente,
    sectores,
    relaciones,
    condicionesPago,
    documentosDef,
    addTipoCliente,
    addSector,
    addRelacion,
    addCondicionPago,
    addDocumentoDef
  } = useClientData();

  const [tipoForm, setTipoForm] = useState<Partial<TipoCliente>>({
    nombreTipo: "",
    descripcion: "",
    estado: "Activo"
  });
  const [sectorForm, setSectorForm] = useState<Partial<SectorIndustria>>({
    nombreSector: "",
    descripcion: "",
    estado: "Activo"
  });
  const [relacionForm, setRelacionForm] = useState<Partial<TipoRelacionComercial>>({
    nombre: "",
    descripcion: ""
  });
  const [condicionForm, setCondicionForm] = useState<Partial<CondicionPago>>({
    nombreCondicion: "",
    descripcion: ""
  });
  const [docForm, setDocForm] = useState<Partial<DocumentoClienteDefinicion>>({
    nombreDocumento: "",
    aplicaA: "Todos",
    esObligatorio: false,
    tieneVencimiento: false
  });
  const [message, setMessage] = useState("");

  const nextId = (list: { id: number }[]) =>
    list.length ? Math.max(...list.map((i) => i.id)) + 1 : 1;

  const handleAddTipo = () => {
    if (!tipoForm.nombreTipo) return;
    addTipoCliente({
      id: nextId(tiposCliente),
      nombreTipo: tipoForm.nombreTipo,
      descripcion: tipoForm.descripcion,
      estado: (tipoForm.estado as TipoCliente["estado"]) || "Activo"
    });
    setTipoForm({ nombreTipo: "", descripcion: "", estado: "Activo" });
    setMessage("Tipo de cliente agregado.");
  };

  const handleAddSector = () => {
    if (!sectorForm.nombreSector) return;
    addSector({
      id: nextId(sectores),
      nombreSector: sectorForm.nombreSector,
      descripcion: sectorForm.descripcion,
      estado: (sectorForm.estado as SectorIndustria["estado"]) || "Activo"
    });
    setSectorForm({ nombreSector: "", descripcion: "", estado: "Activo" });
    setMessage("Sector agregado.");
  };

  const handleAddRelacion = () => {
    if (!relacionForm.nombre) return;
    addRelacion({
      id: nextId(relaciones),
      nombre: relacionForm.nombre,
      descripcion: relacionForm.descripcion
    });
    setRelacionForm({ nombre: "", descripcion: "" });
    setMessage("Relación comercial agregada.");
  };

  const handleAddCondicion = () => {
    if (!condicionForm.nombreCondicion) return;
    addCondicionPago({
      id: nextId(condicionesPago),
      nombreCondicion: condicionForm.nombreCondicion,
      descripcion: condicionForm.descripcion
    });
    setCondicionForm({ nombreCondicion: "", descripcion: "" });
    setMessage("Condición de pago agregada.");
  };

  const handleAddDocumento = () => {
    if (!docForm.nombreDocumento) return;
    addDocumentoDef({
      id: nextId(documentosDef),
      nombreDocumento: docForm.nombreDocumento,
      aplicaA: docForm.aplicaA as DocumentoClienteDefinicion["aplicaA"],
      esObligatorio: Boolean(docForm.esObligatorio),
      tieneVencimiento: Boolean(docForm.tieneVencimiento)
    });
    setDocForm({
      nombreDocumento: "",
      aplicaA: "Todos",
      esObligatorio: false,
      tieneVencimiento: false
    });
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
          <CardTitle>Tipos de cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 overflow-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Nombre</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Estado</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {tiposCliente.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-2 text-sm font-semibold text-slate-900">{t.nombreTipo}</td>
                    <td className="px-4 py-2">
                      <Badge variant={t.estado === "Activo" ? "success" : "neutral"}>{t.estado}</Badge>
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700">{t.descripcion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3">
            <input
              placeholder="Nombre del tipo"
              value={tipoForm.nombreTipo}
              onChange={(e) => setTipoForm({ ...tipoForm, nombreTipo: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <textarea
              placeholder="Descripción"
              value={tipoForm.descripcion}
              onChange={(e) => setTipoForm({ ...tipoForm, descripcion: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <select
              value={tipoForm.estado}
              onChange={(e) => setTipoForm({ ...tipoForm, estado: e.target.value as TipoCliente["estado"] })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
            <button
              onClick={handleAddTipo}
              className="w-full rounded-xl bg-brand-primary px-4 py-2 text-white font-semibold shadow-sm hover:shadow-md"
            >
              Guardar tipo
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sectores / Industrias</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 overflow-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Sector</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Estado</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {sectores.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 text-sm font-semibold text-slate-900">{s.nombreSector}</td>
                    <td className="px-4 py-2">
                      <Badge variant={s.estado === "Activo" ? "success" : "neutral"}>{s.estado}</Badge>
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-700">{s.descripcion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3">
            <input
              placeholder="Nombre del sector"
              value={sectorForm.nombreSector}
              onChange={(e) => setSectorForm({ ...sectorForm, nombreSector: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <textarea
              placeholder="Descripción"
              value={sectorForm.descripcion}
              onChange={(e) => setSectorForm({ ...sectorForm, descripcion: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <select
              value={sectorForm.estado}
              onChange={(e) => setSectorForm({ ...sectorForm, estado: e.target.value as SectorIndustria["estado"] })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
            <button
              onClick={handleAddSector}
              className="w-full rounded-xl bg-brand-primary px-4 py-2 text-white font-semibold shadow-sm hover:shadow-md"
            >
              Guardar sector
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipos de relación comercial</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-2">
            {relaciones.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-200 p-3 bg-white">
                <p className="text-sm font-semibold text-slate-900">{r.nombre}</p>
                <p className="text-xs text-slate-500">{r.descripcion}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <input
              placeholder="Nombre"
              value={relacionForm.nombre}
              onChange={(e) => setRelacionForm({ ...relacionForm, nombre: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <textarea
              placeholder="Descripción"
              value={relacionForm.descripcion}
              onChange={(e) => setRelacionForm({ ...relacionForm, descripcion: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <button
              onClick={handleAddRelacion}
              className="w-full rounded-xl bg-brand-primary px-4 py-2 text-white font-semibold shadow-sm hover:shadow-md"
            >
              Guardar relación
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Condiciones de pago</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-2">
            {condicionesPago.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 p-3 bg-white">
                <p className="text-sm font-semibold text-slate-900">{c.nombreCondicion}</p>
                <p className="text-xs text-slate-500">{c.descripcion}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <input
              placeholder="Nombre de la condición"
              value={condicionForm.nombreCondicion}
              onChange={(e) => setCondicionForm({ ...condicionForm, nombreCondicion: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <textarea
              placeholder="Descripción"
              value={condicionForm.descripcion}
              onChange={(e) => setCondicionForm({ ...condicionForm, descripcion: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <button
              onClick={handleAddCondicion}
              className="w-full rounded-xl bg-brand-primary px-4 py-2 text-white font-semibold shadow-sm hover:shadow-md"
            >
              Guardar condición
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
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Aplica a</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Obligatorio</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Vencimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {documentosDef.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-2 text-sm font-semibold text-slate-900">{d.nombreDocumento}</td>
                    <td className="px-4 py-2 text-sm text-slate-700">{d.aplicaA}</td>
                    <td className="px-4 py-2 text-sm text-slate-700">{d.esObligatorio ? "Sí" : "No"}</td>
                    <td className="px-4 py-2 text-sm text-slate-700">{d.tieneVencimiento ? "Sí" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3">
            <input
              placeholder="Nombre del documento"
              value={docForm.nombreDocumento}
              onChange={(e) => setDocForm({ ...docForm, nombreDocumento: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <select
              value={docForm.aplicaA}
              onChange={(e) =>
                setDocForm({ ...docForm, aplicaA: e.target.value as DocumentoClienteDefinicion["aplicaA"] })
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="Todos">Todos</option>
              <option value="Empresa">Empresa</option>
              <option value="Persona">Persona</option>
              <option value="Institución">Institución</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(docForm.esObligatorio)}
                onChange={(e) => setDocForm({ ...docForm, esObligatorio: e.target.checked })}
              />
              Obligatorio
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(docForm.tieneVencimiento)}
                onChange={(e) => setDocForm({ ...docForm, tieneVencimiento: e.target.checked })}
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
