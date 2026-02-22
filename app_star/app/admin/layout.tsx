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
  const appEnv = String(process.env.APP_ENV || "").toLowerCase();
  const showDevBanner = process.env.NODE_ENV !== "production" || ["dev", "development", "staging"].includes(appEnv);
  return <AdminShellServer showDevBanner={showDevBanner}>{children}</AdminShellServer>;
}
