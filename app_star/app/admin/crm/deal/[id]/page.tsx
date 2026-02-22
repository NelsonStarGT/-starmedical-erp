import { Suspense } from "react";
import DealClient from "./DealClient";

export default function DealDetailPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Cargando detalle...</div>}>
      <DealClient />
    </Suspense>
  );
}
