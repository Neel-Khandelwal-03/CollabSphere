'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  return children;
}
