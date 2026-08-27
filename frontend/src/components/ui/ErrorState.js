'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

/**
 * Shared across the main list pages, which previously had no error
 * handling at all - a failed fetch would fall through to the empty
 * state ("No workspaces yet") instead of telling the user the request
 * actually failed, exactly the silent-failure pattern the spec warns
 * against. Deliberately generic wording, never the raw error/database
 * message, per "do not expose internal database errors to users."
 */
export default function ErrorState({ message = 'Something went wrong loading this.', onRetry, className = '' }) {
  return (
    <Card className={`flex flex-col items-center gap-3 p-10 text-center ${className}`}>
      <AlertTriangle className="h-6 w-6 text-danger" />
      <div>
        <p className="text-sm font-medium text-ink">{message}</p>
        <p className="mt-0.5 text-sm text-muted">Try again, or check your connection.</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RotateCcw className="h-3.5 w-3.5" /> Try again
        </Button>
      )}
    </Card>
  );
}
