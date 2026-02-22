import { Suspense } from "react";
import CrmLayoutClient from "./CrmLayoutClient";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Cargando CRM...</div>}>
      <CrmLayoutClient>{children}</CrmLayoutClient>
    </Suspense>
  );
}
