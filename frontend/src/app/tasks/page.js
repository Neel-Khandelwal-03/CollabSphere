'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckSquare } from 'lucide-react';
import AppShell from '@/components/AppShell';
import TaskTable from '@/components/tasks/TaskTable';
import TaskDetailsDrawer from '@/components/tasks/TaskDetailsDrawer';
import { useTask } from '@/hooks/useTasks';

function DeepLinkedTask({ taskId, onResolved }) {
  const { data } = useTask(taskId);
  useEffect(() => {
    if (data?.task) onResolved(data.task);
  }, [data, onResolved]);
  return null;
}

function TasksPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get('open');
  const [activeTask, setActiveTask] = useState(null);

  const closeTask = () => {
    setActiveTask(null);
    // Root cause of the drawer not closing: openId stayed truthy after
    // close, so {openId && !activeTask && <DeepLinkedTask/>} immediately
    // re-triggered, resolved from React Query's cache, and reopened the
    // same task. Clearing the param (replace, not push, so this doesn't
    // add a spurious back-button stop) breaks that loop for good.
    if (openId) router.replace('/tasks', { scroll: false });
  };

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

      {openId && !activeTask && (
        <DeepLinkedTask taskId={openId} onResolved={setActiveTask} />
      )}

      {activeTask && (
        <TaskDetailsDrawer
          taskId={activeTask.id}
          workspaceId={activeTask.workspace_id}
          onClose={closeTask}
        />
      )}
    </AppShell>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <TasksPageContent />
    </Suspense>
  );
}
