import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@/lib/auth";

export const metadata: Metadata = {
  title: "StarMedical ERP | consultaM"
};

export const dynamic = "force-dynamic";

export default async function EncounterLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUserFromCookies(cookies());
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-[radial-gradient(900px_circle_at_10%_0%,rgba(74,165,156,0.1),transparent_55%),radial-gradient(900px_circle_at_90%_0%,rgba(74,173,245,0.1),transparent_60%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
      <main className="mx-auto w-full max-w-[1480px] px-4 py-4 lg:px-6 lg:py-6">{children}</main>
    </div>
  );
}
