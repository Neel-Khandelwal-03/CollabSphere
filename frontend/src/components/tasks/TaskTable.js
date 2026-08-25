'use client';

import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityBadge from '@/components/ui/PriorityBadge';
import { useTasks } from '@/hooks/useTasks';

function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function TaskTable({ projectId, onTaskClick, showProjectColumn = false }) {
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const search = useDebounced(searchInput);
  const { data, isLoading } = useTasks({ projectId, search, status, priority, sort, page, pageSize: 15 });

  const tasks = data?.tasks || [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search tasks..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-auto">
          <option value="">All statuses</option>
          <option value="backlog">Backlog</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="testing">Testing</option>
          <option value="completed">Completed</option>
        </Select>
        <Select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} className="w-auto">
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-auto">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="priority">Priority</option>
          <option value="deadline">Deadline</option>
          <option value="alphabetical">Alphabetical</option>
        </Select>
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line bg-ink/[0.02] text-left text-xs text-muted">
              <th className="px-4 py-2.5 font-medium">Task</th>
              <th className="px-4 py-2.5 font-medium">Priority</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Assignee</th>
              <th className="px-4 py-2.5 font-medium">Due date</th>
              {showProjectColumn && <th className="px-4 py-2.5 font-medium">Project</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={showProjectColumn ? 6 : 5} className="px-4 py-8 text-center text-muted">
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading && tasks.length === 0 && (
              <tr>
                <td colSpan={showProjectColumn ? 6 : 5} className="px-4 py-8 text-center text-muted">
                  No tasks found.
                </td>
              </tr>
            )}
            {tasks.map((t) => (
              <tr
                key={t.id}
                onClick={() => onTaskClick(t)}
                className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-ink/[0.02]"
              >
                <td className="px-4 py-2.5 font-medium text-ink">{t.title}</td>
                <td className="px-4 py-2.5"><PriorityBadge priority={t.priority} /></td>
                <td className="px-4 py-2.5"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-2.5">
                  {t.assignee_name ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar name={t.assignee_name} src={t.assignee_avatar} size={20} />
                      <span className="text-xs text-ink">{t.assignee_name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted">
                  {t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}
                </td>
                {showProjectColumn && (
                  <td className="px-4 py-2.5 text-xs text-muted">{t.project_name}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      {data && data.total > data.pageSize && (
        <div className="mt-3 flex items-center justify-between text-sm text-muted">
          <span>
            Page {page} of {totalPages} · {data.total} tasks
          </span>
          <div className="flex gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
