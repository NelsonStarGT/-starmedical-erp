import { prisma } from "@/lib/prisma";
import { ClientProfileType, Prisma } from "@prisma/client";

type LinkInput = {
  type: ClientProfileType;
  companyName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  nit?: string | null;
  dpi?: string | null;
  email?: string | null;
  phone?: string | null;
};

export async function linkOrCreateClientProfile(input: LinkInput) {
  const nit = input.nit?.trim() || null;
  const email = input.email?.trim() || null;
  const phone = input.phone?.trim() || null;
  const dpi = input.dpi?.trim() || null;
  const companyName = input.companyName?.trim() || null;

  let existing = null;
  if (nit) {
    existing = await prisma.clientProfile.findFirst({ where: { nit } });
  }
  if (!existing && dpi) {
    existing = await prisma.clientProfile.findFirst({ where: { dpi } });
  }
  if (!existing && email && phone) {
    existing = await prisma.clientProfile.findFirst({
      where: {
        email,
        phone
      }
    });
  }
  if (!existing && input.type === ClientProfileType.COMPANY && companyName && (phone || email)) {
    existing = await prisma.clientProfile.findFirst({
      where: {
        type: ClientProfileType.COMPANY,
        companyName,
        OR: [
          phone ? { phone } : undefined,
          email ? { email } : undefined
        ].filter(Boolean) as any
      }
    });
  }

  if (existing) return existing;

  return prisma.clientProfile.create({
    data: {
      type: input.type,
      companyName: input.companyName || null,
      firstName: input.firstName || null,
      lastName: input.lastName || null,
      nit,
      dpi,
      email,
      phone
    }
  });
}
