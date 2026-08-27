'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CHART_COLORS } from './chartColors';

/** `data`: [{ day, value }] with `day` an ISO date string. */
export default function TimeSeriesChart({ data, valueLabel = 'Count', height = 200 }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted" style={{ height }}>
        No activity in this range.
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formatted} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.brand} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART_COLORS.brand} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={CHART_COLORS.line} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} width={28} />
        <Tooltip
          formatter={(value) => [value, valueLabel]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_COLORS.line}` }}
        />
        <Area type="monotone" dataKey="value" stroke={CHART_COLORS.brand} strokeWidth={2} fill="url(#areaFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
