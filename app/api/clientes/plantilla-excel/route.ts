import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { exportExcelViaProcessingService } from "@/lib/processing-service/excel";

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

export async function GET(req: NextRequest) {
  const user = getSessionUser(req);
  const { buffer } = await exportExcelViaProcessingService({
    context: {
      tenantId: user?.tenantId,
      actorId: user?.id
    },
    fileName: "plantilla_clientes.xlsx",
    sheets: [
      {
        name: "EMPRESAS_INSTITUCIONES",
        headers: empresasHeaders,
        rows: [
          [
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
          ]
        ]
      },
      {
        name: "PERSONAS_PACIENTES",
        headers: personasHeaders,
        rows: [
          [
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
          ]
        ]
      }
    ],
    limits: {
      maxFileMb: 8,
      maxRows: 5_000,
      maxCols: 80,
      timeoutMs: 15_000
    }
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Disposition": "attachment; filename=plantilla_clientes.xlsx",
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
  });
}
