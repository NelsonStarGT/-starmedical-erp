import type { Metadata } from "next";
import AdminShell from "@/components/layout/AdminShell";
import HrQueryProvider from "./query-provider";

export const metadata: Metadata = {
  title: "StarMedical ERP | RRHH"
};

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell>
      <HrQueryProvider>{children}</HrQueryProvider>
    </AdminShell>
  );
}
