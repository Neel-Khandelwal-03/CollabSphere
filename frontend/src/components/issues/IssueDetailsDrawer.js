'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Trash2, User, Link2, Unlink } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import IssueStatusBadge from '@/components/ui/IssueStatusBadge';
import SeverityBadge from '@/components/ui/SeverityBadge';
import IssueTypeBadge from '@/components/ui/IssueTypeBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LabelPill from '@/components/ui/LabelPill';
import EditIssueModal from './EditIssueModal';
import IssueCommentPanel from './IssueCommentPanel';
import IssueAttachmentPanel from './IssueAttachmentPanel';
import IssueHistoryTimeline from './IssueHistoryTimeline';
import {
  useIssue, useChangeIssueStatus, useChangeIssuePriority, useChangeIssueSeverity,
  useChangeIssueAssignee, useLinkIssueTask, useDeleteIssue,
  useAttachIssueLabel, useDetachIssueLabel,
} from '@/hooks/useIssues';
import { useWorkspaceMembers } from '@/hooks/useWorkspaces';
import { useWorkspaceLabels } from '@/hooks/useTasks';
import { useProjectTasks } from '@/hooks/useTasks';
import { useAuthStore } from '@/store/authStore';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'reopened', label: 'Reopened' },
];

const MANAGER_ROLES = ['owner', 'admin'];

