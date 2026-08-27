'use client';

import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Plus, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import IssueStatusBadge from '@/components/ui/IssueStatusBadge';
import SeverityBadge from '@/components/ui/SeverityBadge';
import IssueTypeBadge from '@/components/ui/IssueTypeBadge';
import PriorityBadge from '@/components/ui/PriorityBadge';
import { useIssues, useProjectIssues } from '@/hooks/useIssues';

function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function IssueTable({ projectId, onIssueClick, showProjectColumn = false, onCreateClick }) {
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [severity, setSeverity] = useState('');
  const [type, setType] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const search = useDebounced(searchInput);
  const filters = { search, status, priority, severity, type, sort, page, pageSize: 15 };
  const hasActiveFilters = Boolean(search || status || priority || severity || type);

  const useScoped = !!projectId && !showProjectColumn;
  const globalQuery = useIssues(projectId ? { ...filters, projectId } : filters, { enabled: !useScoped });
  const scopedQuery = useProjectIssues(projectId, filters, { enabled: useScoped });
  const { data, isLoading, isError, refetch } = useScoped ? scopedQuery : globalQuery;

  const issues = data?.issues || [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const resetPage = (setter) => (val) => { setter(val); setPage(1); };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search title, description, or #number..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => resetPage(setSearchInput)(e.target.value)}
          />
        </div>
        <Select value={status} onChange={(e) => resetPage(setStatus)(e.target.value)} className="w-auto">
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
          <option value="reopened">Reopened</option>
        </Select>
        <Select value={priority} onChange={(e) => resetPage(setPriority)(e.target.value)} className="w-auto">
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </Select>
        <Select value={severity} onChange={(e) => resetPage(setSeverity)(e.target.value)} className="w-auto">
          <option value="">All severities</option>
          <option value="minor">Minor</option>
          <option value="major">Major</option>
          <option value="critical">Critical</option>
          <option value="blocker">Blocker</option>
        </Select>
        <Select value={type} onChange={(e) => resetPage(setType)(e.target.value)} className="w-auto">
          <option value="">All types</option>
          <option value="bug">Bug</option>
          <option value="feature_request">Feature Request</option>
          <option value="improvement">Improvement</option>
          <option value="task">Task</option>
          <option value="research">Research</option>
          <option value="epic">Epic</option>
          <option value="documentation">Documentation</option>
          <option value="performance">Performance</option>
          <option value="security">Security</option>
          <option value="technical_debt">Technical Debt</option>
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-auto">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="priority">Priority</option>
          <option value="severity">Severity</option>
          <option value="status">Status</option>
          <option value="alphabetical">Alphabetical</option>
        </Select>
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b border-line bg-ink/[0.02] text-left text-xs text-muted">
              <th className="px-4 py-2.5 font-medium">ID</th>
              <th className="px-4 py-2.5 font-medium">Title</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Priority</th>
              <th className="px-4 py-2.5 font-medium">Severity</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Assignee</th>
              <th className="px-4 py-2.5 font-medium">Reporter</th>
              <th className="px-4 py-2.5 font-medium">Linked Task</th>
              {showProjectColumn && <th className="px-4 py-2.5 font-medium">Project</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-muted">Loading...</td></tr>
            )}
            {isError && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center">
                  <p className="text-sm text-danger">Unable to load issues.</p>
                  <button
                    onClick={() => refetch()}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Try again
                  </button>
                </td>
              </tr>
            )}
            {!isLoading && !isError && issues.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center">
                  <p className="text-sm text-muted">
                    {hasActiveFilters
                      ? 'No issues match your filters.'
                      : 'No issues have been raised in your accessible projects yet.'}
                  </p>
                  {!hasActiveFilters && onCreateClick && (
                    <Button onClick={onCreateClick} className="mt-3">
                      <Plus className="h-4 w-4" /> Raise Issue
                    </Button>
                  )}
                </td>
              </tr>
            )}
            {issues.map((i) => (
              <tr
                key={i.id}
                onClick={() => onIssueClick(i)}
                className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-ink/[0.02]"
              >
                <td className="px-4 py-2.5 font-mono text-xs text-muted">#{i.issue_number}</td>
                <td className="px-4 py-2.5 font-medium text-ink">{i.title}</td>
                <td className="px-4 py-2.5"><IssueTypeBadge type={i.type} iconOnly /></td>
                <td className="px-4 py-2.5"><PriorityBadge priority={i.priority} /></td>
                <td className="px-4 py-2.5"><SeverityBadge severity={i.severity} /></td>
                <td className="px-4 py-2.5"><IssueStatusBadge status={i.status} /></td>
                <td className="px-4 py-2.5">
                  {i.assignee_name ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar name={i.assignee_name} src={i.assignee_avatar} size={20} />
                      <span className="text-xs text-ink">{i.assignee_name}</span>
                    </div>
                  ) : <span className="text-xs text-muted">Unassigned</span>}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted">{i.reporter_name || '—'}</td>
                <td className="px-4 py-2.5 text-xs text-muted">{i.linked_task_title || '—'}</td>
                {showProjectColumn && <td className="px-4 py-2.5 text-xs text-muted">{i.project_name}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      {data && data.total > data.pageSize && (
        <div className="mt-3 flex items-center justify-between text-sm text-muted">
          <span>Page {page} of {totalPages} · {data.total} issues</span>
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
