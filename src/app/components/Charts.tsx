import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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
  payload?: { value: number; payload: Record<string, unknown> }[];
  label?: string;
  format: (v: number) => string;
  labelFormat?: (label: string, row: Record<string, unknown>) => ReactNode;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="text-muted-foreground">{labelFormat ? labelFormat(String(label), row) : label}</div>
      <div className="mt-0.5 text-sm font-semibold text-foreground tabular-nums">{format(payload[0].value)}</div>
    </div>
  );
}

export const compactCurrency = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', notation: 'compact', maximumFractionDigits: 1 }).format(v);

export function TrendChart<T extends Record<string, unknown>>({
  data,
  x,
  y,
  height = 260,
  currency = true,
  labelFormat,
}: {
  data: T[];
  x: keyof T & string;
  y: keyof T & string;
  height?: number;
  currency?: boolean;
  labelFormat?: (label: string, row: Record<string, unknown>) => ReactNode;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
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
        <Area
          type="monotone"
          dataKey={y}
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#trendFill)"
          activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2 }}
        />
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
}: {
  data: T[];
  label: keyof T & string;
  value: keyof T & string;
  currency?: boolean;
}) {
  const height = Math.max(120, data.length * 36 + 16);
  // En pantallas chicas se acorta la columna de etiquetas para dejar lugar a las barras.
  const isMobile = useIsMobile();
  const labelWidth = isMobile ? 96 : 150;
  const maxChars = isMobile ? 14 : 22;
  return (
    <ResponsiveContainer width="100%" height={height}>
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
