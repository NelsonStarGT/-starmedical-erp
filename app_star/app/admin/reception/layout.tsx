import { Suspense } from "react";
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { Montserrat, Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { getSessionUserFromCookies } from "@/lib/auth";
import { buildReceptionContext } from "@/lib/reception/rbac";
import { resolveActiveBranchStrict } from "@/lib/branch/activeBranch";
import { listReceptionBranchOptions } from "@/lib/reception/branches.service";
import ReceptionLayoutClient from "./ReceptionLayoutClient";

const headingFont = Montserrat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-reception-heading" });
const bodyFont = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-reception-body" });

export default async function ReceptionLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const user = await getSessionUserFromCookies(cookieStore);
  if (!user) redirect("/login");
  const context = (() => {
    try {
      return buildReceptionContext(user);
    } catch {
      forbidden();
    }
  })();

  const [branches] = await Promise.all([
    listReceptionBranchOptions(user)
  ]);

  const initialActiveBranchId = await resolveActiveBranchStrict(user, cookieStore);

  return (
    <div className={cn(headingFont.variable, bodyFont.variable, "font-[var(--font-reception-body)]")}>
      <Suspense fallback={<div className="text-sm text-slate-500">Cargando recepción...</div>}>
        <ReceptionLayoutClient
          receptionRole={context.receptionRole}
          capabilities={context.capabilities}
          branches={branches}
          initialActiveBranchId={initialActiveBranchId}
        >
          {children}
        </ReceptionLayoutClient>
      </Suspense>
    </div>
  );
}
