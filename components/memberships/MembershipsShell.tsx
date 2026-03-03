import { cn } from "@/lib/utils";
import { SectionCard } from "@/components/subscriptions/SectionCard";

type MembershipsShellProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function MembershipsShell({ title, description, actions, children, className }: MembershipsShellProps) {
  return (
    <SectionCard
      title={title}
      subtitle={description}
      actions={actions}
      className={cn("space-y-0", className)}
      contentClassName="p-3"
    >
      {children}
    </SectionCard>
  );
}
