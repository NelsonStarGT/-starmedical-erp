import type { Metadata } from "next";
import { Poppins, Nunito_Sans } from "next/font/google";
import AdminShellServer from "@/components/layout/AdminShellServer";
import ModuleTabs from "@/components/layout/ModuleTabs";
import { diagnosticsTabs } from "@/config/modules/diagnostics.tabs";

const headingFont = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-dx-heading"
});

const bodyFont = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dx-body"
});

export const metadata: Metadata = {
  title: "StarMedical ERP | Diagnóstico Clínico"
};

export default function DiagnosticsLayout({ children }: { children: React.ReactNode }) {
  const appEnv = String(process.env.APP_ENV || "").toLowerCase();
  const showDevBanner = process.env.NODE_ENV !== "production" || ["dev", "development", "staging"].includes(appEnv);
  return (
    <AdminShellServer showDevBanner={showDevBanner}>
      <div className={`${headingFont.variable} ${bodyFont.variable} space-y-6`}>
        <div className="relative overflow-hidden rounded-2xl border border-[#d9e4f2] bg-gradient-to-r from-[#f8fafc] via-white to-[#f0f7ff] p-6 shadow-md shadow-[#2e75ba]/10">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_20%_20%,rgba(74,165,156,0.15),transparent),radial-gradient(circle_at_80%_50%,rgba(74,173,245,0.12),transparent)]" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Panel administrativo</p>
            <h1 className="mt-2 text-2xl font-semibold text-[#163d66] font-[var(--font-dx-heading)]">
              Diagnóstico Clínico · Ingreso y coordinación
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600 font-[var(--font-dx-body)]">
              Aprobación/pago y envío a ejecución (LabTest / Rayos X / Ultrasonidos) con seguimiento administrativo.
            </p>
          </div>
        </div>
        <ModuleTabs tabs={diagnosticsTabs} variant="diagnostics" />
        <div className="font-[var(--font-dx-body)] text-slate-800">{children}</div>
      </div>
    </AdminShellServer>
  );
}
