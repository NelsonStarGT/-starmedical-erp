import { MembershipContractTabs } from "@/components/memberships/MembershipsTabs";

export default function MembershipContractsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <MembershipContractTabs />
      {children}
    </div>
  );
}
