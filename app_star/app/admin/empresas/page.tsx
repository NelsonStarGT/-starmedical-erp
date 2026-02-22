import { CompanyListEngine } from "@/lib/companies/list/CompanyListEngine";
import type { CompanyListPageSearchParams } from "@/lib/companies/list/searchParams";

export default function EmpresasModulePage({ searchParams }: { searchParams?: CompanyListPageSearchParams }) {
  return <CompanyListEngine kind="COMPANY" basePath="/admin/empresas" title="Empresas" searchParams={searchParams} />;
}
