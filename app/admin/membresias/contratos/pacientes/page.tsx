import { ContractsTableView } from "@/components/memberships/ContractsTableView";

export default function MembershipContractsPatientsPage() {
  return (
    <ContractsTableView
      ownerType="PERSON"
      title="Afiliaciones · Pacientes (B2C)"
      description="Operación de afiliaciones individuales/familiares. Cobro y aplicación de pagos ocurre en Facturación/Finanzas."
    />
  );
}
