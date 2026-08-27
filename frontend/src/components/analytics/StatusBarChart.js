'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CHART_COLORS } from './chartColors';

/**
 * `data`: [{ key, label, value }]. `colors`: { key: hex }. One
 * reusable component behind Tasks-by-Status, Tasks-by-Priority,
 * Issues-by-Status, and Issues-by-Severity - the spec's four separate
 * "charts" are really the same shape with different data and colors,
 * so this avoids building four near-identical components.
 */
export default function StatusBarChart({ data, colors, height = 220 }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted" style={{ height }}>
        No data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={90}
          tick={{ fontSize: 12, fill: CHART_COLORS.ink }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: CHART_COLORS.line, opacity: 0.3 }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_COLORS.line}` }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
          {data.map((d) => (
            <Cell key={d.key} fill={colors[d.key] || CHART_COLORS.muted} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
