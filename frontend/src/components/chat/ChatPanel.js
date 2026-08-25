'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Paperclip } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Card';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import FilePreview from '@/components/files/FilePreview';
import { useMessages, useSendMessage, useSendFileMessage, useEditMessage, useDeleteMessage, useMarkRead, useOlderMessages } from '@/hooks/useChat';
import { useChatSocket } from '@/hooks/useChatSocket';
import { useAuthStore } from '@/store/authStore';

const MANAGER_ROLES = ['owner', 'admin'];

/**
 * Parameterized entirely by an already-resolved conversationId — the
 * caller (workspace tab, project tab, or the DM page) is responsible for
 * resolving *which* conversation via the appropriate get-or-create hook
 * and handing this component the result. Keeps this component agnostic
 * to the three different ways a conversation can come into existence.
 */
export default function ChatPanel({
  conversationId,
  conversationType,
  initialMessages,
  initialReadStates,
  myRole,
  className = '',
}) {
  const currentUser = useAuthStore((s) => s.user);
  const { data: messages } = useMessages(conversationId, initialMessages);
  const { typingUsers, readStates, emitTyping } = useChatSocket(conversationId, initialReadStates);

  const sendMessage = useSendMessage(conversationId);
  const sendFileMessage = useSendFileMessage(conversationId);
  const editMessage = useEditMessage(conversationId);
  const deleteMessage = useDeleteMessage(conversationId);
  const markRead = useMarkRead(conversationId);
  const olderMessages = useOlderMessages(conversationId);

  const [draft, setDraft] = useState('');
  const [fileError, setFileError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastMarkedRef = useRef(null);
  const fileInputRef = useRef(null);

  const canModerate = conversationType !== 'direct' && MANAGER_ROLES.includes(myRole);
  const canWrite = myRole && myRole !== 'viewer';

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages?.length]);

  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const latest = messages[messages.length - 1];
    if (latest.id === lastMarkedRef.current) return;
    lastMarkedRef.current = latest.id;
    markRead.mutate(latest.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const handleDraftChange = (e) => {
    setDraft(e.target.value);
    emitTyping(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitTyping(false), 2000);
  };

  const send = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    sendMessage.mutate(trimmed, { onSuccess: () => setDraft('') });
    emitTyping(false);
    clearTimeout(typingTimeoutRef.current);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const readersFor = (messageId) => {
    const idx = (messages || []).findIndex((m) => m.id === messageId);
    if (idx !== messages.length - 1) return [];
    return readStates.filter((r) => r.user_id !== currentUser?.id && r.last_read_message_id);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileError(null);
    setUploadProgress(0);
    sendFileMessage.mutate(
      { file, onProgress: setUploadProgress },
      {
        onSettled: () => setUploadProgress(null),
        onError: (err) => setFileError(err.message),
      }
    );
  };

  return (
    <div className={`flex h-full flex-col ${className}`}>
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-1 py-2">
        {messages && messages.length >= 50 && (
          <div className="flex justify-center pb-2">
            <Button
              variant="outline"
              onClick={() => olderMessages.mutate(messages[0].id)}
              loading={olderMessages.isPending}
            >
              Load older messages
            </Button>
          </div>
        )}

        {!messages || messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No messages yet. Say hello!</p>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isOwn={m.sender_id === currentUser?.id}
              canModerate={canModerate}
              onEdit={(id, content) => editMessage.mutate({ messageId: id, content })}
              onDelete={(id) => deleteMessage.mutate(id)}
              readers={readersFor(m.id)}
              onPreviewFile={setPreviewFile}
            />
          ))
        )}
      </div>

      <TypingIndicator names={typingUsers} />

      {fileError && <Alert variant="danger" className="mb-2">{fileError}</Alert>}
      {sendMessage.isError && (
        <Alert variant="danger" className="mb-2">{sendMessage.error.message || 'Message failed to send. Please try again.'}</Alert>
      )}
      {uploadProgress !== null && (
        <div className="mb-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {canWrite ? (
        <div className="flex items-end gap-2 border-t border-line pt-3">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadProgress !== null}
            className="rounded-lg p-2.5 text-muted hover:bg-ink/5 hover:text-ink disabled:opacity-50"
            aria-label="Attach a file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <Textarea
            rows={1}
            placeholder="Write a message..."
            value={draft}
            onChange={handleDraftChange}
            onKeyDown={handleKeyDown}
            className="max-h-32 resize-none"
          />
          <Button onClick={send} disabled={!draft.trim()} loading={sendMessage.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <p className="border-t border-line pt-3 text-center text-xs text-muted">
          You have read-only access to this conversation.
        </p>
      )}

      <FilePreview open={!!previewFile} onClose={() => setPreviewFile(null)} file={previewFile} />
    </div>
  );
}
