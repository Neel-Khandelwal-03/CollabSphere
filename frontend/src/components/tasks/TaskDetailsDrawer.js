'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { X, Settings, Trash2, Calendar, Clock, User, Bug } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import StatusBadge from '@/components/ui/StatusBadge';
import IssueStatusBadge from '@/components/ui/IssueStatusBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EditTaskModal from './EditTaskModal';
import CommentPanel from './CommentPanel';
import AttachmentPanel from './AttachmentPanel';
import LabelSelector from './LabelSelector';
import ActivityTimeline from './ActivityTimeline';
import { useTask, useChangeTaskStatus, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useWorkspaceMembers } from '@/hooks/useWorkspaces';
import { useAuthStore } from '@/store/authStore';

const STATUS_OPTIONS = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'testing', label: 'Testing' },
  { value: 'completed', label: 'Completed' },
];

const MANAGER_ROLES = ['owner', 'admin'];

export default function TaskDetailsDrawer({ taskId, workspaceId, onClose, onDeleted }) {
  const currentUser = useAuthStore((s) => s.user);
  const { data, isLoading } = useTask(taskId);
  const { data: members } = useWorkspaceMembers(workspaceId);
  const changeStatus = useChangeTaskStatus(data?.task?.project_id);
  const updateTask = useUpdateTask(taskId, data?.task?.project_id);
  const deleteTask = useDeleteTask(data?.task?.project_id);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (typeof document === 'undefined') return null;
  if (!taskId) return null;

  const task = data?.task;
  const myRole = data?.myRole;
  const isManager = MANAGER_ROLES.includes(myRole);
  const isAssignee = task?.assigned_to === currentUser?.id;
  const canEditMeta = isManager || isAssignee;
  const canChangeStatus = myRole && myRole !== 'viewer';
  const canComment = myRole && myRole !== 'viewer';
  const canUpload = myRole && myRole !== 'viewer';
  const canManageLabels = myRole && myRole !== 'viewer';

  return createPortal(
    <AnimatePresence>
      {taskId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex h-full w-full max-w-xl flex-col bg-surface shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <p className="font-mono text-xs uppercase tracking-wider text-muted">Task details</p>
              <div className="flex items-center gap-1">
                {isManager && (
                  <button
                    onClick={() => setDeleteOpen(true)}
                    className="rounded-md p-1.5 text-muted hover:bg-danger-tint hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {isLoading || !task ? (
              <div className="flex-1 p-6">
                <div className="h-6 w-2/3 animate-pulse rounded bg-ink/5" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-lg font-semibold text-ink">{task.title}</h2>
                  {canEditMeta && (
                    <Button variant="outline" onClick={() => setEditOpen(true)} className="shrink-0">
                      <Settings className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  )}
                </div>

                {task.description && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{task.description}</p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1 text-xs text-muted">Status</p>
                    {canChangeStatus ? (
                      <Select
                        value={task.status}
                        onChange={(e) => changeStatus.mutate({ taskId, status: e.target.value })}
                        className="py-1.5 text-sm"
                        disabled={changeStatus.isPending}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </Select>
                    ) : (
                      <StatusBadge status={task.status} />
                    )}
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-muted">Priority</p>
                    {canEditMeta ? (
                      <Select
                        value={task.priority}
                        onChange={(e) => updateTask.mutate({ priority: e.target.value })}
                        className="py-1.5 text-sm"
                        disabled={updateTask.isPending}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </Select>
                    ) : (
                      <p className="text-sm text-ink capitalize">{task.priority}</p>
                    )}
                  </div>

                  <div>
                    <p className="mb-1 flex items-center gap-1 text-xs text-muted">
                      <User className="h-3 w-3" /> Assignee
                    </p>
                    {canEditMeta ? (
                      <Select
                        value={task.assigned_to || ''}
                        onChange={(e) => updateTask.mutate({ assignedTo: e.target.value || null })}
                        className="py-1.5 text-sm"
                        disabled={updateTask.isPending}
                      >
                        <option value="">Unassigned</option>
                        {members?.map((m) => (
                          <option key={m.user_id} value={m.user_id}>{m.name}</option>
                        ))}
                      </Select>
                    ) : (
                      <p className="text-sm text-ink">{task.assignee_name || 'Unassigned'}</p>
                    )}
                  </div>

                  <div>
                    <p className="mb-1 flex items-center gap-1 text-xs text-muted">
                      <Calendar className="h-3 w-3" /> Due date
                    </p>
                    <p className="text-sm text-ink">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-muted">
                  {task.estimated_hours && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {task.estimated_hours}h estimated
                    </span>
                  )}
                  <span>Created by {task.created_by_name || 'Unknown'}</span>
                  <span>{new Date(task.created_at).toLocaleDateString()}</span>
                </div>

                <div className="mt-5">
                  <p className="mb-2 font-mono text-xs uppercase tracking-wider text-muted">Labels</p>
                  <LabelSelector
                    taskId={taskId}
                    workspaceId={workspaceId}
                    taskLabels={task.labels || []}
                    canManage={canManageLabels}
                    canCreate={isManager}
                  />
                </div>

                <div className="mt-6 border-t border-line pt-5">
                  <p className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">
                    Attachments ({data.attachments?.length || 0})
                  </p>
                  <AttachmentPanel
                    taskId={taskId}
                    attachments={data.attachments || []}
                    canUpload={canUpload}
                    canModerate={isManager}
                  />
                </div>

                <div className="mt-6 border-t border-line pt-5">
                  <p className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">
                    Comments ({data.comments?.length || 0})
                  </p>
                  <CommentPanel
                    taskId={taskId}
                    comments={data.comments || []}
                    canComment={canComment}
                    canModerate={isManager}
                    mentionCandidates={(members || []).map((m) => ({ id: m.user_id, name: m.name, avatarUrl: m.avatar_url }))}
                  />
                </div>

                <div className="mt-6 border-t border-line pt-5">
                  <p className="mb-3 flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted">
                    <Bug className="h-3 w-3" /> Related issues ({data.relatedIssues?.length || 0})
                  </p>
                  {!data.relatedIssues || data.relatedIssues.length === 0 ? (
                    <p className="text-sm text-muted">No issues reference this task.</p>
                  ) : (
                    <ul className="space-y-2">
                      {data.relatedIssues.map((issue) => (
                        <li key={issue.id}>
                          <Link
                            href={`/issues?open=${issue.id}`}
                            className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm hover:bg-ink/[0.02]"
                          >
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted">#{issue.issue_number}</span>
                              <span className="text-ink">{issue.title}</span>
                            </span>
                            <IssueStatusBadge status={issue.status} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-6 border-t border-line pt-5">
                  <p className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">Activity</p>
                  <ActivityTimeline activity={data.activity} />
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {task && <EditTaskModal open={editOpen} onClose={() => setEditOpen(false)} task={task} />}
      {task && (
        <ConfirmDialog
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          title="Delete this task?"
          description={`This permanently deletes "${task.title}" and its comments/attachments. This can't be undone.`}
          confirmLabel="Delete task"
          loading={deleteTask.isPending}
          onConfirm={() =>
            deleteTask.mutate(taskId, {
              onSuccess: () => {
                setDeleteOpen(false);
                onClose();
                onDeleted?.();
              },
            })
          }
        />
      )}
    </AnimatePresence>,
    document.body
  );
}
