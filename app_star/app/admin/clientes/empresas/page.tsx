import { ClientListEngine, createClientListConfig, type ClientListPageSearchParams } from "@/lib/clients/list/ClientListEngine";

export default async function EmpresasListPage({
  searchParams
}: {
  searchParams?: Promise<ClientListPageSearchParams | undefined> | ClientListPageSearchParams;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  return <ClientListEngine config={createClientListConfig("COMPANY")} searchParams={resolvedSearchParams} />;
}
