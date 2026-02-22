import { Montserrat, Inter } from "next/font/google";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/utils";
import { resolveModuleTabs } from "@/lib/navigation/moduleTabs.visual";

const headingFont = Montserrat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-billing-heading" });
const bodyFont = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-billing-body" });

const tabs = resolveModuleTabs("facturacion", {
  hrefs: {
    dashboard: "/admin/facturacion",
    bandejas: "/admin/facturacion/bandeja/PENDIENTES_COBRO",
    documentos: "/admin/facturacion/documentos",
    caja: "/admin/facturacion/caja"
  }
}).map(({ label, href }) => ({ label, href }));

export default function FacturacionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(headingFont.variable, bodyFont.variable, "space-y-4 font-[var(--font-billing-body)]")}>
      <Tabs items={tabs} />
      {children}
    </div>
  );
}
