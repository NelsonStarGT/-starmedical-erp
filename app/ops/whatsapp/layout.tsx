import type { Metadata } from "next";
import WhatsAppModuleLayout from "./_components/WhatsAppModuleLayout";

export const metadata: Metadata = {
  title: "Ops | WhatsApp Center"
};

export default function OpsWhatsAppLayout({ children }: { children: React.ReactNode }) {
  return <WhatsAppModuleLayout>{children}</WhatsAppModuleLayout>;
}
