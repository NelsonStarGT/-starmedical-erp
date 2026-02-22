import { cn } from "@/lib/utils";

type CompactTableProps = {
  columns: string[];
  children: React.ReactNode;
  className?: string;
};

export function CompactTable({ columns, children, className }: CompactTableProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="min-w-full border-separate border-spacing-0 text-xs">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold uppercase tracking-wide text-[#2e75ba]"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr:nth-child(even)]:bg-slate-50/70">{children}</tbody>
      </table>
    </div>
  );
}
