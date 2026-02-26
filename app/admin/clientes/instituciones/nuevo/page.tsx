import { cookies } from "next/headers";
import { ClientCatalogType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import InstitutionCreateForm from "@/components/clients/InstitutionCreateForm";
import { getSessionUserFromCookies } from "@/lib/auth";
import { getOperatingCountryDefaults } from "@/lib/clients/operatingCountryDefaults.server";
import { tenantIdFromUser } from "@/lib/tenant";

export default async function NuevaInstitucionPage() {
  const currentUser = await getSessionUserFromCookies(cookies());
  const institutionTypes = await prisma.clientCatalogItem.findMany({
    where: { type: ClientCatalogType.INSTITUTION_TYPE, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true }
  });
  const operatingDefaults = await getOperatingCountryDefaults(tenantIdFromUser(currentUser));

  return <InstitutionCreateForm initialTypes={institutionTypes} initialOperatingDefaults={operatingDefaults} />;
}
