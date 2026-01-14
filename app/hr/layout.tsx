import type { Metadata } from "next";
import AdminShell from "@/components/layout/AdminShell";
import ModuleTabs from "@/components/layout/ModuleTabs";
import { hrTabs } from "@/config/modules/hr.tabs";
import HrQueryProvider from "./query-provider";

export const metadata: Metadata = {
  title: "StarMedical ERP | RRHH"
};

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell>
      <div className="space-y-4">
        <ModuleTabs tabs={hrTabs} />
        <HrQueryProvider>{children}</HrQueryProvider>
      </div>
    </AdminShell>
  );
}
