import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs"; // exceljs sustituye a xlsx por seguridad

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
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const sheetEmpresas = workbook.getWorksheet("EMPRESAS_INSTITUCIONES");
    const sheetPersonas = workbook.getWorksheet("PERSONAS_PACIENTES");

    const empresas = sheetEmpresas ? readEmpresas(sheetEmpresas) : [];
    const personas = sheetPersonas ? readPersonas(sheetPersonas) : [];

    return NextResponse.json({ empresas, personas });
  } catch (error) {
    console.error("Error procesando Excel", error);
    return NextResponse.json({ error: "No se pudo procesar el archivo" }, { status: 500 });
  }
}

const getVal = (row: ExcelJS.Row, col: number) => String(row.getCell(col).value ?? "").trim();

function readEmpresas(sheet: ExcelJS.Worksheet) {
  const results: Array<{ index: number; data: RowEmpresa; error?: string }> = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // encabezados
    const data: RowEmpresa = {
      tipo_cliente: getVal(row, 1),
      nit_empresa: getVal(row, 2),
      codigo_empresa: getVal(row, 3),
      nombre_comercial: getVal(row, 4),
      razon_social: getVal(row, 5),
      sector: getVal(row, 6),
      estado_cliente: getVal(row, 7),
      email_corporativo: getVal(row, 8),
      telefono_corporativo: getVal(row, 9),
      ciudad: getVal(row, 10),
      departamento: getVal(row, 11),
      pais: getVal(row, 12),
      direccion_fiscal: getVal(row, 13),
      direccion_comercial: getVal(row, 14)
    };

    let error: string | undefined;
    if (!data.tipo_cliente || !["Empresa", "Institucion", "Institución"].includes(data.tipo_cliente)) {
      error = "tipo_cliente requerido (Empresa o Institucion)";
    } else if (!data.nit_empresa && !data.codigo_empresa) {
      error = "nit_empresa o codigo_empresa requerido";
    } else if (!data.nombre_comercial && !data.razon_social) {
      error = "nombre_comercial o razon_social requerido al crear";
    }
    results.push({ index: rowNumber - 1, data, error });
  });
  return results;
}

function readPersonas(sheet: ExcelJS.Worksheet) {
  const results: Array<{ index: number; data: RowPersona; error?: string }> = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // encabezados
    const data: RowPersona = {
    tipo_cliente: getVal(row, 1),
    dpi_persona: getVal(row, 2),
    dpi_tutor: getVal(row, 3),
    primer_nombre: getVal(row, 4),
    segundo_nombre: getVal(row, 5),
    tercer_nombre: getVal(row, 6),
    primer_apellido: getVal(row, 7),
    segundo_apellido: getVal(row, 8),
    apellido_casada: getVal(row, 9),
    fecha_nacimiento: getVal(row, 10),
    sexo: getVal(row, 11),
    celular: getVal(row, 12),
    telefono: getVal(row, 13),
    email: getVal(row, 14),
    estado_civil: getVal(row, 15),
    ocupacion: getVal(row, 16),
    lugar_trabajo: getVal(row, 17),
    nacionalidad: getVal(row, 18),
    nit_empresa: getVal(row, 19),
    codigo_empresa: getVal(row, 20),
    tipo_relacion: getVal(row, 21)
  };

  let error: string | undefined;
  if (!data.tipo_cliente || !["Persona", "Empleado"].includes(data.tipo_cliente)) {
    error = "tipo_cliente requerido (Persona o Empleado)";
  } else if (!data.dpi_persona) {
    error = "dpi_persona requerido";
  } else if (!/^\d{13}$/.test(data.dpi_persona)) {
    error = "dpi_persona debe tener 13 dígitos";
  } else if (
    !data.primer_nombre ||
    !data.primer_apellido ||
    !data.fecha_nacimiento ||
    !data.sexo ||
    !data.celular
  ) {
    error = "Faltan campos obligatorios para crear persona";
  } else {
    const age = getAge(data.fecha_nacimiento);
    if (age !== null && age < 18) {
      if (!data.dpi_tutor) error = "dpi_tutor requerido para menor de edad";
      else if (!/^\d{13}$/.test(data.dpi_tutor)) error = "dpi_tutor debe tener 13 dígitos";
    }
  }
  results.push({ index: rowNumber - 1, data, error });
  });
  return results;
}
