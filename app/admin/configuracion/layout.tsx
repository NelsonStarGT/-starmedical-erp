import ConfigSectionNav from "@/components/configuracion/ConfigSectionNav";

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <ConfigSectionNav />
      {children}
    </div>
  );
}
