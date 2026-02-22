import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { getDbHealthSnapshot, type DbHealthStatus } from "@/lib/server/dbHealth.service";

function statusBadge(status: DbHealthStatus) {
  switch (status) {
    case "GREEN":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "YELLOW":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "RED":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export default async function DbHealthPage() {
  const user = await getSessionUserFromCookies(cookies());
  if (!user) redirect("/login");
  if (!isAdmin(user)) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        No autorizado.
      </div>
    );
  }

  const snapshot = await getDbHealthSnapshot();
  const badgeClasses = statusBadge(snapshot.status);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Health-check</p>
            <h1 className="text-xl font-semibold text-[#163d66]">Base de datos (DEV)</h1>
            <p className="mt-1 text-sm text-slate-600">
              Estado rápido de tablas críticas y migraciones. No bloquea operación.
            </p>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${badgeClasses}`}>
            {snapshot.status === "GREEN" ? "OK" : snapshot.status === "YELLOW" ? "Atención" : "Crítico"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-sm font-semibold text-[#2e75ba]">Entorno</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">timestamp</dt>
              <dd className="font-mono text-slate-900">{snapshot.timestamp}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">NODE_ENV</dt>
              <dd className="font-mono text-slate-900">{snapshot.nodeEnv || "(missing)"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">APP_ENV</dt>
              <dd className="font-mono text-slate-900">{snapshot.appEnv ?? "(missing)"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">schema</dt>
              <dd className="font-mono text-slate-900">{snapshot.schema}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">DATABASE_URL</dt>
              <dd className="font-mono text-slate-900 text-right">{snapshot.databaseUrlMasked}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-sm font-semibold text-[#2e75ba]">Migraciones</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">up to date</span>
              <span className="font-semibold text-slate-900">
                {snapshot.migrations.upToDate === null
                  ? "Desconocido"
                  : snapshot.migrations.upToDate
                    ? "Sí"
                    : "No"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">pendientes</span>
              <span className="font-mono text-slate-900">{snapshot.migrations.pending.length}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">aplicadas desconocidas</span>
              <span className="font-mono text-slate-900">{snapshot.migrations.unknownApplied.length}</span>
            </div>
            {snapshot.migrations.error && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
                <p className="font-semibold">Error al verificar migraciones</p>
                <p className="mt-1 font-mono text-xs">{snapshot.migrations.error}</p>
              </div>
            )}
            {(snapshot.migrations.pending.length > 0 || snapshot.migrations.unknownApplied.length > 0) && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-700">Detalle</p>
                {snapshot.migrations.pending.length > 0 && (
                  <div className="mt-2">
                    <p className="text-slate-500">Pendientes:</p>
                    <ul className="mt-1 list-disc pl-5 font-mono text-xs text-slate-700">
                      {snapshot.migrations.pending.slice(0, 8).map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                      {snapshot.migrations.pending.length > 8 && (
                        <li>… +{snapshot.migrations.pending.length - 8} más</li>
                      )}
                    </ul>
                  </div>
                )}
                {snapshot.migrations.unknownApplied.length > 0 && (
                  <div className="mt-3">
                    <p className="text-slate-500">Aplicadas desconocidas:</p>
                    <ul className="mt-1 list-disc pl-5 font-mono text-xs text-slate-700">
                      {snapshot.migrations.unknownApplied.slice(0, 8).map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                      {snapshot.migrations.unknownApplied.length > 8 && (
                        <li>… +{snapshot.migrations.unknownApplied.length - 8} más</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <h2 className="text-sm font-semibold text-[#2e75ba]">Tablas críticas</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {snapshot.criticalTables.map((t) => (
            <div
              key={t.name}
              className={`flex items-center justify-between rounded-xl border p-3 ${
                t.exists ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
              }`}
            >
              <span className="font-mono text-xs text-slate-700">{t.name}</span>
              <span className={`text-xs font-semibold ${t.exists ? "text-emerald-700" : "text-rose-700"}`}>
                {t.exists ? "OK" : "MISSING"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

