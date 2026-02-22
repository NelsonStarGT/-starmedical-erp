import { ClientCatalogType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import InstitutionCreateForm from "@/components/clients/InstitutionCreateForm";

export default async function NuevaInstitucionPage() {
  const institutionTypes = await prisma.clientCatalogItem.findMany({
    where: { type: ClientCatalogType.INSTITUTION_TYPE, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true }
  });

  return <InstitutionCreateForm initialTypes={institutionTypes} />;
}

