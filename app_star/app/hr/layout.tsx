import type { Metadata } from "next";
import AdminShellServer from "@/components/layout/AdminShellServer";
import ModuleTabs from "@/components/layout/ModuleTabs";
import { hrTabs } from "@/config/modules/hr.tabs";
import HrQueryProvider from "./query-provider";

export const metadata: Metadata = {
  title: "StarMedical ERP | RRHH"
};

export default function HrLayout({ children }: { children: React.ReactNode }) {
  const appEnv = String(process.env.APP_ENV || "").toLowerCase();
  const showDevBanner = process.env.NODE_ENV !== "production" || ["dev", "development", "staging"].includes(appEnv);
  return (
    <AdminShellServer showDevBanner={showDevBanner}>
      <div className="space-y-4">
        <ModuleTabs tabs={hrTabs} />
        <HrQueryProvider>{children}</HrQueryProvider>
      </div>
    </AdminShellServer>
  );
}
