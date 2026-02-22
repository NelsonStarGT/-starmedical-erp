import { NextRequest, NextResponse } from "next/server";
import { ClientProfileType } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";

export const runtime = "nodejs";

const TEMPLATE_MAP: Record<ClientProfileType, { header: string[]; sample: string[]; filename: string }> = {
  [ClientProfileType.PERSON]: {
    header: ["first_name", "middle_name", "last_name", "second_last_name", "dpi", "phone", "email", "address"],
    sample: ["Ana", "Lucia", "Torres", "Lopez", "1234567890101", "55550000", "ana@example.com", "Zona 10"],
    filename: "plantilla-clientes-personas.csv"
  },
  [ClientProfileType.COMPANY]: {
    header: ["company_name", "trade_name", "nit", "phone", "email", "address", "city", "department", "country"],
    sample: [
      "Empresa Demo, S.A.",
      "Empresa Demo",
      "1234567-8",
      "55550001",
      "contacto@demo.com",
      "Zona 4",
      "Guatemala",
      "Guatemala",
      "Guatemala"
    ],
    filename: "plantilla-clientes-empresas.csv"
  },
  [ClientProfileType.INSTITUTION]: {
    header: ["company_name", "nit", "phone", "email", "address", "city", "department", "country", "institution_type"],
    sample: ["Institucion Demo", "1234567-9", "55550002", "info@inst.com", "Zona 1", "Guatemala", "Guatemala", "Guatemala", "Hospital"],
    filename: "plantilla-clientes-instituciones.csv"
  },
  [ClientProfileType.INSURER]: {
    header: ["company_name", "trade_name", "nit", "phone", "email", "address", "city", "department", "country"],
    sample: ["Aseguradora Demo", "Aseguradora Demo", "1234567-0", "55550003", "info@aseg.com", "Zona 15", "Guatemala", "Guatemala", "Guatemala"],
    filename: "plantilla-clientes-aseguradoras.csv"
  }
};

function sanitizeType(raw: string | null): ClientProfileType | null {
  if (raw === ClientProfileType.PERSON) return ClientProfileType.PERSON;
  if (raw === ClientProfileType.COMPANY) return ClientProfileType.COMPANY;
  if (raw === ClientProfileType.INSTITUTION) return ClientProfileType.INSTITUTION;
  if (raw === ClientProfileType.INSURER) return ClientProfileType.INSURER;
  return null;
}

function csvEscape(value: string) {
  if (value.includes(";") || value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  if (!auth.user || !isAdmin(auth.user)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const type = sanitizeType(req.nextUrl.searchParams.get("type")) ?? ClientProfileType.PERSON;
  const template = TEMPLATE_MAP[type];
  const csvRows = [template.header, template.sample].map((row) => row.map(csvEscape).join(";")).join("\n");
  const csv = `sep=;\n${csvRows}`;

  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${template.filename}"`
    }
  });
}
