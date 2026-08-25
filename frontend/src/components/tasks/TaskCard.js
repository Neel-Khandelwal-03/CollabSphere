'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare, Paperclip, Calendar } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import PriorityBadge from '@/components/ui/PriorityBadge';
import LabelPill from '@/components/ui/LabelPill';
import { cn } from '@/lib/utils';

export default function TaskCard({ task, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'cursor-grab rounded-xl border border-line bg-surface p-3.5 shadow-sm shadow-ink/[0.03] transition-shadow hover:shadow-md active:cursor-grabbing',
        isDragging && 'opacity-40'
      )}
    >
      {task.labels?.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {task.labels.map((l) => (
            <LabelPill key={l.id} label={l} />
          ))}
        </div>
      )}

      <p className="text-sm font-medium leading-snug text-ink">{task.title}</p>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={task.priority} />
          {task.due_date && (
            <span className={cn('flex items-center gap-1 text-[11px]', isOverdue ? 'text-danger' : 'text-muted')}>
              <Calendar className="h-3 w-3" />
              {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
        {task.assignee_name && <Avatar name={task.assignee_name} src={task.assignee_avatar} size={22} />}
      </div>

      {(task.comment_count > 0 || task.attachment_count > 0) && (
        <div className="mt-2 flex items-center gap-3 border-t border-line/70 pt-2 text-[11px] text-muted">
          {task.comment_count > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {task.comment_count}
            </span>
          )}
          {task.attachment_count > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              {task.attachment_count}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
