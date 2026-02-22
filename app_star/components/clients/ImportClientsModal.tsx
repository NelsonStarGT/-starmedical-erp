"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Cliente, TipoClienteValor } from "@/lib/types";

const getAge = (dateString?: string) => {
  if (!dateString) return null;
  const normalized = dateString.includes("/") ? dateString.split("/").reverse().join("-") : dateString;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Date.now() - date.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

type ParsedRow = {
  index: number;
  raw: Record<string, string>;
};

type SummaryRow = {
  index: number;
  tipo: string;
  accion: "Crear" | "Actualizar" | "Error";
  mensaje?: string;
  data?: Partial<Cliente>;
  tutorId?: number;
  tutorRelacion?: string;
  sheet: "empresas" | "personas";
};

type Props = {
  open: boolean;
  onClose: () => void;
  clientes: Cliente[];
  onApply: (rows: SummaryRow[]) => void;
};

export function ImportClientsModal({ open, onClose, clientes, onApply }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [message, setMessage] = useState("");

  const empresas = useMemo(
    () => clientes.filter((c) => c.tipoCliente === "Empresa" || c.tipoCliente === "Institución"),
    [clientes]
  );

  const handleDownloadTemplate = () => {
    const link = document.createElement("a");
    link.href = "/api/clientes/plantilla-excel";
    link.download = "plantilla_clientes.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleProcess = async () => {
    if (!file) return;
    setLoading(true);
    setMessage("");
    setSummary([]);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/clientes/importar", {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error("No se pudo procesar el archivo");
      const data = await res.json();
      const empresasRows: ParsedRow[] = data.empresas || [];
      const personasRows: ParsedRow[] = data.personas || [];
      const computedEmp = empresasRows.map((row) => deriveEmpresa(row, clientes));
      const computedPer = personasRows.map((row) => derivePersona(row, clientes, empresas));
      setSummary([...computedEmp, ...computedPer]);
    } catch (err) {
      setMessage("Error al procesar el archivo.");
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const create = summary.filter((r) => r.accion === "Crear").length;
    const update = summary.filter((r) => r.accion === "Actualizar").length;
    const error = summary.filter((r) => r.accion === "Error").length;
    return { create, update, error, total: summary.length };
  }, [summary]);

  const errorCsv = useMemo(() => {
    const errorRows = summary.filter((r) => r.accion === "Error");
    if (!errorRows.length) return "";
    const header = "index,tipo,accion,mensaje\n";
    const body = errorRows
      .map((r) => `${r.index},${r.tipo},${r.accion},${r.mensaje ? `"${r.mensaje}"` : ""}`)
      .join("\n");
    return header + body;
  }, [summary]);

  const handleApply = () => {
    onApply(summary);
    setMessage("Importación aplicada (mock).");
    setTimeout(() => {
      onClose();
      setSummary([]);
      setMessage("");
      setFile(null);
    }, 800);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Importar clientes desde Excel/CSV"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3 text-sm">
            <Badge variant="success">Crear: {totals.create}</Badge>
            <Badge variant="info">Actualizar: {totals.update}</Badge>
            <Badge variant="warning">Errores: {totals.error}</Badge>
            {errorCsv && (
              <button
                type="button"
                onClick={() => downloadErrors(errorCsv)}
                className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-white"
              >
                Descargar errores
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              Cerrar
            </button>
            <button
              onClick={handleApply}
              disabled={summary.length === 0}
              className="rounded-xl bg-brand-primary px-4 py-2 text-white text-sm font-semibold shadow-sm hover:shadow-md disabled:opacity-50"
            >
              Aplicar cambios
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm text-slate-700"
          />
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Descargar plantilla Excel
          </button>
          <button
            type="button"
            onClick={handleProcess}
            disabled={!file || loading}
            className="rounded-xl bg-brand-primary px-4 py-2 text-white text-sm font-semibold shadow-sm hover:shadow-md disabled:opacity-50"
          >
            {loading ? "Procesando..." : "Procesar"}
          </button>
        </div>
        {message && <div className="text-sm text-red-600">{message}</div>}
        {summary.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-700">
            Total filas: {totals.total} · Crear: {totals.create} · Actualizar: {totals.update} · Errores: {totals.error}
          </p>
            <div className="overflow-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">#</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Tipo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Acción</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Mensaje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {summary.slice(0, 10).map((row) => (
                    <tr key={row.index}>
                      <td className="px-3 py-2 text-sm text-slate-700">{row.index}</td>
                      <td className="px-3 py-2 text-sm text-slate-700">{row.tipo}</td>
                      <td className="px-3 py-2 text-sm">
                        <Badge
                          variant={
                            row.accion === "Crear" ? "success" : row.accion === "Actualizar" ? "info" : "warning"
                          }
                        >
                          {row.accion}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-700">{row.mensaje || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function deriveEmpresa(row: ParsedRow, clientes: Cliente[]): SummaryRow {
  const raw = row.raw;
  const tipo = (raw["tipo_cliente"] || "").trim();
  if (!tipo || (tipo !== "Empresa" && tipo !== "Institucion" && tipo !== "Institución")) {
    return { index: row.index, tipo, accion: "Error", mensaje: "tipo_cliente debe ser Empresa o Institucion", sheet: "empresas" };
  }
  const nit = raw["nit_empresa"];
  const codigo = raw["codigo_empresa"];
  if (!nit && !codigo) {
    return { index: row.index, tipo, accion: "Error", mensaje: "nit_empresa o codigo_empresa requerido", sheet: "empresas" };
  }
  const match = clientes.find(
    (c) =>
      (c.tipoCliente === "Empresa" || c.tipoCliente === "Institución") &&
      (((c.nit || "").toLowerCase() === (nit || "").toLowerCase() && nit) ||
        ((c.codigoInternoCliente || "").toLowerCase() === (codigo || "").toLowerCase() && codigo))
  );

  if (!raw["nombre_comercial"] && !raw["razon_social"] && !match) {
    return { index: row.index, tipo, accion: "Error", mensaje: "Nombre comercial o razón social requerido al crear", sheet: "empresas" };
  }

  const data: Partial<Cliente> = {
    tipoCliente: tipo === "Institucion" ? ("Institución" as TipoClienteValor) : ("Empresa" as TipoClienteValor),
    nombreComercial: raw["nombre_comercial"],
    razonSocial: raw["razon_social"],
    nit,
    codigoInternoCliente: codigo,
    estadoCliente: (raw["estado_cliente"] as any) || "Activo",
    emailCorporativo: raw["email_corporativo"],
    telefonoCorporativo: raw["telefono_corporativo"],
    ciudad: raw["ciudad"],
    departamento: raw["departamento"],
    pais: raw["pais"],
    direccionFiscal: raw["direccion_fiscal"],
    direccionComercial: raw["direccion_comercial"]
  };

  return {
    index: row.index,
    tipo,
    accion: match ? "Actualizar" : "Crear",
    data,
    sheet: "empresas",
    mensaje: match ? "Coincide por NIT/Código" : undefined
  };
}

function derivePersona(row: ParsedRow, clientes: Cliente[], empresas: Cliente[]): SummaryRow {
  const raw = row.raw;
  const tipo = (raw["tipo_cliente"] || "").trim();
  if (!tipo || (tipo !== "Persona" && tipo !== "Empleado")) {
    return { index: row.index, tipo, accion: "Error", mensaje: "tipo_cliente debe ser Persona o Empleado", sheet: "personas" };
  }
  const dpi = raw["dpi_persona"];
  if (!dpi) {
    return { index: row.index, tipo, accion: "Error", mensaje: "dpi_persona requerido", sheet: "personas" };
  }
  if (!/^\d{13}$/.test(dpi)) {
    return { index: row.index, tipo, accion: "Error", mensaje: "dpi_persona debe tener 13 dígitos", sheet: "personas" };
  }
  const persona = clientes.find(
    (c) => c.tipoCliente === "Persona" && (c.nit || "").toLowerCase() === dpi.toLowerCase()
  );

  // Calcular edad para determinar si es menor
  const age = getAge(raw["fecha_nacimiento"]);

  const nitEmpresa = raw["nit_empresa"];
  const codigoEmpresa = raw["codigo_empresa"];
  const empresa = empresas.find(
    (e) =>
      ((e.nit || "").toLowerCase() === (nitEmpresa || "").toLowerCase() && nitEmpresa) ||
      ((e.codigoInternoCliente || "").toLowerCase() === (codigoEmpresa || "").toLowerCase() && codigoEmpresa)
  );
  if ((nitEmpresa || codigoEmpresa) && !empresa) {
    return { index: row.index, tipo, accion: "Error", mensaje: "Empresa vinculada no encontrada", sheet: "personas" };
  }

  if (!persona && (!raw["primer_nombre"] || !raw["primer_apellido"] || !raw["fecha_nacimiento"] || !raw["sexo"] || !raw["celular"])) {
    return { index: row.index, tipo, accion: "Error", mensaje: "Faltan campos obligatorios para crear persona", sheet: "personas" };
  }

  let tutorId: number | undefined;
  if (age !== null && age < 18) {
    const dpiTutor = raw["dpi_tutor"];
    if (!dpiTutor) return { index: row.index, tipo, accion: "Error", mensaje: "dpi_tutor requerido para menor de edad", sheet: "personas" };
    if (!/^\d{13}$/.test(dpiTutor)) {
      return { index: row.index, tipo, accion: "Error", mensaje: "dpi_tutor debe tener 13 dígitos", sheet: "personas" };
    }
    const tutor = clientes.find(
      (c) => c.tipoCliente === "Persona" && (c.nit || "").toLowerCase() === dpiTutor.toLowerCase()
    );
    if (!tutor) {
      return { index: row.index, tipo, accion: "Error", mensaje: "Tutor no existe en el sistema", sheet: "personas" };
    }
    const tutorAge = getAge(tutor.fechaNacimiento);
    if (tutorAge !== null && tutorAge < 18) {
      return { index: row.index, tipo, accion: "Error", mensaje: "Tutor es menor de edad", sheet: "personas" };
    }
    tutorId = tutor.id;
  }

  const data: Partial<Cliente> = {
    tipoCliente: "Persona",
    primerNombre: raw["primer_nombre"],
    segundoNombre: raw["segundo_nombre"],
    tercerNombre: raw["tercer_nombre"],
    primerApellido: raw["primer_apellido"],
    segundoApellido: raw["segundo_apellido"],
    apellidoCasada: raw["apellido_casada"],
    fechaNacimiento: raw["fecha_nacimiento"],
    sexo: raw["sexo"],
    contactoPrincipalTelefono: raw["celular"],
    telefono: raw["telefono"],
    contactoPrincipalCorreo: raw["email"],
    estadoCivil: raw["estado_civil"],
    ocupacion: raw["ocupacion"],
    lugarTrabajo: raw["lugar_trabajo"],
    nacionalidad: raw["nacionalidad"],
    empresaAsociadaId: empresa?.id,
    nit: dpi
  };

  return {
    index: row.index,
    tipo,
    accion: persona ? "Actualizar" : "Crear",
    data,
    sheet: "personas",
    tutorId,
    tutorRelacion: raw["tipo_relacion"],
    mensaje: persona ? "Persona encontrada por DPI/NIT" : empresa ? "Vinculada a empresa" : undefined
  };
}

function downloadErrors(csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "errores_importacion.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
