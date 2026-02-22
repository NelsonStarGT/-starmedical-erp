import type { CompanyDetailQuery, CompanyListQuery } from "@/lib/companies/schema/company.zod";
import { getCompanyDetailRepo, listCompaniesRepo } from "@/lib/companies/repositories/company.repo";

export type CompanyDetailInput = CompanyDetailQuery & {
  companyId: string;
};

export async function listCompanies(input: CompanyListQuery) {
  return listCompaniesRepo(input);
}

export async function getCompanyDetail(input: CompanyDetailInput) {
  return getCompanyDetailRepo(input);
}
