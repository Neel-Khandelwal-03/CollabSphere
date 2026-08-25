import Link from 'next/link';
import { ListChecks, MessageSquare, FolderOpen, Bug } from 'lucide-react';
import MergeGraph from '@/components/MergeGraph';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const BRANCHES = [
  {
    icon: ListChecks,
    label: 'tasks',
    title: 'Kanban that tracks reality',
    body: 'Backlog through done, with priority and story points attached to every card.',
  },
  {
    icon: MessageSquare,
    label: 'chat',
    title: 'Conversation stays with the work',
    body: 'Workspace, project, and direct threads — no separate app to context-switch into.',
  },
  {
    icon: FolderOpen,
    label: 'files',
    title: 'Assets live next to the task',
    body: 'Drop a spec or a screenshot on the card it belongs to. It stays findable.',
  },
  {
    icon: Bug,
    label: 'issues',
    title: 'Bugs tracked to resolution',
    body: 'Severity, assignee, and status in one record — reported once, closed once.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-lg font-semibold tracking-tight text-ink">
          CollabSphere
        </span>
        <nav className="flex items-center gap-3">
          <Button as={Link} href="/login" variant="ghost">
            Sign in
          </Button>
          <Button as={Link} href="/register" variant="primary">
            Get started
          </Button>
        </nav>
      </header>

      <section className="grid-texture relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-brand">
                for developer teams
              </p>
              <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl">
                Every branch of your workflow, merged into one.
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
                CollabSphere replaces the four tabs you keep open all day —
                tasks, chat, files, issues — with one workspace your whole
                team actually checks.
              </p>
              <div className="mt-8 flex items-center gap-3">
                <Button as={Link} href="/register" variant="primary" className="px-6 py-3">
                  Create your workspace
                </Button>
                <Button as={Link} href="/login" variant="outline" className="px-6 py-3">
                  Sign in
                </Button>
              </div>
            </div>
            <MergeGraph className="w-full" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="font-mono text-xs uppercase tracking-wider text-muted">
          what merges in
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BRANCHES.map(({ icon: Icon, label, title, body }) => (
            <Card key={label} className="p-6">
              <Icon className="h-5 w-5 text-brand" />
              <p className="mt-4 font-mono text-xs text-muted">{label}</p>
              <h3 className="mt-1 font-display text-base font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-xs text-muted">
          <span>CollabSphere</span>
          <span className="font-mono">built for teams who ship together</span>
        </div>
      </footer>
    </div>
  );
}
