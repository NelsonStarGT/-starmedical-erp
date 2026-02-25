import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Column<T> = {
  header: string;
  render: (row: T, index: number) => ReactNode;
  width?: string;
};

type Props<T> = {
  columns: Column<T>[];
  data: T[];
  zebra?: boolean;
  empty?: ReactNode;
  className?: string;
};

export function DataTable<T>({ columns, data, zebra = true, empty, className }: Props<T>) {
  if (!data.length && empty) return <>{empty}</>;

  return (
    <div className={cn("erp-table overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-[#F8FAFC] text-[#2e75ba]">
          <tr>
            {columns.map((col) => (
              <th key={col.header} className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", col.width)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, idx) => (
            <tr key={idx} className={zebra && idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}>
              {columns.map((col) => (
                <td key={col.header} className="px-4 py-3 align-top text-sm text-slate-800">
                  {col.render(row, idx)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
