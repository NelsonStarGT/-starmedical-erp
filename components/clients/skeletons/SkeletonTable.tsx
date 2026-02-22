type SkeletonTableProps = {
  columns?: number;
  rows?: number;
};

export default function SkeletonTable({ columns = 6, rows = 8 }: SkeletonTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#dce7f5] bg-white shadow-sm">
      <div className="h-10 w-full bg-[#e8f1ff]" />
      <div className="space-y-2 p-3">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
            }}
          >
            {Array.from({ length: columns }).map((__, colIdx) => (
              <div key={colIdx} className="h-8 rounded bg-slate-100" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
