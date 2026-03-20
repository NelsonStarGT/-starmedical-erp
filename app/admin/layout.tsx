import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminShell from "@/components/layout/AdminShell";
import { verifyToken } from "@/lib/auth";
import { AUTH_COOKIE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "StarMedical ERP | Admin"
};

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? verifyToken(token) : null;
  if (!session || typeof session.id !== "string" || typeof session.email !== "string") {
    redirect("/login");
  }

  return <AdminShell>{children}</AdminShell>;
}
