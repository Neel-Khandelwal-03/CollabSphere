import { formatDistanceToNow } from 'date-fns';

const LABELS = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
const STATUS_LABELS = {
  backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', testing: 'Testing', completed: 'Completed',
};

function describe(item) {
  const actor = item.actor_name || 'Someone';
  switch (item.action) {
    case 'created':
      return `${actor} created this task`;
    case 'updated':
      return item.details?.title
        ? `${actor} renamed this task to "${item.details.title.to}"`
        : `${actor} updated this task`;
    case 'status_changed':
      return `${actor} moved this from ${STATUS_LABELS[item.details?.from] || item.details?.from} to ${STATUS_LABELS[item.details?.to] || item.details?.to}`;
    case 'priority_changed':
      return `${actor} changed priority from ${LABELS[item.details?.from] || item.details?.from} to ${LABELS[item.details?.to] || item.details?.to}`;
    case 'assignee_changed':
      return `${actor} reassigned this task`;
    case 'comment_added':
      return `${actor} commented`;
    case 'attachment_uploaded':
      return `${actor} attached ${item.details?.fileName || 'a file'}`;
    default:
      return `${actor} did something`;
  }
}

export default function ActivityTimeline({ activity }) {
  if (!activity || activity.length === 0) {
    return <p className="text-sm text-muted">No activity yet.</p>;
  }
  return (
    <ul className="space-y-3">
      {activity.map((item) => (
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
