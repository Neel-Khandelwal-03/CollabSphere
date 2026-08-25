'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { restoreSession } from '@/hooks/useAuth';
import { SocketProvider } from '@/hooks/useSocket';

export default function Providers({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
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
