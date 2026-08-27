'use client';

import Avatar from '@/components/ui/Avatar';

/**
 * Deliberately a simple list with proportional bars, not a ranked
 * leaderboard - no rank numbers, no "top performer" framing. The
 * heading and empty state both say "activity," never "performance,"
 * per the spec's explicit warning against presenting this as an
 * evaluation metric.
 */
export default function TeamContributionChart({ data }) {
  const maxValue = Math.max(1, ...data.map((d) => d.tasks_completed + d.issues_resolved));

  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">No team activity yet.</p>;
  }

  return (
    <div className="space-y-3">
      {data.map((m) => {
        const total = m.tasks_completed + m.issues_resolved;
        return (
          <div key={m.user_id} className="flex items-center gap-3">
            <Avatar name={m.name} src={m.avatar_url} size={26} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm text-ink">{m.name}</p>
                <p className="shrink-0 text-xs text-muted">
                  {m.tasks_completed} tasks · {m.issues_resolved} issues
                </p>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/5">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${(total / maxValue) * 100}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
