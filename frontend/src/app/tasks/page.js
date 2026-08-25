'use client';

import { useState } from 'react';
import { CheckSquare } from 'lucide-react';
import AppShell from '@/components/AppShell';
import TaskTable from '@/components/tasks/TaskTable';
import TaskDetailsDrawer from '@/components/tasks/TaskDetailsDrawer';

export default function TasksPage() {
  const [activeTask, setActiveTask] = useState(null);

  return (
    <AppShell title="Tasks">
      <p className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-brand">
        <CheckSquare className="h-3.5 w-3.5" />
        Every task across your workspaces
      </p>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">Tasks</h2>

      <div className="mt-6">
        <TaskTable onTaskClick={setActiveTask} showProjectColumn />
      </div>

      {activeTask && (
        <TaskDetailsDrawer
          taskId={activeTask.id}
          workspaceId={activeTask.workspace_id}
          onClose={() => setActiveTask(null)}
        />
      )}
    </AppShell>
  );
}
