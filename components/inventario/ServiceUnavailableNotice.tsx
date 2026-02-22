import type { ServiceUnavailablePayload } from "@/lib/inventory/runtime-contract";

type ServiceUnavailableNoticeProps = {
  issue: ServiceUnavailablePayload | null;
};

export default function ServiceUnavailableNotice({ issue }: ServiceUnavailableNoticeProps) {
  if (!issue) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-semibold">Módulo en preparación</p>
      <p>{issue.error}</p>
      {issue.hint ? <p className="mt-1 text-xs text-amber-800">{issue.hint}</p> : null}
      {issue.action ? <p className="mt-1 text-xs text-amber-800">{issue.action}</p> : null}
    </div>
  );
}
