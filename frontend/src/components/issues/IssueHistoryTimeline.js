import { formatDistanceToNow } from 'date-fns';

const STATUS_LABELS = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed', reopened: 'Reopened' };
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
const SEVERITY_LABELS = { minor: 'Minor', major: 'Major', critical: 'Critical', blocker: 'Blocker' };

function describe(item) {
  const actor = item.actor_name || 'Someone';
  switch (item.action) {
    case 'created':
      return `${actor} reported this issue`;
    case 'updated':
      return `${actor} updated the title`;
    case 'status_changed':
      return `${actor} changed status from ${STATUS_LABELS[item.old_value] || item.old_value} to ${STATUS_LABELS[item.new_value] || item.new_value}`;
    case 'closed':
      return `${actor} closed this issue`;
    case 'reopened':
      return `${actor} reopened this issue`;
    case 'priority_changed':
      return `${actor} changed priority from ${PRIORITY_LABELS[item.old_value] || item.old_value} to ${PRIORITY_LABELS[item.new_value] || item.new_value}`;
    case 'severity_changed':
      return `${actor} changed severity from ${SEVERITY_LABELS[item.old_value] || item.old_value} to ${SEVERITY_LABELS[item.new_value] || item.new_value}`;
    case 'assignee_changed':
      return `${actor} reassigned this issue`;
    case 'task_linked':
      return `${actor} linked a task`;
    case 'task_unlinked':
      return `${actor} unlinked the task`;
    case 'comment_added':
      return `${actor} commented`;
    case 'comment_deleted':
      return `${actor} deleted a comment`;
    default:
      return `${actor} did something`;
  }
}

export default function IssueHistoryTimeline({ history }) {
  if (!history || history.length === 0) {
    return <p className="text-sm text-muted">No activity yet.</p>;
  }
  return (
    <ul className="space-y-3">
      {history.map((item) => (
        <li key={item.id} className="flex items-start gap-2.5 text-sm">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          <div>
            <p className="text-ink">{describe(item)}</p>
            <p className="text-xs text-muted">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
