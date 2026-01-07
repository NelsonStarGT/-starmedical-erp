import { Suspense } from "react";
import PipelineClient from "./PipelineClient";

export default function CrmPipelinePage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Cargando CRM...</div>}>
      <PipelineClient />
    </Suspense>
  );
}
