import { cn } from "@/lib/utils";

export type LineChartPoint = {
  label: string;
  value: number;
};

function formatNumber(value: number) {
  return Intl.NumberFormat("es-GT", { maximumFractionDigits: 0 }).format(value);
}

function buildSmoothPath(points: Array<{ x: number; y: number }>) {
  const first = points[0];
  if (!first) return "";
  if (points.length === 1) return `M ${first.x} ${first.y}`;

  const to = (n: number) => Number(n.toFixed(2));

  let d = `M ${to(first.x)} ${to(first.y)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    if (!p0 || !p1 || !p2 || !p3) continue;

    // Catmull–Rom to Bezier (uniform), with conservative tension for clinical dashboards.
    const tension = 0.35;
    const cp1x = p1.x + (p2.x - p0.x) * tension / 6;
    const cp1y = p1.y + (p2.y - p0.y) * tension / 6;
    const cp2x = p2.x - (p3.x - p1.x) * tension / 6;
    const cp2y = p2.y - (p3.y - p1.y) * tension / 6;

    d += ` C ${to(cp1x)} ${to(cp1y)}, ${to(cp2x)} ${to(cp2y)}, ${to(p2.x)} ${to(p2.y)}`;
  }
  return d;
}

export default function LineChart({
  title,
  subtitle,
  points,
  valueSuffix = "",
  height = 220,
  className,
  id = "medical-linechart",
  lineClassName = "stroke-[#2e75ba]",
  fillClassName = "fill-[#4aadf5]/10"
}: {
  title: string;
  subtitle?: string | null;
  points: LineChartPoint[];
  valueSuffix?: string;
  height?: number;
  className?: string;
  id?: string;
  lineClassName?: string;
  fillClassName?: string;
}) {
  const width = 720;
  const paddingLeft = 44;
  const paddingRight = 18;
  const paddingTop = 18;
  const paddingBottom = 28;

  const innerW = width - paddingLeft - paddingRight;
  const innerH = height - paddingTop - paddingBottom;

  const values = points.map((p) => p.value);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const span = Math.max(1, max - min);
  const yMin = min - span * 0.12;
  const yMax = max + span * 0.12;

  const toX = (idx: number) => paddingLeft + (innerW * (points.length <= 1 ? 0 : idx / (points.length - 1)));
  const toY = (v: number) => paddingTop + innerH * (1 - (v - yMin) / (yMax - yMin || 1));

  const plotPoints = points.map((p, idx) => ({ x: toX(idx), y: toY(p.value) }));

  const linePath = buildSmoothPath(plotPoints);
  const firstPt = plotPoints[0] ?? null;
  const lastPt = plotPoints.length ? plotPoints[plotPoints.length - 1] : null;
  const areaPath = linePath
    ? firstPt && lastPt
      ? `${linePath} L ${lastPt.x} ${paddingTop + innerH} L ${firstPt.x} ${paddingTop + innerH} Z`
      : ""
    : "";

  const last = points.at(-1) ?? null;
  const lastX = lastPt?.x ?? paddingLeft;
  const lastY = lastPt?.y ?? paddingTop + innerH;

  const gridLines = 4;
  const yTicks = Array.from({ length: gridLines + 1 }).map((_, i) => {
    const t = i / gridLines;
    const y = paddingTop + innerH * t;
    const v = yMax - (yMax - yMin) * t;
    return { y, v };
  });

  const xLabelEvery = Math.max(1, Math.round(points.length / 6));

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-soft", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-diagnostics-primary">Eficiencia</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-slate-600">{subtitle}</div> : null}
        </div>
        {last ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Última hora</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {formatNumber(last.value)}{valueSuffix}
            </div>
          </div>
        ) : null}
      </div>

      <div className="px-4 py-4">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={title}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#4aadf5" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#4aadf5" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* grid + y labels */}
          {yTicks.map((t) => (
            <g key={t.y}>
              <line
                x1={paddingLeft}
                x2={width - paddingRight}
                y1={t.y}
                y2={t.y}
                stroke="#e2e8f0"
                strokeDasharray="4 6"
              />
              <text
                x={paddingLeft - 12}
                y={t.y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#64748b"
                fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
              >
                {formatNumber(t.v)}
              </text>
            </g>
          ))}

          {/* x labels */}
          {points.map((p, idx) => {
            if (idx % xLabelEvery !== 0 && idx !== points.length - 1) return null;
            const x = toX(idx);
            return (
              <text
                key={p.label}
                x={x}
                y={height - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#64748b"
                fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
              >
                {p.label}
              </text>
            );
          })}

          {/* area */}
          {areaPath ? (
            <path
              d={areaPath}
              fill={`url(#${id}-fill)`}
              className={cn(fillClassName)}
              stroke="none"
            />
          ) : null}

          {/* line */}
          {linePath ? (
            <path
              d={linePath}
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn(lineClassName)}
            />
          ) : null}

          {/* points */}
          {plotPoints.map((pt, idx) => (
            <circle
              key={`${idx}-${pt.x}`}
              cx={pt.x}
              cy={pt.y}
              r={idx === plotPoints.length - 1 ? 4.5 : 3.2}
              fill={idx === plotPoints.length - 1 ? "#4aa59c" : "#2e75ba"}
              opacity={idx === plotPoints.length - 1 ? 1 : 0.9}
              stroke="white"
              strokeWidth="2"
            />
          ))}

          {/* last marker */}
          {last ? (
            <g>
              <line
                x1={lastX}
                x2={lastX}
                y1={paddingTop}
                y2={paddingTop + innerH}
                stroke="#94a3b8"
                strokeDasharray="3 6"
                opacity="0.55"
              />
              <circle cx={lastX} cy={lastY} r="10" fill="#4aa59c" opacity="0.12" />
            </g>
          ) : null}
        </svg>

        <div className="mt-3 rounded-xl border border-slate-200 bg-diagnostics-background px-4 py-3 text-xs text-slate-600">
          TODO: conectar esta serie con métricas reales por hora (visitas atendidas o espera promedio) desde la fuente canónica.
        </div>
      </div>
    </div>
  );
}
