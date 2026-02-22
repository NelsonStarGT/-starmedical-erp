import { Suspense } from "react";
import ListPageClient from "./ListPageClient";

export default function CrmListPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Cargando CRM...</div>}>
      <ListPageClient />
    </Suspense>
  );
}
