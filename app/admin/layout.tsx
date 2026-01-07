import type { Metadata } from "next";
import AdminShell from "@/components/layout/AdminShell";

export const metadata: Metadata = {
  title: "StarMedical ERP | Admin"
};

export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
