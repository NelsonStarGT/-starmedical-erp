import { ContractsTableView } from "@/components/memberships/ContractsTableView";

export default function MembershipContractsCompaniesPage() {
  return (
    <div className="space-y-3">
      <ContractsTableView
        ownerType="COMPANY"
        title="Contratos · Empresas (B2B)"
        description="Gestión de contratos corporativos."
      />

      <section className="rounded-xl border border-dashed border-slate-300 bg-[#F8FAFC] p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#2e75ba]">Cupos (próximo)</h3>
        <p className="mt-1 text-xs text-slate-600">
          Placeholder preparado para administrar cupos por empresa cuando el modelo sea aprobado.
        </p>
      </section>
    </div>
  );
}
