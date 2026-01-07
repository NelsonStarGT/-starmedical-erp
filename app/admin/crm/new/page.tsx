import { Suspense } from "react";
import NewClient from "./NewClient";

export default function CrmNewDealPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Cargando CRM...</div>}>
      <NewClient />
    </Suspense>
  );
}
