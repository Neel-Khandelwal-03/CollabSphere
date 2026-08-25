'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import TaskCard from './TaskCard';
import { cn } from '@/lib/utils';

export default function KanbanColumn({ id, title, tasks, onTaskClick, onAddTask, canCreate }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl bg-ink/[0.025] p-2.5">
      <div className="flex items-center justify-between px-1.5 py-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <span className="rounded-full bg-ink/8 px-1.5 py-0.5 font-mono text-[10px] text-muted">
            {tasks.length}
          </span>
        </div>
        {canCreate && (
          <button
            onClick={() => onAddTask(id)}
            className="rounded-md p-1 text-muted hover:bg-ink/5 hover:text-ink"
            aria-label={`Add task to ${title}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'mt-1 flex min-h-[120px] flex-1 flex-col gap-2 rounded-lg p-1 transition-colors',
          isOver && 'bg-brand/5'
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-line py-6 text-xs text-muted">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}
