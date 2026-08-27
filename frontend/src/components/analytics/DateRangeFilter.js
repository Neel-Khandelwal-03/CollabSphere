'use client';

const PRESETS = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
];

export default function DateRangeFilter({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange({ range: p.key })}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            value.range === p.key ? 'bg-ink text-paper' : 'bg-ink/5 text-ink hover:bg-ink/10'
          }`}
        >
          {p.label}
        </button>
      ))}
      <label className="flex items-center gap-1.5 rounded-full bg-ink/5 px-3 py-1.5 text-xs font-medium text-ink">
        Since
        <input
          type="date"
          value={value.from || ''}
          onChange={(e) => onChange({ range: 'custom', from: e.target.value })}
          className="bg-transparent text-xs text-ink outline-none"
        />
      </label>
    </div>
  );
}
