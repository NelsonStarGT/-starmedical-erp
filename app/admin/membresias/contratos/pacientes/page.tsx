import { ContractsTableView } from "@/components/memberships/ContractsTableView";

export default function MembershipContractsPatientsPage() {
  return (
    <ContractsTableView
      ownerType="PERSON"
      title="Contratos · Pacientes (B2C)"
      description="Gestión de contratos individuales/familiares. Cobro y aplicación de pagos ocurre en Facturación/Finanzas."
    />
  );
}
