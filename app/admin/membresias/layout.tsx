import { MembershipsTabs } from "@/components/memberships/MembershipsTabs";

export default function MembershipsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <MembershipsTabs />
      <div className="rounded-xl bg-[#F8FAFC] p-3">{children}</div>
    </div>
  );
}
