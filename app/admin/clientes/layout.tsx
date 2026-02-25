import ClientsCountryContextBar from "@/components/clients/ClientsCountryContextBar";

export default function ClientesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <ClientsCountryContextBar />
      {children}
    </div>
  );
}
