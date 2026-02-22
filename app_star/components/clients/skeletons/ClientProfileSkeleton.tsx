export default function ClientProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="h-3 w-36 rounded bg-slate-200" />
            <div className="h-8 w-72 rounded bg-slate-200" />
            <div className="h-4 w-56 rounded bg-slate-200" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-28 rounded-full bg-slate-100" />
            <div className="h-8 w-28 rounded-full bg-slate-100" />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {Array.from({ length: 7 }).map((_, idx) => (
            <div key={idx} className="h-9 w-28 rounded-full bg-slate-100" />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
          <div className="h-4 w-36 rounded bg-slate-200" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-10 rounded-xl bg-slate-100" />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-14 rounded-xl bg-slate-100" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
