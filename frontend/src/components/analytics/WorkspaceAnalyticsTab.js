'use client';

import { useState } from 'react';
import { FolderKanban, CheckSquare, AlertCircle, Users, FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import StatCard from './StatCard';
import TimeSeriesChart from './TimeSeriesChart';
import TeamContributionChart from './TeamContributionChart';
import DateRangeFilter from './DateRangeFilter';
import { useWorkspaceAnalytics } from '@/hooks/useAnalytics';

export default function WorkspaceAnalyticsTab({ workspaceId }) {
  const [range, setRange] = useState({ range: '30d' });
  const { data, isLoading } = useWorkspaceAnalytics(workspaceId, range);

  const stats = [
    { label: 'Total projects', value: data?.projects?.total, icon: FolderKanban },
    { label: 'Active projects', value: data?.projects?.active, icon: FolderKanban },
    { label: 'Completed projects', value: data?.projects?.completed, icon: FolderKanban },
    { label: 'Total tasks', value: data?.tasks?.total, icon: CheckSquare },
    { label: 'Completed tasks', value: data?.tasks?.completed, icon: CheckSquare },
    { label: 'Overdue tasks', value: data?.tasks?.overdue, icon: CheckSquare },
    { label: 'Open issues', value: data?.issues?.open, icon: AlertCircle },
    { label: 'Resolved issues', value: data?.issues?.resolved, icon: AlertCircle },
    { label: 'Members', value: data?.members?.total, icon: Users },
    { label: 'Active members', value: data?.members?.active, icon: Users },
    { label: 'Files', value: data?.filesCount, icon: FileText },
  ];

  const activityData = (data?.activityOverTime || []).map((d) => ({ day: d.day, value: d.count }));

  return (
    <div>
      <DateRangeFilter value={range} onChange={setRange} />

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} loading={isLoading} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">Activity over time</p>
          <div className="mt-3">
            {isLoading ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted">Loading...</div>
            ) : (
              <TimeSeriesChart data={activityData} valueLabel="Events" />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">Team activity</p>
          <p className="mt-0.5 text-xs text-muted">Tasks completed and issues resolved — an activity signal, not a performance score.</p>
          <div className="mt-3">
            {isLoading ? (
              <p className="text-sm text-muted">Loading...</p>
            ) : (
              <TeamContributionChart data={data?.teamContribution || []} />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
