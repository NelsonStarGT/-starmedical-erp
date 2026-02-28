"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type ChartMode = "table" | "bar" | "donut";

type ChartRow = {
  label: string;
  value: number;
};

const CHART_COLORS = ["#2e75ba", "#4aa59c", "#4aadf5", "#7bc0b8", "#9ac5f0", "#1f6aa6", "#2f9b92"];

function resolveDefaultMode(bucketCount: number): ChartMode {
  if (bucketCount <= 1) return "table";
  if (bucketCount >= 2 && bucketCount <= 10) return "bar";
  return "table";
}

function formatNumber(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return "0";
  return value.toLocaleString("es-GT");
}

export default function ClientsReportsChartCard({
  title,
  rows,
  emptyLabel
}: {
  title: string;
  rows: ChartRow[];
  emptyLabel: string;
}) {
  const normalizedRows = useMemo(
    () =>
      rows
        .filter((row) => Number.isFinite(row.value) && row.value >= 0)
        .map((row) => ({
          ...row,
          shortLabel: row.label.length > 18 ? `${row.label.slice(0, 17)}…` : row.label
        })),
    [rows]
  );

  const topRows = useMemo(() => normalizedRows.slice(0, 12), [normalizedRows]);
  const defaultMode = useMemo(() => resolveDefaultMode(topRows.length), [topRows.length]);
  const canShowDonut = topRows.length > 1 && topRows.length <= 8;
  const [mode, setMode] = useState<ChartMode>(defaultMode);

  useEffect(() => {
    setMode((current) => {
      if (current === "donut" && !canShowDonut) return defaultMode;
      return current;
    });
  }, [canShowDonut, defaultMode]);

  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  return (
    <article className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">{title}</p>
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white">
          {(
            [
              { key: "table", label: "Tabla" },
              { key: "bar", label: "Barras" },
              { key: "donut", label: "Dona", disabled: !canShowDonut }
            ] satisfies Array<{ key: ChartMode; label: string; disabled?: boolean }>
          ).map((option) => {
            const disabled = option.disabled ?? false;
            return (
              <button
                key={option.key}
                type="button"
                disabled={disabled}
                title={disabled ? "Dona disponible solo hasta 8 segmentos." : undefined}
                onClick={() => setMode(option.key)}
                className={
                  disabled
                    ? "cursor-not-allowed border-r border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-400 last:border-r-0"
                    : mode === option.key
                      ? "border-r border-slate-200 bg-[#2e75ba] px-2.5 py-1 text-xs font-semibold text-white last:border-r-0"
                      : "border-r border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-[#2e75ba] last:border-r-0"
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {topRows.length === 0 ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
          {emptyLabel}
        </div>
      ) : mode === "table" ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f8fafc] text-[#2e75ba]">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Nombre</th>
                <th className="px-3 py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {topRows.map((row, index) => (
                <tr key={`${row.label}-${index}`} className={index % 2 ? "bg-slate-50/60" : "bg-white"}>
                  <td className="px-3 py-2">{row.label}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatNumber(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : mode === "bar" ? (
        <div className="mt-3 h-[250px] rounded-xl border border-slate-200 bg-white p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topRows} margin={{ top: 8, right: 8, left: 0, bottom: 30 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis
                dataKey="shortLabel"
                tick={{ fontSize: 11, fill: "#475569" }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={56}
              />
              <YAxis tick={{ fontSize: 11, fill: "#475569" }} allowDecimals={false} />
              <Tooltip formatter={(value) => formatNumber(value)} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#2e75ba">
                {topRows.map((row, index) => (
                  <Cell key={`${row.label}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-3 h-[250px] rounded-xl border border-slate-200 bg-white p-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={topRows} dataKey="value" nameKey="label" innerRadius={52} outerRadius={84}>
                {topRows.map((row, index) => (
                  <Cell key={`${row.label}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatNumber(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}