export default function IssueDetailsDrawer({ issueId, workspaceId, onClose, onDeleted }) {
  const currentUser = useAuthStore((s) => s.user);
  const { data, isLoading } = useIssue(issueId);
  const { data: members } = useWorkspaceMembers(workspaceId);
  const { data: workspaceLabels } = useWorkspaceLabels(workspaceId);

  const issue = data?.issue;
  const { data: tasks } = useProjectTasks(issue?.project_id);

  const changeStatus = useChangeIssueStatus(issueId, issue?.project_id);
  const changePriority = useChangeIssuePriority(issueId, issue?.project_id);
  const changeSeverity = useChangeIssueSeverity(issueId, issue?.project_id);
  const changeAssignee = useChangeIssueAssignee(issueId, issue?.project_id);
  const linkTask = useLinkIssueTask(issueId, issue?.project_id);
  const deleteIssue = useDeleteIssue(issue?.project_id);
  const attachLabel = useAttachIssueLabel(issueId);
  const detachLabel = useDetachIssueLabel(issueId);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (typeof document === 'undefined') return null;
  if (!issueId) return null;

  const myRole = data?.myRole;
  const isManager = MANAGER_ROLES.includes(myRole);
  const isAssignee = issue?.assignee_id === currentUser?.id;
  const canEdit = isManager || isAssignee;
  const canComment = myRole && myRole !== 'viewer';
  const attachedIds = new Set((issue?.labels || []).map((l) => l.id));
  const availableLabels = (workspaceLabels || []).filter((l) => !attachedIds.has(l.id));

  return createPortal(
    <AnimatePresence>
      {issueId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex h-full w-full max-w-xl flex-col bg-surface shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <p className="font-mono text-xs uppercase tracking-wider text-muted">
                {issue ? `Issue #${issue.issue_number}` : 'Issue'}
              </p>
              <div className="flex items-center gap-1">
                {isManager && (
                  <button onClick={() => setDeleteOpen(true)} className="rounded-md p-1.5 text-muted hover:bg-danger-tint hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {isLoading || !issue ? (
              <div className="flex-1 p-6">
                <div className="h-6 w-2/3 animate-pulse rounded bg-ink/5" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <IssueTypeBadge type={issue.type} />
                    </div>
                    <h2 className="mt-2 font-display text-lg font-semibold text-ink">{issue.title}</h2>
                  </div>
                  {canEdit && (
                    <Button variant="outline" onClick={() => setEditOpen(true)} className="shrink-0">
                      <Settings className="h-3.5 w-3.5" /> Edit
                    </Button>
                  )}
                </div>

                {issue.description && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{issue.description}</p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1 text-xs text-muted">Status</p>
                    {canEdit ? (
                      <Select
                        value={issue.status}
                        onChange={(e) => changeStatus.mutate(e.target.value)}
                        className="py-1.5 text-sm"
                        disabled={changeStatus.isPending}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </Select>
                    ) : (
                      <IssueStatusBadge status={issue.status} />
                    )}
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-muted">Priority</p>
                    {canEdit ? (
                      <Select
                        value={issue.priority}
                        onChange={(e) => changePriority.mutate(e.target.value)}
                        className="py-1.5 text-sm"
                        disabled={changePriority.isPending}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </Select>
                    ) : (
                      <p className="text-sm capitalize text-ink">{issue.priority}</p>
                    )}
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-muted">Severity</p>
                    {canEdit ? (
                      <Select
                        value={issue.severity}
                        onChange={(e) => changeSeverity.mutate(e.target.value)}
                        className="py-1.5 text-sm"
                        disabled={changeSeverity.isPending}
                      >
                        <option value="minor">Minor</option>
                        <option value="major">Major</option>
                        <option value="critical">Critical</option>
                        <option value="blocker">Blocker</option>
                      </Select>
                    ) : (
                      <SeverityBadge severity={issue.severity} />
                    )}
                  </div>

                  <div>
                    <p className="mb-1 flex items-center gap-1 text-xs text-muted"><User className="h-3 w-3" /> Assignee</p>
                    {canEdit ? (
                      <Select
                        value={issue.assignee_id || ''}
                        onChange={(e) => changeAssignee.mutate(e.target.value || null)}
                        className="py-1.5 text-sm"
                        disabled={changeAssignee.isPending}
                      >
                        <option value="">Unassigned</option>
                        {members?.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                      </Select>
                    ) : (
                      <p className="text-sm text-ink">{issue.assignee_name || 'Unassigned'}</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
                  <span>Reported by {issue.reporter_name || 'Unknown'}</span>
                  <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                  {issue.closed_at && <span>Closed {new Date(issue.closed_at).toLocaleDateString()}</span>}
                </div>

                <div className="mt-5">
                  <p className="mb-2 flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted">
                    <Link2 className="h-3 w-3" /> Linked task
                  </p>
                  {canEdit ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={issue.linked_task_id || ''}
                        onChange={(e) => linkTask.mutate(e.target.value || null)}
                        disabled={linkTask.isPending}
                      >
                        <option value="">No linked task</option>
                        {tasks?.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                      </Select>
                      {issue.linked_task_id && (
                        <button
                          onClick={() => linkTask.mutate(null)}
                          className="rounded-md p-1.5 text-muted hover:bg-danger-tint hover:text-danger"
                          aria-label="Unlink task"
                        >
                          <Unlink className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ) : issue.linked_task_title ? (
                    <p className="text-sm text-ink">{issue.linked_task_title}</p>
                  ) : (
                    <p className="text-sm text-muted">No linked task</p>
                  )}
                </div>

                <div className="mt-5">
                  <p className="mb-2 font-mono text-xs uppercase tracking-wider text-muted">Labels</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(issue.labels || []).map((l) => (
                      <LabelPill key={l.id} label={l} onRemove={canEdit ? () => detachLabel.mutate(l.id) : undefined} />
                    ))}
                    {(issue.labels || []).length === 0 && <p className="text-sm text-muted">No labels yet.</p>}
                  </div>
                  {canEdit && availableLabels.length > 0 && (
                    <select
                      className="mt-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink"
                      value=""
                      onChange={(e) => e.target.value && attachLabel.mutate(e.target.value)}
                    >
                      <option value="">Add a label...</option>
                      {availableLabels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  )}
                </div>

                <div className="mt-6 border-t border-line pt-5">
                  <p className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">
                    Attachments ({data.attachments?.length || 0})
                  </p>
                  <IssueAttachmentPanel
                    issueId={issueId}
                    attachments={data.attachments || []}
                    canUpload={canEdit}
                    canModerate={isManager}
                  />
                </div>

                <div className="mt-6 border-t border-line pt-5">
                  <p className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">
                    Comments ({data.comments?.length || 0})
                  </p>
                  <IssueCommentPanel
                    issueId={issueId}
                    comments={data.comments || []}
                    canComment={canComment}
                    canModerate={isManager}
                    mentionCandidates={(members || []).map((m) => ({ id: m.user_id, name: m.name, avatarUrl: m.avatar_url }))}
                  />
                </div>

                <div className="mt-6 border-t border-line pt-5">
                  <p className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">Activity</p>
                  <IssueHistoryTimeline history={data.history} />
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {issue && <EditIssueModal open={editOpen} onClose={() => setEditOpen(false)} issue={issue} />}
      {issue && (
        <ConfirmDialog
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          title={`Delete issue #${issue.issue_number}?`}
          description={`This permanently deletes "${issue.title}" and its comments. This can't be undone.`}
          confirmLabel="Delete issue"
          loading={deleteIssue.isPending}
          onConfirm={() =>
            deleteIssue.mutate(issueId, {
              onSuccess: () => { setDeleteOpen(false); onClose(); onDeleted?.(); },
            })
          }
        />
      )}
    </AnimatePresence>,
    document.body
  );
}
