'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bug, Plus } from 'lucide-react';
import AppShell from '@/components/AppShell';
import Button from '@/components/ui/Button';
import IssueTable from '@/components/issues/IssueTable';
import IssueDetailsDrawer from '@/components/issues/IssueDetailsDrawer';
import CreateIssueModal from '@/components/issues/CreateIssueModal';
import { useIssue } from '@/hooks/useIssues';

function DeepLinkedIssue({ issueId, onResolved }) {
  const { data } = useIssue(issueId);
  useEffect(() => {
    if (data?.issue) onResolved(data.issue);
  }, [data, onResolved]);
  return null;
}

function IssuesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get('open');
  const [activeIssue, setActiveIssue] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const closeIssue = () => {
    setActiveIssue(null);
    // Same root cause and fix as tasks/page.js's closeTask.
    if (openId) router.replace('/issues', { scroll: false });
  };

  return (
    <AppShell
      title="Issues"
      actions={
        <Button onClick={() => setCreateOpen(true)} className="hidden sm:inline-flex">
          <Plus className="h-4 w-4" />
          Raise Issue
        </Button>
      }
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-brand">
            <Bug className="h-3.5 w-3.5" />
            Every issue across your workspaces
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">Issues</h2>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="sm:hidden">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-6">
        <IssueTable onIssueClick={setActiveIssue} showProjectColumn onCreateClick={() => setCreateOpen(true)} />
      </div>

      {openId && !activeIssue && (
        <DeepLinkedIssue issueId={openId} onResolved={setActiveIssue} />
      )}

      {activeIssue && (
        <IssueDetailsDrawer
          issueId={activeIssue.id}
          workspaceId={activeIssue.workspace_id}
          onClose={closeIssue}
        />
      )}

      <CreateIssueModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppShell>
  );
}

export default function IssuesPage() {
  return (
    <Suspense fallback={null}>
      <IssuesPageContent />
    </Suspense>
  );
}
