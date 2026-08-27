'use client';

import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { CHART_COLORS } from './chartColors';

export default function CompletionGauge({ percent, size = 140 }) {
  const color = percent >= 75 ? CHART_COLORS.signal : percent >= 40 ? CHART_COLORS.brand : CHART_COLORS.muted;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <RadialBarChart
        width={size}
        height={size}
        cx="50%"
        cy="50%"
        innerRadius="72%"
        outerRadius="100%"
        barSize={10}
        data={[{ value: percent, fill: color }]}
        startAngle={90}
        endAngle={-270}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
        <RadialBar dataKey="value" cornerRadius={6} background={{ fill: CHART_COLORS.line }} />
      </RadialBarChart>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-2xl font-semibold text-ink">{percent}%</span>
        <span className="text-[11px] text-muted">complete</span>
      </div>
    </div>
  );
}
