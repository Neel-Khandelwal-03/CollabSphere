'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from './useSocket';
import { CHAT_KEYS } from './useChat';

const TYPING_TIMEOUT_MS = 4000;

/**
 * Joins the given conversation's Socket.IO room on mount, leaves on
 * unmount/conversation change, and keeps three things live for whatever
 * component renders the thread:
 *  - the message cache itself (new/edited/deleted messages spliced
 *    directly into the same React Query key useMessages reads)
 *  - who's currently typing (auto-expires an entry if 'typing:stop'
 *    never arrives — e.g. the other tab crashed mid-keystroke)
 *  - each participant's live read pointer (seeded by the initial
 *    readStates the parent already fetched, updated by 'read:update')
 */
export function useChatSocket(conversationId, initialReadStates = []) {
  const { socket, connected } = useSocket();
  const qc = useQueryClient();
  const [typingUsers, setTypingUsers] = useState({});
  const [readStates, setReadStates] = useState(() =>
    Object.fromEntries(initialReadStates.map((r) => [r.user_id, r]))
  );
  const typingTimers = useRef({});

  useEffect(() => {
    setReadStates(Object.fromEntries(initialReadStates.map((r) => [r.user_id, r])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (!socket || !connected || !conversationId) return undefined;

    socket.emit('join:conversation', conversationId, () => {});
    const timers = typingTimers.current;

    const onNew = ({ conversationId: cid, message }) => {
      if (cid !== conversationId) return;
      qc.setQueryData(CHAT_KEYS.messages(conversationId), (old = []) =>
        old.some((m) => m.id === message.id) ? old : [...old, message]
      );
    };
    const onUpdated = ({ conversationId: cid, message }) => {
      if (cid !== conversationId) return;
      qc.setQueryData(CHAT_KEYS.messages(conversationId), (old = []) =>
        old.map((m) => (m.id === message.id ? message : m))
      );
    };
    const onDeleted = ({ conversationId: cid, messageId }) => {
      if (cid !== conversationId) return;
      qc.setQueryData(CHAT_KEYS.messages(conversationId), (old = []) => old.filter((m) => m.id !== messageId));
    };
    const onTyping = ({ conversationId: cid, userId, userName, isTyping }) => {
      if (cid !== conversationId) return;
      clearTimeout(typingTimers.current[userId]);
      if (isTyping) {
        setTypingUsers((prev) => ({ ...prev, [userId]: userName }));
        typingTimers.current[userId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
        }, TYPING_TIMEOUT_MS);
      } else {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    };
    const onRead = ({ conversationId: cid, userId, messageId }) => {
      if (cid !== conversationId) return;
      setReadStates((prev) => ({ ...prev, [userId]: { user_id: userId, last_read_message_id: messageId } }));
    };

    socket.on('message:new', onNew);
    socket.on('message:updated', onUpdated);
    socket.on('message:deleted', onDeleted);
    socket.on('typing:update', onTyping);
    socket.on('read:update', onRead);

    return () => {
      socket.emit('leave:conversation', conversationId);
      socket.off('message:new', onNew);
      socket.off('message:updated', onUpdated);
      socket.off('message:deleted', onDeleted);
      socket.off('typing:update', onTyping);
      socket.off('read:update', onRead);
      Object.values(timers).forEach(clearTimeout);
    };
  }, [socket, connected, conversationId, qc]);

  const emitTyping = (isTyping) => {
    if (socket && connected) socket.emit(isTyping ? 'typing:start' : 'typing:stop', conversationId);
  };

  return { typingUsers: Object.values(typingUsers), readStates: Object.values(readStates), emitTyping };
}
