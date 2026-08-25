'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import MergeGraph from '@/components/MergeGraph';
import { Card, Alert } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useAcceptInvitation, useRejectInvitation } from '@/hooks/useWorkspaces';

export default function InvitationPage() {
  const { token } = useParams();
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  const accept = useAcceptInvitation();
  const reject = useRejectInvitation();

  const redirectTarget = `/invitations/${token}`;

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <Card className="w-full max-w-md p-8 text-center">
        <MergeGraph compact className="mx-auto h-24 w-48" />
        <h1 className="mt-4 font-display text-xl font-semibold text-ink">Workspace invitation</h1>

        {status === 'unauthenticated' ? (
          <>
            <p className="mt-2 text-sm text-muted">
              Sign in or create an account with the email this invite was sent to, then come back
              to this link to respond.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <Button as={Link} href={`/login?next=${encodeURIComponent(redirectTarget)}`}>
                Sign in
              </Button>
              <Button
                as={Link}
                href={`/register?next=${encodeURIComponent(redirectTarget)}`}
                variant="outline"
              >
                Create an account
              </Button>
            </div>
          </>
        ) : accept.isSuccess ? (
          <>
            <Alert variant="success" className="mt-4 text-left">
              You&apos;ve joined <strong>{accept.data.data.workspace.name}</strong>.
            </Alert>
            <Button
              className="mt-5 w-full"
              onClick={() => router.push(`/workspaces/${accept.data.data.workspace.id}`)}
            >
              Go to workspace
            </Button>
          </>
        ) : reject.isSuccess ? (
          <>
            <Alert variant="brand" className="mt-4 text-left">
              Invitation declined.
            </Alert>
            <Button className="mt-5 w-full" onClick={() => router.push('/dashboard')}>
              Go to dashboard
            </Button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted">
              Signed in as <strong>{user?.email}</strong>. Accept to join, or decline if this
              wasn&apos;t meant for you.
            </p>

            {(accept.isError || reject.isError) && (
              <Alert variant="danger" className="mt-4 text-left">
                {(accept.error || reject.error).message}
              </Alert>
            )}

            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => reject.mutate(token)}
                loading={reject.isPending}
                disabled={accept.isPending}
              >
                Decline
              </Button>
              <Button
                className="flex-1"
                onClick={() => accept.mutate(token)}
                loading={accept.isPending}
                disabled={reject.isPending}
              >
                Accept
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
