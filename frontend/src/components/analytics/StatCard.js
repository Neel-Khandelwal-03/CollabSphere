'use client';

export default function StatCard({ label, value, icon: Icon, loading }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      {Icon && <Icon className="h-4 w-4 text-brand" />}
      {loading ? (
        <div className="mt-3 h-8 w-16 animate-pulse rounded bg-ink/10" />
      ) : (
        <p className="mt-3 font-display text-2xl font-semibold text-ink">{value}</p>
      )}
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}
