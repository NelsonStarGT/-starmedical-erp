import { CompanyListEngine } from "@/lib/companies/list/CompanyListEngine";
import type { CompanyListPageSearchParams } from "@/lib/companies/list/searchParams";

export default function AseguradorasModulePage({ searchParams }: { searchParams?: CompanyListPageSearchParams }) {
  return (
    <CompanyListEngine
      kind="INSURER"
      basePath="/admin/empresas/aseguradoras"
      title="Aseguradoras"
      searchParams={searchParams}
    />
  );
}
