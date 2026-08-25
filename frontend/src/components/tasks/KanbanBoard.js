'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import KanbanColumn from './KanbanColumn';
import TaskCard from './TaskCard';
import { useMoveTask } from '@/hooks/useTasks';

const COLUMNS = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'testing', label: 'Testing' },
  { key: 'completed', label: 'Completed' },
];

export default function KanbanBoard({ projectId, tasks, onTaskClick, onAddTask, canCreate }) {
  const moveTask = useMoveTask(projectId);
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const byColumn = COLUMNS.reduce((acc, col) => {
    acc[col.key] = tasks
      .filter((t) => t.status === col.key)
      .sort((a, b) => a.position - b.position);
    return acc;
  }, {});

  const handleDragStart = (event) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    let targetStatus;
    let targetIndex;

    const overTask = over.data?.current?.task;
    if (overTask) {
      targetStatus = overTask.status;
      const columnTasks = byColumn[targetStatus];
      targetIndex = columnTasks.findIndex((t) => t.id === overTask.id);
    } else if (COLUMNS.some((c) => c.key === over.id)) {
      targetStatus = over.id;
      targetIndex = byColumn[targetStatus].length;
    } else {
      return;
    }

    if (targetStatus === activeTask.status && targetIndex === activeTask.position) return;

    moveTask.mutate({ taskId: active.id, status: targetStatus, position: targetIndex });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.key}
            id={col.key}
            title={col.label}
            tasks={byColumn[col.key]}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask}
            canCreate={canCreate}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} onClick={() => {}} />}
      </DragOverlay>
    </DndContext>
  );
}
