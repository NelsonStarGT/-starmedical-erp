import { ContractsTableView } from "@/components/memberships/ContractsTableView";

export default function MembershipContractsCompaniesPage() {
  return (
    <ContractsTableView
      ownerType="COMPANY"
      title="Gestión · Empresas (B2B)"
      description="Operación de afiliaciones corporativas."
    />
  );
}
