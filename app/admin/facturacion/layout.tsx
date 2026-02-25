import { Montserrat, Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const headingFont = Montserrat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-billing-heading" });
const bodyFont = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-billing-body" });

export default function FacturacionLayout({ children }: { children: React.ReactNode }) {
  return <div className={cn(headingFont.variable, bodyFont.variable, "space-y-4 font-[var(--font-billing-body)]")}>{children}</div>;
}
