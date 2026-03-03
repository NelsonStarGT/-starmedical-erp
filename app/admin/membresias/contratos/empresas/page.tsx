import { ContractsTableView } from "@/components/memberships/ContractsTableView";

export default function MembershipContractsCompaniesPage() {
  return (
    <ContractsTableView
      ownerType="COMPANY"
      title="Afiliaciones · Empresas (B2B)"
      description="Operación de afiliaciones corporativas."
    />
  );
}
