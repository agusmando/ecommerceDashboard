import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency, formatNumber } from '../lib/utils';
import { useIsMobile } from './ui/use-mobile';

/**
 * Gráficos de una sola serie con estilo común: color de marca (--chart-1),
 * grilla horizontal tenue, ejes sin líneas, barras finas con extremo redondeado
 * y tooltip en HTML con tokens de texto.
 */

const AXIS = { fontSize: 12, fill: 'var(--muted-foreground)' };

function ChartTooltip({
  active,
  payload,
  label,
  format,
  labelFormat,
}: {
  active?: boolean;
  payload?: { value: number; name?: string; color?: string; payload: Record<string, unknown> }[];
  label?: string;
  format: (v: number) => string;
  labelFormat?: (label: string, row: Record<string, unknown>) => ReactNode;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="text-muted-foreground">{labelFormat ? labelFormat(String(label), row) : label}</div>
      {payload.length === 1 ? (
        <div className="mt-0.5 text-sm font-semibold text-foreground tabular-nums">{format(payload[0].value)}</div>
      ) : (
        <div className="mt-1 space-y-0.5">
          {payload.map((p, i) => (
            <div key={i} className="flex items-center gap-1.5 text-sm font-semibold text-foreground tabular-nums">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
              <span className="text-muted-foreground">{p.name}:</span> {format(p.value)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const compactCurrency = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', notation: 'compact', maximumFractionDigits: 1 }).format(v);

export function TrendChart<T extends Record<string, unknown>>({
  data,
  x,
  y,
  series,
  height = 260,
  currency = true,
  labelFormat,
}: {
  data: T[];
  x: keyof T & string;
  y: keyof T & string;
  /** Varias series superpuestas (se ignora `y`). Sin `series` dibuja solo `y`. */
  series?: { key: keyof T & string; label: string; color: string }[];
  height?: number | string;
  currency?: boolean;
  labelFormat?: (label: string, row: Record<string, unknown>) => ReactNode;
}) {
  const areas = series?.length ? series : [{ key: y, label: '', color: 'var(--chart-1)' }];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {areas.map((a) => (
            <linearGradient key={a.key} id={`trendFill-${a.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={a.color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={a.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey={x} tick={AXIS} axisLine={false} tickLine={false} minTickGap={16} />
        <YAxis
          tick={AXIS}
          axisLine={false}
          tickLine={false}
          width={64}
          tickFormatter={(v) => (currency ? compactCurrency(v) : formatNumber(v))}
        />
        <Tooltip
          cursor={{ stroke: 'var(--muted-foreground)', strokeDasharray: '3 3' }}
          content={<ChartTooltip format={currency ? formatCurrency : formatNumber} labelFormat={labelFormat} />}
        />
        {areas.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />}
        {areas.map((a) => (
          <Area
            key={a.key}
            type="monotone"
            dataKey={a.key}
            name={a.label || undefined}
            stroke={a.color}
            strokeWidth={2}
            fill={`url(#trendFill-${a.key})`}
            activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Barras horizontales para rankings (nombres largos legibles). */
export function RankingBars<T extends Record<string, unknown>>({
  data,
  label,
  value,
  currency = true,
  height,
}: {
  data: T[];
  label: keyof T & string;
  value: keyof T & string;
  currency?: boolean;
  /** Alto del gráfico; por defecto se calcula según la cantidad de barras. */
  height?: number | string;
}) {
  const chartHeight = height ?? Math.max(120, data.length * 36 + 16);
  // En pantallas chicas se acorta la columna de etiquetas para dejar lugar a las barras.
  const isMobile = useIsMobile();
  const labelWidth = isMobile ? 96 : 150;
  const maxChars = isMobile ? 14 : 22;
  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={8}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis
          type="number"
          tick={AXIS}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => (currency ? compactCurrency(v) : formatNumber(v))}
        />
        <YAxis
          type="category"
          dataKey={label}
          tick={{ ...AXIS, fill: 'var(--foreground)' }}
          axisLine={false}
          tickLine={false}
          width={labelWidth}
          tickFormatter={(v: string) => (v.length > maxChars ? `${v.slice(0, maxChars - 1)}…` : v)}
        />
        <Tooltip
          cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
          content={<ChartTooltip format={currency ? formatCurrency : formatNumber} />}
        />
        <Bar dataKey={value} fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Barra de distribución (estados): segmentos con 2px de separación y leyenda con conteos. */
export function DistributionBar({
  segments,
}: {
  segments: { key: string; label: string; value: number; className: string }[];
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (!total) return <div className="h-3 rounded-full bg-muted" />;
  return (
    <div className="space-y-3">
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div
              key={s.key}
              className={s.className}
              style={{ width: `${(s.value / total) * 100}%` }}
              title={`${s.label}: ${s.value}`}
            />
          ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
        {segments.map((s) => (
          <li key={s.key} className="flex min-w-0 items-center gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${s.className}`} />
            <span className="min-w-0 truncate text-muted-foreground">{s.label}</span>
            <span className="ml-auto font-medium tabular-nums text-foreground">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const STATUS_BAR_CLASS: Record<string, string> = {
  PENDING: 'bg-amber-500',
  PROCESSING: 'bg-sky-500',
  SHIPPED: 'bg-violet-500',
  DELIVERED: 'bg-emerald-500',
  CANCELLED: 'bg-red-500',
};
