import { CompanyListEngine } from "@/lib/companies/list/CompanyListEngine";
import type { CompanyListPageSearchParams } from "@/lib/companies/list/searchParams";

export default function InstitucionesModulePage({ searchParams }: { searchParams?: CompanyListPageSearchParams }) {
  return (
    <CompanyListEngine
      kind="INSTITUTION"
      basePath="/admin/empresas/instituciones"
      title="Instituciones"
      searchParams={searchParams}
    />
  );
}
