import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import MedicalLayout from "@/components/medical/MedicalLayout";
import { getSessionUserFromCookies } from "@/lib/auth";

export const metadata: Metadata = {
  title: "StarMedical ERP | Módulo médico"
};

export const dynamic = "force-dynamic";

function normalizeRole(role: string) {
  return role.trim().toUpperCase().replace(/\s+/g, "_");
}

function hasAnyRole(roles: string[], allowed: string[]) {
  const roleSet = new Set(roles.map(normalizeRole));
  return allowed.map(normalizeRole).some((r) => roleSet.has(r));
}

export default async function MedicalSuiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUserFromCookies(cookies());
  if (!user) redirect("/login");

  const roles = user.roles || [];
  const canOverrideDoctor = hasAnyRole(roles, ["ADMIN", "SUPER_ADMIN"]);

  return (
    <MedicalLayout
      user={{
        id: user.id
      }}
      canOverrideDoctor={canOverrideDoctor}
    >
      {children}
    </MedicalLayout>
  );
}
