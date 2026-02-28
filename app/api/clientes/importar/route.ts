import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { canAnalyzeClientImport } from "@/lib/clients/bulk/permissions";
import { recordClientsAccessBlocked } from "@/lib/clients/securityEvents";
import { importExcelViaProcessingService } from "@/lib/processing-service/excel";

type RowEmpresa = {
  tipo_cliente?: string;
  nit_empresa?: string;
  codigo_empresa?: string;
  nombre_comercial?: string;
  razon_social?: string;
  sector?: string;
  estado_cliente?: string;
  email_corporativo?: string;
  telefono_corporativo?: string;
  ciudad?: string;
  departamento?: string;
  pais?: string;
  direccion_fiscal?: string;
  direccion_comercial?: string;
};

type RowPersona = {
  tipo_cliente?: string;
  dpi_persona?: string;
  dpi_tutor?: string;
  primer_nombre?: string;
  segundo_nombre?: string;
  tercer_nombre?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  apellido_casada?: string;
  fecha_nacimiento?: string;
  sexo?: string;
  celular?: string;
  telefono?: string;
  email?: string;
  estado_civil?: string;
  ocupacion?: string;
  lugar_trabajo?: string;
  nacionalidad?: string;
  nit_empresa?: string;
  codigo_empresa?: string;
  tipo_relacion?: string;
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const getAge = (dateString?: string) => {
  if (!dateString) return null;
  const normalized = dateString.includes("/") ? dateString.split("/").reverse().join("-") : dateString;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Date.now() - date.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  if (!canAnalyzeClientImport(auth.user)) {
    await recordClientsAccessBlocked({
      user: auth.user,
      route: "/api/clientes/importar",
      capability: "CLIENTS_IMPORT_ANALYZE",
      resourceType: "bulk_import"
    });
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Content-Type inválido" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Archivo no proporcionado" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "Archivo demasiado grande (máx 5MB)" }, { status: 400 });
  }

  if (file.type && file.type !== ALLOWED_MIME) {
    return NextResponse.json({ error: "Solo se admite .xlsx" }, { status: 400 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const imported = await importExcelViaProcessingService({
      context: {
        tenantId: auth.user.tenantId,
        actorId: auth.user.id
      },
      fileBuffer: Buffer.from(arrayBuffer),
      template: "clientes_v1",
      limits: {
        maxFileMb: 8,
        maxRows: 5_000,
        maxCols: 80,
        timeoutMs: 15_000
      }
    });

    const payload = ((imported.job.result as Record<string, unknown>) || imported.artifactJson || {}) as {
      empresas?: Array<{ index: number; raw: RowEmpresa }>;
      personas?: Array<{ index: number; raw: RowPersona }>;
    };

    const empresas = readEmpresas(Array.isArray(payload.empresas) ? payload.empresas : []);
    const personas = readPersonas(Array.isArray(payload.personas) ? payload.personas : []);

    return NextResponse.json({ empresas, personas });
  } catch (error) {
    console.error("Error procesando Excel", error);
    return NextResponse.json({ error: "No se pudo procesar el archivo" }, { status: 500 });
  }
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function readEmpresas(rows: Array<{ index: number; raw: RowEmpresa }>) {
  const results: Array<{ index: number; data: RowEmpresa; error?: string }> = [];
  rows.forEach((source) => {
    const data: RowEmpresa = {
      tipo_cliente: clean(source.raw?.tipo_cliente),
      nit_empresa: clean(source.raw?.nit_empresa),
      codigo_empresa: clean(source.raw?.codigo_empresa),
      nombre_comercial: clean(source.raw?.nombre_comercial),
      razon_social: clean(source.raw?.razon_social),
      sector: clean(source.raw?.sector),
      estado_cliente: clean(source.raw?.estado_cliente),
      email_corporativo: clean(source.raw?.email_corporativo),
      telefono_corporativo: clean(source.raw?.telefono_corporativo),
      ciudad: clean(source.raw?.ciudad),
      departamento: clean(source.raw?.departamento),
      pais: clean(source.raw?.pais),
      direccion_fiscal: clean(source.raw?.direccion_fiscal),
      direccion_comercial: clean(source.raw?.direccion_comercial)
    };

    let error: string | undefined;
    if (!data.tipo_cliente || !["Empresa", "Institucion", "Institución"].includes(data.tipo_cliente)) {
      error = "tipo_cliente requerido (Empresa o Institucion)";
    } else if (!data.nit_empresa && !data.codigo_empresa) {
      error = "nit_empresa o codigo_empresa requerido";
    } else if (!data.nombre_comercial && !data.razon_social) {
      error = "nombre_comercial o razon_social requerido al crear";
    }
    results.push({ index: source.index, data, error });
  });
  return results;
}

function readPersonas(rows: Array<{ index: number; raw: RowPersona }>) {
  const results: Array<{ index: number; data: RowPersona; error?: string }> = [];
  rows.forEach((source) => {
    const data: RowPersona = {
      tipo_cliente: clean(source.raw?.tipo_cliente),
      dpi_persona: clean(source.raw?.dpi_persona),
      dpi_tutor: clean(source.raw?.dpi_tutor),
      primer_nombre: clean(source.raw?.primer_nombre),
      segundo_nombre: clean(source.raw?.segundo_nombre),
      tercer_nombre: clean(source.raw?.tercer_nombre),
      primer_apellido: clean(source.raw?.primer_apellido),
      segundo_apellido: clean(source.raw?.segundo_apellido),
      apellido_casada: clean(source.raw?.apellido_casada),
      fecha_nacimiento: clean(source.raw?.fecha_nacimiento),
      sexo: clean(source.raw?.sexo),
      celular: clean(source.raw?.celular),
      telefono: clean(source.raw?.telefono),
      email: clean(source.raw?.email),
      estado_civil: clean(source.raw?.estado_civil),
      ocupacion: clean(source.raw?.ocupacion),
      lugar_trabajo: clean(source.raw?.lugar_trabajo),
      nacionalidad: clean(source.raw?.nacionalidad),
      nit_empresa: clean(source.raw?.nit_empresa),
      codigo_empresa: clean(source.raw?.codigo_empresa),
      tipo_relacion: clean(source.raw?.tipo_relacion)
    };

    let error: string | undefined;
    if (!data.tipo_cliente || !["Persona", "Empleado"].includes(data.tipo_cliente)) {
      error = "tipo_cliente requerido (Persona o Empleado)";
    } else if (!data.dpi_persona) {
      error = "dpi_persona requerido";
    } else if (!/^\d{13}$/.test(data.dpi_persona)) {
      error = "dpi_persona debe tener 13 dígitos";
    } else if (!data.primer_nombre || !data.primer_apellido || !data.fecha_nacimiento || !data.sexo || !data.celular) {
      error = "Faltan campos obligatorios para crear persona";
    } else {
      const age = getAge(data.fecha_nacimiento);
      if (age !== null && age < 18) {
        if (!data.dpi_tutor) error = "dpi_tutor requerido para menor de edad";
        else if (!/^\d{13}$/.test(data.dpi_tutor)) error = "dpi_tutor debe tener 13 dígitos";
      }
    }

    results.push({ index: source.index, data, error });
  });
  return results;
}
