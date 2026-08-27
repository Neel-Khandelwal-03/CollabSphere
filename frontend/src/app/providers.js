'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { restoreSession } from '@/hooks/useAuth';
import { SocketProvider } from '@/hooks/useSocket';

export default function Providers({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
            // Most queries in this app (workspace/project/task/issue
            // lists, members, etc.) had no staleTime at all, meaning
            // every remount — e.g. navigating away and back — refetched
            // unconditionally even when nothing had changed. A shared
            // default fixes the common case in one place rather than
            // annotating dozens of individual hooks; mutations already
            // call invalidateQueries explicitly, which forces a refetch
            // regardless of staleTime, so this doesn't mask real
            // updates from the current user's own actions. Queries with
            // their own real-time socket-driven cache (chat messages
            // use staleTime: Infinity) already override this.
            staleTime: 30 * 1000,
          },
        },
      })
  );

  useEffect(() => {
    restoreSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>{children}</SocketProvider>
    </QueryClientProvider>
  );
}
