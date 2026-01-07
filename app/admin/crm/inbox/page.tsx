import { Suspense } from "react";
import InboxClient from "./InboxClient";

export default function CrmInboxPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Cargando CRM...</div>}>
      <InboxClient />
    </Suspense>
  );
}
