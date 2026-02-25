import type { Metadata } from "next";
import AdminShellServer from "@/components/layout/AdminShellServer";

export const metadata: Metadata = {
  title: "StarMedical ERP | Admin"
};

export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <AdminShellServer>{children}</AdminShellServer>;
}
