import type { Metadata } from "next";
import OpsShell from "./_components/OpsShell";
import { WhatsAppProvider } from "./whatsapp/_components/WhatsAppProvider";

export const metadata: Metadata = {
  title: "StarMedical Ops Hub"
};

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <WhatsAppProvider>
      <OpsShell>{children}</OpsShell>
    </WhatsAppProvider>
  );
}
