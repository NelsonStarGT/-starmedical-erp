import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

const empresasHeaders = [
  "tipo_cliente",
  "nit_empresa",
  "codigo_empresa",
  "nombre_comercial",
  "razon_social",
  "sector",
  "estado_cliente",
  "email_corporativo",
  "telefono_corporativo",
  "ciudad",
  "departamento",
  "pais",
  "direccion_fiscal",
  "direccion_comercial"
];

const personasHeaders = [
  "tipo_cliente",
  "dpi_persona",
  "dpi_tutor",
  "primer_nombre",
  "segundo_nombre",
  "tercer_nombre",
  "primer_apellido",
  "segundo_apellido",
  "apellido_casada",
  "fecha_nacimiento",
  "sexo",
  "celular",
  "telefono",
  "email",
  "estado_civil",
  "ocupacion",
  "lugar_trabajo",
  "nacionalidad",
  "nit_empresa",
  "codigo_empresa",
  "tipo_relacion"
];

export async function GET() {
  // exceljs reemplaza xlsx para mitigar vulnerabilidad reportada
  const workbook = new ExcelJS.Workbook();
  const empresasSheet = workbook.addWorksheet("EMPRESAS_INSTITUCIONES");
  const personasSheet = workbook.addWorksheet("PERSONAS_PACIENTES");

  empresasSheet.addRow(empresasHeaders);
  personasSheet.addRow(personasHeaders);

  // Filas de ejemplo opcionales
  empresasSheet.addRow([
    "Empresa",
    "8990023-1",
    "CLI-001",
    "Ejemplo Corp",
    "Ejemplo Corp S.A.",
    "Industrial",
    "Activo",
    "contacto@ejemplo.com",
    "5555-0000",
    "Palín",
    "Escuintla",
    "Guatemala",
    "Zona industrial 5",
    "Km 20 Ruta al Pacífico"
  ]);

  personasSheet.addRow([
    "Persona",
    "1234567890101",
    "8990023123456",
    "Ana",
    "Lucía",
    "",
    "Torres",
    "",
    "",
    "12/03/1988",
    "Femenino",
    "5555-3030",
    "",
    "ana.torres@gmail.com",
    "Soltero",
    "Ingeniera",
    "Industrial Norte",
    "Guatemala",
    "8990023-1",
    "CLI-001",
    "Empleado"
  ]);

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Disposition": "attachment; filename=plantilla_clientes.xlsx",
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
  });
}
