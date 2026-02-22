import { NextRequest, NextResponse } from "next/server";
import { ClientProfileType, PatientSex, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDiagnosticsIntakeRole } from "@/lib/api/diagnostics";

export const runtime = "nodejs";

const patientSchema = z.object({
  firstName: z.string().min(1, "Nombre requerido"),
  lastName: z.string().optional(),
  sex: z.nativeEnum(PatientSex).optional(),
  birthDate: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  dpi: z.string().optional()
});

type PatientInput = z.infer<typeof patientSchema>;

function normalizePatient(input: PatientInput) {
  return {
    firstName: input.firstName.trim(),
    lastName: input.lastName?.trim() || null,
    sex: input.sex || null,
    birthDate: input.birthDate ? new Date(input.birthDate) : null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    address: input.address?.trim() || null,
    dpi: input.dpi?.trim() || null
  };
}

async function findStrongDuplicate(tx: Prisma.TransactionClient, input: ReturnType<typeof normalizePatient>) {
  const or: Prisma.ClientProfileWhereInput[] = [];
  if (input.dpi) or.push({ dpi: input.dpi });
  if (input.phone) or.push({ phone: input.phone });
  if (!or.length) return null;
  return tx.clientProfile.findFirst({
    where: { OR: or },
    select: { id: true, firstName: true, lastName: true, dpi: true, phone: true, email: true }
  });
}

async function findPossibleDuplicates(tx: Prisma.TransactionClient, input: ReturnType<typeof normalizePatient>) {
  const or: Prisma.ClientProfileWhereInput[] = [];
  if (input.email) or.push({ email: { equals: input.email, mode: "insensitive" } });
  if (input.firstName && input.lastName) {
    or.push({ firstName: { equals: input.firstName, mode: "insensitive" }, lastName: { equals: input.lastName, mode: "insensitive" } });
  }
  if (!or.length) return [];
  return tx.clientProfile.findMany({
    where: { OR: or },
    take: 5,
    orderBy: { updatedAt: "desc" },
    select: { id: true, firstName: true, lastName: true, phone: true, dpi: true, email: true }
  });
}

export async function POST(req: NextRequest) {
  const auth = requireDiagnosticsIntakeRole(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json().catch(() => null);
    const parsed = patientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Payload inválido" }, { status: 400 });
    }

    const input = normalizePatient(parsed.data);
    if (input.birthDate && Number.isNaN(input.birthDate.getTime())) {
      return NextResponse.json({ error: "Fecha de nacimiento inválida" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const duplicate = await findStrongDuplicate(tx, input);
      if (duplicate) {
        const err: any = new Error("Paciente ya existe con DPI o teléfono");
        err.status = 409;
        err.code = "DUPLICATE_STRONG";
        err.matches = [duplicate];
        throw err;
      }

      const possible = await findPossibleDuplicates(tx, input);

      const patient = await tx.clientProfile.create({
        data: {
          type: ClientProfileType.PERSON,
          firstName: input.firstName,
          lastName: input.lastName,
          sex: input.sex,
          birthDate: input.birthDate,
          phone: input.phone,
          email: input.email,
          address: input.address,
          dpi: input.dpi
        }
      });

      return { patient, warnings: possible };
    });

    return NextResponse.json({ data: result.patient, warnings: result.warnings || [] }, { status: 201 });
  } catch (err: any) {
    if (err?.status) {
      return NextResponse.json({ error: err.message, code: err.code, matches: err.matches || [] }, { status: err.status });
    }
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un paciente con DPI/NIT duplicado" }, { status: 409 });
    }
    console.error("create reception patient error", err);
    return NextResponse.json({ error: "No se pudo crear el paciente" }, { status: 500 });
  }
}
