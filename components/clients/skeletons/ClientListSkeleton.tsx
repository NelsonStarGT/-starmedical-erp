import SkeletonTable from "@/components/clients/skeletons/SkeletonTable";

export default function ClientListSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-44 rounded bg-slate-200" />
        <div className="h-7 w-56 rounded bg-slate-200" />
        <div className="h-4 w-96 rounded bg-slate-200" />
      </div>

      <div className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <div className="h-10 w-72 rounded-full bg-slate-100" />
          <div className="h-10 w-40 rounded-full bg-slate-100" />
          <div className="h-10 w-40 rounded-full bg-slate-100" />
          <div className="h-10 w-36 rounded-full bg-slate-100" />
          <div className="h-10 w-28 rounded-full bg-slate-100" />
        </div>
      </div>

      <SkeletonTable columns={6} rows={8} />
    </div>
  );
}
