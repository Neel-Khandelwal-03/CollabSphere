'use client';

import { useState } from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import AppShell from '@/components/AppShell';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import ChatPanel from '@/components/chat/ChatPanel';
import PresenceDot from '@/components/chat/PresenceDot';
import NewDirectMessageModal from '@/components/chat/NewDirectMessageModal';
import { useDirectConversations, useStartDirectConversation } from '@/hooks/useChat';
import { useWorkspaces } from '@/hooks/useWorkspaces';

export default function ChatPage() {
  const { data: conversations, isLoading } = useDirectConversations();
  const { data: workspaces } = useWorkspaces();
  const startDirect = useStartDirectConversation();

  // Holds the *full* get-or-create response (conversation + messages +
  // readStates), not just an id — reusing the same already-tested
  // endpoint for both "open an existing DM from the list" and "start a
  // brand new one" (getOrCreateDirectConversation is idempotent, so
  // re-calling it for an existing pair just returns that conversation
  // fresh) means ChatPanel always has real initial data to seed from,
  // rather than the list view's lightweight summary rows.
  const [activeThread, setActiveThread] = useState(null);
  const [newDmOpen, setNewDmOpen] = useState(false);

  const myRoleInActiveWorkspace = workspaces?.find((w) => w.id === activeThread?.conversation.workspace_id)?.my_role;

  const openConversation = (c) => {
    startDirect.mutate(
      { workspaceId: c.workspace_id, userId: c.other_user_id },
      { onSuccess: (res) => setActiveThread({ ...res.data, summary: c }) }
    );
  };

  return (
    <AppShell title="Chat">
      <div className="flex h-[calc(100vh-160px)] gap-4">
        <Card className="flex w-72 shrink-0 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-mono text-xs uppercase tracking-wider text-muted">Direct messages</p>
            <button
              onClick={() => setNewDmOpen(true)}
              className="rounded-md p-1 text-muted hover:bg-ink/5 hover:text-ink"
              aria-label="New message"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading && <p className="p-4 text-center text-sm text-muted">Loading...</p>}
            {!isLoading && conversations?.length === 0 && (
              <div className="p-4 text-center">
                <p className="text-sm text-muted">No conversations yet.</p>
                <Button onClick={() => setNewDmOpen(true)} className="mt-3">
                  <Plus className="h-4 w-4" /> New message
                </Button>
              </div>
            )}
            {conversations?.map((c) => (
              <button
                key={c.id}
                onClick={() => openConversation(c)}
                className={`flex w-full items-center gap-2.5 border-b border-line/60 px-4 py-3 text-left hover:bg-ink/[0.02] ${
                  activeThread?.conversation.id === c.id ? 'bg-brand-tint/40' : ''
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar name={c.other_user_name} src={c.other_user_avatar} size={34} />
                  <PresenceDot
                    workspaceId={c.workspace_id}
                    userId={c.other_user_id}
                    className="absolute -bottom-0.5 -right-0.5"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-ink">{c.other_user_name}</p>
                    {c.unread_count > 0 && (
                      <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-medium text-white">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted">{c.last_message || 'No messages yet'}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="flex flex-1 flex-col p-4">
          {activeThread ? (
            <>
              <div className="mb-3 flex items-center gap-2.5 border-b border-line pb-3">
                <Avatar name={activeThread.summary.other_user_name} src={activeThread.summary.other_user_avatar} size={30} />
                <div>
                  <p className="text-sm font-medium text-ink">{activeThread.summary.other_user_name}</p>
                  <p className="text-xs text-muted">{activeThread.conversation.workspace_name}</p>
                </div>
              </div>
              <ChatPanel
                conversationId={activeThread.conversation.id}
                conversationType="direct"
                initialMessages={activeThread.messages}
                initialReadStates={activeThread.readStates}
                myRole={myRoleInActiveWorkspace || 'member'}
                className="flex-1"
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <MessageSquare className="h-8 w-8 text-muted/50" />
              <p className="mt-2 text-sm text-muted">Select a conversation, or start a new one.</p>
            </div>
          )}
        </Card>
      </div>

      <NewDirectMessageModal
        open={newDmOpen}
        onClose={() => setNewDmOpen(false)}
        onStarted={(res) => setActiveThread(res)}
      />
    </AppShell>
  );
}
