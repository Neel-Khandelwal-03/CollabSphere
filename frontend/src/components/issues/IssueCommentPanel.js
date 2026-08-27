'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import MentionTextarea from '@/components/mentions/MentionTextarea';
import MentionText from '@/components/mentions/MentionText';
import { useAuthStore } from '@/store/authStore';
import { useCreateIssueComment, useUpdateIssueComment, useDeleteIssueComment } from '@/hooks/useIssues';

export default function IssueCommentPanel({ issueId, comments, canComment, canModerate, mentionCandidates = [] }) {
  const currentUser = useAuthStore((s) => s.user);
  const createComment = useCreateIssueComment(issueId);
  const updateComment = useUpdateIssueComment(issueId);
  const deleteComment = useDeleteIssueComment(issueId);

  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');

  const submit = () => {
    if (!draft.trim()) return;
    createComment.mutate(draft.trim(), { onSuccess: () => setDraft('') });
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditDraft(c.comment);
  };

  const saveEdit = (commentId) => {
    updateComment.mutate({ commentId, comment: editDraft.trim() }, { onSuccess: () => setEditingId(null) });
  };

  return (
    <div>
      <div className="space-y-4">
        {comments.length === 0 && <p className="text-sm text-muted">No comments yet.</p>}
        {comments.map((c) => {
          const isAuthor = c.user_id === currentUser?.id;
          const canDelete = isAuthor || canModerate;
          return (
            <div key={c.id} className="flex gap-2.5">
              <Avatar name={c.author_name} src={c.author_avatar} size={30} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-ink">{c.author_name}</p>
                  <p className="text-xs text-muted">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    {c.edited_at && ' · edited'}
                  </p>
                </div>

                {editingId === c.id ? (
                  <div className="mt-1.5 space-y-2">
                    <MentionTextarea rows={2} value={editDraft} onChange={(e) => setEditDraft(e.target.value)} candidates={mentionCandidates} />
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setEditingId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      <Button onClick={() => saveEdit(c.id)} loading={updateComment.isPending}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <MentionText text={c.comment} className="mt-0.5 block whitespace-pre-wrap text-sm text-ink" />
                )}

                {editingId !== c.id && (isAuthor || canDelete) && (
                  <div className="mt-1 flex gap-3">
                    {isAuthor && (
                      <button onClick={() => startEdit(c)} className="flex items-center gap-1 text-xs text-muted hover:text-ink">
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => deleteComment.mutate(c.id)}
                        className="flex items-center gap-1 text-xs text-muted hover:text-danger"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {canComment && (
        <div className="mt-4 flex gap-2.5">
          <Avatar name={currentUser?.name} size={30} />
          <div className="flex-1 space-y-2">
            <MentionTextarea
              rows={2}
              placeholder="Write a comment..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              candidates={mentionCandidates}
            />
            <Button onClick={submit} loading={createComment.isPending} disabled={!draft.trim()}>
              Comment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
