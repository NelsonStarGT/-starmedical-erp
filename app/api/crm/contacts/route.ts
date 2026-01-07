import { NextRequest, NextResponse } from "next/server";
import { ClientProfileType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess } from "@/lib/api/crm";
import { linkOrCreateClientProfile } from "@/lib/api/crmLink";

export const dynamic = "force-dynamic";

type PhoneEntry = { country?: string; number?: string };

function normalize(body: any, requireAll = true) {
  const accountIdRaw = body.accountId !== undefined ? String(body.accountId || "") : undefined;
  const accountId = accountIdRaw && accountIdRaw.trim().length ? accountIdRaw.trim() : undefined;
  const type = body.type !== undefined ? String(body.type || "").toUpperCase() : undefined;
  const firstName = body.firstName !== undefined ? String(body.firstName || "").trim() : undefined;
  const lastName = body.lastName !== undefined ? String(body.lastName || "").trim() : undefined;
  const position = body.position !== undefined ? String(body.position || "").trim() : undefined;
  const email = body.email !== undefined ? String(body.email || "").trim() : undefined;
  const primaryPhone = body.phone !== undefined ? String(body.phone || "").trim() : undefined;
  const rawPhones: PhoneEntry[] = Array.isArray(body.phones) ? body.phones : [];
  const phones = rawPhones
    .map((p) => ({
      country: String(p.country || "+502").trim(),
      number: String(p.number || "").trim()
    }))
    .filter((p) => p.number.length > 0);
  const phone = primaryPhone !== undefined ? primaryPhone : phones[0] ? `${phones[0].country} ${phones[0].number}`.trim() : undefined;
  const createdById = body.createdById !== undefined ? String(body.createdById || "") : undefined;

  if (requireAll && !firstName) throw new Error("firstName requerido");
  return { accountId, type, firstName, lastName, position, email, phone, phones, createdById };
}

export async function GET(req: NextRequest) {
  const auth = ensureCrmAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const accountId = req.nextUrl.searchParams.get("accountId") || undefined;
    const clientId = req.nextUrl.searchParams.get("clientId") || undefined;
    const q = req.nextUrl.searchParams.get("q") || undefined;
    const phone = req.nextUrl.searchParams.get("phone") || undefined;
    const email = req.nextUrl.searchParams.get("email") || undefined;
    const where: Prisma.CrmContactWhereInput = {};
    if (accountId) where.accountId = accountId;
    if (clientId) where.clientId = clientId;
    if (phone) where.phone = { contains: phone, mode: Prisma.QueryMode.insensitive };
    if (email) where.email = { contains: email, mode: Prisma.QueryMode.insensitive };
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: Prisma.QueryMode.insensitive } },
        { lastName: { contains: q, mode: Prisma.QueryMode.insensitive } },
        { email: { contains: q, mode: Prisma.QueryMode.insensitive } },
        { phone: { contains: q, mode: Prisma.QueryMode.insensitive } }
      ];
    }
    const contacts = await prisma.crmContact.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: { account: true },
      orderBy: [{ createdAt: "desc" }]
    });
    return NextResponse.json({ data: contacts });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "No se pudieron obtener contactos";
    return NextResponse.json({ error: "No se pudieron obtener contactos", detail: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureCrmAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const { accountId, type, firstName, lastName, position, email, phone, phones, createdById } = normalize(body, true);
    const profile = await linkOrCreateClientProfile({
      type: ClientProfileType.PERSON,
      firstName: firstName!,
      lastName: lastName || null,
      email: email || null,
      phone: phone || null
    });
    const saved = await prisma.crmContact.create({
      data: {
        account: accountId ? { connect: { id: accountId } } : undefined,
        client: { connect: { id: profile.id } },
        type: type || "PERSON",
        firstName: firstName!,
        lastName: lastName || null,
        position: position || null,
        email: email || null,
        phone: phone || null,
        phonesJson: phones?.length ? phones : Prisma.JsonNull,
        createdById: createdById || auth.role || "Ventas"
      }
    });
    return NextResponse.json({ data: saved, client: profile });
  } catch (err: any) {
    console.error(err);
    const message = err?.message?.includes("Unknown argument") ? "No se pudo crear el contacto (datos inválidos)" : err?.message;
    return NextResponse.json({ error: message || "No se pudo crear el contacto" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = ensureCrmAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const id = body.id ? String(body.id) : "";
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const { accountId, type, firstName, lastName, position, email, phone, phones, createdById } = normalize(body, false);

    const data: any = {};
    if (accountId !== undefined) data.account = accountId ? { connect: { id: accountId } } : { disconnect: true };
    if (type !== undefined) data.type = type;
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (position !== undefined) data.position = position;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (phones !== undefined) data.phonesJson = phones?.length ? phones : Prisma.JsonNull;
    if (createdById !== undefined) data.createdById = createdById;
    if (!Object.keys(data).length) return NextResponse.json({ error: "Sin cambios" }, { status: 400 });

    const saved = await prisma.crmContact.update({ where: { id }, data });
    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2025") return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo actualizar el contacto" }, { status: 400 });
  }
}
