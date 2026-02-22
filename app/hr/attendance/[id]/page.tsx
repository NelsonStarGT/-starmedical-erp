"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type DailyResponse = {
  employee: { id: string; name: string; code?: string | null };
  processedDay: {
    id: string;
    status: "OK" | "MISSING_PUNCH" | "OUT_OF_ZONE" | "MANUAL_REVIEW";
    needsApproval: boolean;
    workedMinutes: number;
    breakMinutes: number;
    overtimeMinutes: number;
    lunchMinutes: number;
    effectiveMinutes: number;
    lateMinutes: number;
    firstIn?: string | null;
    lastOut?: string | null;
  } | null;
  shift: { id: string; name: string; startTime: string; endTime: string; toleranceMinutes: number } | null;
  incidents: { id: string; type: string; severity: string; resolved: boolean; notes?: string | null }[];
  rawEvents: { id: string; type: string; occurredAt: string; source: string; zoneStatus?: string | null; faceStatus?: string | null }[];
};

async function fetchDaily(employeeId: string, date: string, siteId?: string | null): Promise<DailyResponse> {
  const params = new URLSearchParams({ date });
  if (siteId) params.append("siteId", siteId);
  const res = await fetch(`/api/hr/attendance/employee/${employeeId}/daily?${params.toString()}`);
  if (!res.ok) throw new Error("No se pudo cargar el detalle");
  const json = await res.json();
  return json.data;
}

const statusLabels: Record<string, string> = {
  OK: "OK",
  MISSING_PUNCH: "Faltan marcajes",
  OUT_OF_ZONE: "Fuera de zona",
  MANUAL_REVIEW: "Revisión manual"
};

const minutesToHours = (value: number) => (value ? (value / 60).toFixed(1) : "0.0");
const formatTime = (value?: string | null) => (value ? format(new Date(value), "HH:mm") : "—");

export default function AttendanceEmployeePage() {
  const params = useParams();
  const employeeId = params?.id as string;
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const [date, setDate] = useState(today);
  const [siteId, setSiteId] = useState<string | null>(null);

  const dailyQuery = useQuery({
    queryKey: ["attendance-employee-daily", employeeId, date, siteId],
    queryFn: () => fetchDaily(employeeId, date, siteId),
    enabled: Boolean(employeeId)
  });

  const data = dailyQuery.data;
  const rawEvents = data?.rawEvents || [];
  const incidents = data?.incidents || [];
  const processed = data?.processedDay;
  const shift = data?.shift;

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Línea de tiempo del colaborador</h1>
          <p className="text-sm text-slate-500">
            <Link href="/hr/attendance" className="text-blue-600 hover:underline">
              Volver a asistencia
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-600">
            Fecha
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="ml-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800"
            />
          </label>
          <label className="text-sm text-slate-600">
            Site
            <input
              type="text"
              value={siteId || ""}
              onChange={(e) => setSiteId(e.target.value || null)}
              placeholder="Opcional"
              className="ml-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800"
            />
          </label>
        </div>
      </div>

      <Card className="shadow-none ring-1 ring-slate-100">
        <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base text-slate-800">{data?.employee?.name || "Colaborador"}</CardTitle>
            {data?.employee?.code && <p className="text-xs text-slate-500">Código: {data.employee.code}</p>}
          </div>
          {processed && (
            <Badge variant={processed.status === "OK" ? "success" : processed.status === "OUT_OF_ZONE" ? "warning" : "info"}>
              {statusLabels[processed.status]}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Horario esperado</p>
            <p className="text-lg font-semibold text-slate-800">
              {shift ? `${shift.startTime} - ${shift.endTime}` : "No asignado"}
            </p>
            {shift && <p className="text-xs text-slate-500">Tolerancia: {shift.toleranceMinutes} min</p>}
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Entrada</p>
            <p className="text-lg font-semibold text-slate-800">{formatTime(processed?.firstIn)}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Salida</p>
            <p className="text-lg font-semibold text-slate-800">{formatTime(processed?.lastOut)}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Horas trabajadas</p>
            <p className="text-lg font-semibold text-slate-800">{processed ? `${minutesToHours(processed.workedMinutes)}h` : "—"}</p>
            {processed && (
              <>
                <p className="text-xs text-slate-500">Breaks: {minutesToHours(processed.breakMinutes)}h</p>
                <p className="text-xs text-slate-500">Almuerzo: {minutesToHours(processed.lunchMinutes)}h</p>
                <p className="text-xs text-slate-500">Efectivas: {minutesToHours(processed.effectiveMinutes)}h</p>
              </>
            )}
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Tardanza</p>
            <p className="text-lg font-semibold text-slate-800">{processed ? `${processed.lateMinutes} min` : "—"}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Horas extra</p>
            <p className="text-lg font-semibold text-slate-800">{processed ? `${minutesToHours(processed.overtimeMinutes)}h` : "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none ring-1 ring-slate-100">
        <CardHeader>
          <CardTitle className="text-sm text-slate-700">Timeline del día</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyQuery.isLoading && <p className="text-sm text-slate-500">Cargando eventos...</p>}
          {!dailyQuery.isLoading && rawEvents.length === 0 && <p className="text-sm text-slate-500">Sin marcajes para esta fecha.</p>}
          <div className="space-y-2">
            {rawEvents.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                <div className="font-mono text-sm text-slate-700">{format(new Date(ev.occurredAt), "HH:mm")}</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{ev.type}</p>
                  <p className="text-xs text-slate-500">{ev.source}</p>
                </div>
                {ev.zoneStatus === "OUT_OF_ZONE" && <Badge variant="warning">Fuera de zona</Badge>}
                {ev.faceStatus && ev.faceStatus !== "VERIFIED" && <Badge variant="info">Face {ev.faceStatus}</Badge>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none ring-1 ring-slate-100">
        <CardHeader>
          <CardTitle className="text-sm text-slate-700">Incidencias</CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 && <p className="text-sm text-slate-500">Sin incidencias para este día.</p>}
          <div className="space-y-2">
            {incidents.map((inc) => (
              <div key={inc.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{inc.type}</p>
                  {inc.notes && <p className="text-xs text-slate-500">{inc.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={inc.severity === "HIGH" ? "warning" : inc.severity === "MEDIUM" ? "info" : "neutral"}>{inc.severity}</Badge>
                  {inc.resolved && <Badge variant="success">Resuelto</Badge>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none ring-1 ring-dashed ring-slate-200">
        <CardHeader>
          <CardTitle className="text-sm text-slate-700">Ajustes manuales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-slate-500">Próxima fase: ajustes manuales y aprobaciones solo para HR_ADMIN.</p>
          <button className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-500" disabled>
            Agregar ajuste (próximamente)
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
