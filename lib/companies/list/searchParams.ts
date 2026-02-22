import { CompanyContractStatus, CompanyStatus } from "@prisma/client";

export type CompanyListPageSearchParams = Record<string, string | string[] | undefined>;

export type ParsedCompanyListParams = {
  q: string;
  status: CompanyStatus | "";
  contractStatus: CompanyContractStatus | "";
  includeArchived: boolean;
  page: number;
  pageSize: number;
};

function single(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function parseBool(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function parseStatus(value: string): CompanyStatus | "" {
  const statuses: CompanyStatus[] = ["DRAFT", "ACTIVE", "INACTIVE", "SUSPENDED", "ARCHIVED"];
  return statuses.includes(value as CompanyStatus) ? (value as CompanyStatus) : "";
}

function parseContractStatus(value: string): CompanyContractStatus | "" {
  const statuses: CompanyContractStatus[] = ["PENDING", "ACTIVE", "SUSPENDED", "EXPIRED", "TERMINATED"];
  return statuses.includes(value as CompanyContractStatus) ? (value as CompanyContractStatus) : "";
}

export function parseCompanyListSearchParams(searchParams?: CompanyListPageSearchParams): ParsedCompanyListParams {
  const q = single(searchParams?.q).trim();
  const status = parseStatus(single(searchParams?.status));
  const contractStatus = parseContractStatus(single(searchParams?.contractStatus));
  const includeArchived = parseBool(single(searchParams?.includeArchived));

  const page = Math.max(1, Number.parseInt(single(searchParams?.page), 10) || 1);
  const pageSize = Math.min(100, Math.max(10, Number.parseInt(single(searchParams?.pageSize), 10) || 25));

  return {
    q,
    status,
    contractStatus,
    includeArchived,
    page,
    pageSize
  };
}
