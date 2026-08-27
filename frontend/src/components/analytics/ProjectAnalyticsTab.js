'use client';

import { CheckSquare, AlertCircle, Users, FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import StatCard from './StatCard';
import StatusBarChart from './StatusBarChart';
import TimeSeriesChart from './TimeSeriesChart';
import CompletionGauge from './CompletionGauge';
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS, TASK_PRIORITY_COLORS, ISSUE_SEVERITY_COLORS } from './chartColors';
import { useProjectAnalytics } from '@/hooks/useAnalytics';

const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
const SEVERITY_LABELS = { minor: 'Minor', major: 'Major', critical: 'Critical', blocker: 'Blocker' };

export default function ProjectAnalyticsTab({ projectId }) {
  const { data, isLoading } = useProjectAnalytics(projectId);

  const stats = [
    { label: 'Total tasks', value: data?.tasks?.total, icon: CheckSquare },
    { label: 'Overdue tasks', value: data?.tasks?.overdue, icon: CheckSquare },
    { label: 'Total issues', value: data?.issues?.total, icon: AlertCircle },
    { label: 'Critical issues', value: data?.issues?.critical, icon: AlertCircle },
    { label: 'Members', value: data?.membersCount, icon: Users },
    { label: 'Files', value: data?.filesCount, icon: FileText },
  ];

  const taskStatusData = data
    ? ['backlog', 'todo', 'in_progress', 'testing', 'completed'].map((key) => ({
        key,
        label: TASK_STATUS_LABELS[key],
        value: data.tasks[key] || 0,
      }))
    : [];

  const priorityData = data?.tasksByPriority
    ? Object.entries(data.tasksByPriority).map(([key, value]) => ({ key, label: PRIORITY_LABELS[key], value }))
    : [];

  const severityData = data?.issues?.bySeverity
    ? ['minor', 'major', 'critical', 'blocker'].map((key) => ({
        key,
        label: SEVERITY_LABELS[key],
        value: data.issues.bySeverity.find((s) => s.severity === key)?.count || 0,
      }))
    : [];

  const weeklyData = (data?.weeklyProgress || []).map((d) => ({ day: d.day, value: d.completed }));

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} loading={isLoading} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center p-5">
          <p className="self-start font-mono text-xs uppercase tracking-wider text-muted">Completion</p>
          <div className="mt-2">
            {isLoading ? (
              <div className="flex h-[140px] w-[140px] items-center justify-center text-sm text-muted">...</div>
            ) : (
              <CompletionGauge percent={data?.tasks?.completionPercent ?? 0} />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">Tasks by status</p>
          <div className="mt-3">
            {isLoading ? <p className="text-sm text-muted">Loading...</p> : <StatusBarChart data={taskStatusData} colors={TASK_STATUS_COLORS} />}
          </div>
        </Card>

        <Card className="p-5">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">Tasks by priority</p>
          <div className="mt-3">
            {isLoading ? <p className="text-sm text-muted">Loading...</p> : <StatusBarChart data={priorityData} colors={TASK_PRIORITY_COLORS} />}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">Issues by severity</p>
          <div className="mt-3">
            {isLoading ? <p className="text-sm text-muted">Loading...</p> : <StatusBarChart data={severityData} colors={ISSUE_SEVERITY_COLORS} />}
          </div>
        </Card>

        <Card className="p-5">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">Weekly task progress</p>
          <div className="mt-3">
            {isLoading ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted">Loading...</div>
            ) : (
              <TimeSeriesChart data={weeklyData} valueLabel="Completed" />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
