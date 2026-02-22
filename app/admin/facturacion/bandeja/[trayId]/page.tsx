import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import BillingCaseFiltersForm from "@/components/facturacion/BillingCaseFiltersForm";
import BillingCaseTable from "@/components/facturacion/BillingCaseTable";
import BillingControlStrip from "@/components/facturacion/BillingControlStrip";
import BillingTrayCards from "@/components/facturacion/BillingTrayCards";
import { getSessionUserFromCookies } from "@/lib/auth";
import { canRunBillingSupervisorActions } from "@/lib/billing/access";
import { buildBillingControlSnapshot } from "@/lib/billing/operational";
import { isBillingTrayId, parseBillingFilters } from "@/lib/billing/query";
import {
  listBillingCases,
  listBillingCasesByTray,
  listBillingFilterOptions,
  listBillingStatsByTray
} from "@/lib/billing/service";
import { filterBillingCases, getBillingTrayConfig } from "@/lib/billing/workflow";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function FacturacionBandejaPage({
  params,
  searchParams
}: {
  params: Promise<{ trayId: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const cookieStore = await cookies();
  const user = await getSessionUserFromCookies(cookieStore);
  const canRunSupervisorActions = canRunBillingSupervisorActions(user);

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  if (!isBillingTrayId(resolvedParams.trayId)) {
    notFound();
  }

  const filters = parseBillingFilters(resolvedSearchParams);
  const tray = getBillingTrayConfig(resolvedParams.trayId);
  if (!tray) {
    notFound();
  }

  const trayStats = listBillingStatsByTray(filters);
  const cases = listBillingCasesByTray(resolvedParams.trayId, filters);
  const filterOptions = listBillingFilterOptions();
  const filteredUniverse = filterBillingCases(listBillingCases(), filters);
  const controlSnapshot = buildBillingControlSnapshot(filteredUniverse);

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Facturación · Torre de control</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-billing-heading)" }}>
          {tray.name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{tray.description}</p>
      </section>

      <BillingControlStrip snapshot={controlSnapshot} />

      <BillingTrayCards trays={trayStats} activeTrayId={resolvedParams.trayId} />

      <BillingCaseFiltersForm
        action={`/admin/facturacion/bandeja/${resolvedParams.trayId}`}
        filters={filters}
        siteOptions={filterOptions.sites}
        payerOptions={filterOptions.payerTypes}
        areaOptions={filterOptions.serviceAreas}
        resultCount={cases.length}
        trayLabel={tray.name}
      />

      <BillingCaseTable
        cases={cases}
        emptyMessage="No hay expedientes en esta bandeja con los filtros seleccionados."
        canRunSupervisorActions={canRunSupervisorActions}
      />
    </div>
  );
}
