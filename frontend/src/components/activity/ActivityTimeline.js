'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '@/components/ui/Avatar';
import { Select } from '@/components/ui/Select';
import { describeActivity } from './describeActivity';
import { useWorkspaceActivity, useProjectActivity, useLiveActivity } from '@/hooks/useActivity';

const CATEGORIES = [
  { key: '', label: 'All' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'issues', label: 'Issues' },
  { key: 'projects', label: 'Projects' },
  { key: 'members', label: 'Members' },
  { key: 'files', label: 'Files' },
  { key: 'system', label: 'System' },
];

/**
 * scope: { type: 'workspace', workspaceId } | { type: 'project', projectId, workspaceId }
 * workspaceId is always present (needed for the live-activity socket
 * subscription regardless of scope type), mirroring FileManager's scope
 * shape from Checkpoint 7.
 */
export default function ActivityTimeline({ scope }) {
  const [category, setCategory] = useState('');
  const filters = category ? { category } : {};

  const workspaceQuery = useWorkspaceActivity(scope.type === 'workspace' ? scope.workspaceId : undefined, filters);
  const projectQuery = useProjectActivity(scope.type === 'project' ? scope.projectId : undefined, filters);
  const { data: activity, isLoading } = scope.type === 'workspace' ? workspaceQuery : projectQuery;

  useLiveActivity(scope.workspaceId);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto">
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </Select>
      </div>

      <div className="mt-4">
        {isLoading && <p className="py-8 text-center text-sm text-muted">Loading activity...</p>}

        {!isLoading && activity?.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">No activity yet.</p>
        )}

        {!isLoading && activity?.length > 0 && (
          <ol className="space-y-4 border-l border-line pl-5">
            {activity.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-brand" />
                <div className="flex items-start gap-2.5">
                  <Avatar name={a.actor_name || 'System'} src={a.actor_avatar} size={22} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">{describeActivity(a)}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      {a.project_name && ` · ${a.project_name}`}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
