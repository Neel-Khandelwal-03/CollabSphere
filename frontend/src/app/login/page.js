'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AuthSplitLayout from '@/components/AuthSplitLayout';
import Button from '@/components/ui/Button';
import { Input, Label, FieldError } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Card';
import { useLogin } from '@/hooks/useAuth';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const loginMutation = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = (values) => {
    loginMutation.mutate(values, {
      onSuccess: () => router.push(next || '/dashboard'),
    });
  };

  return (
    <AuthSplitLayout
      eyebrow="Welcome back"
      title="Sign in to CollabSphere"
      subtitle="Pick up right where your team left off."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {loginMutation.isError && <Alert variant="danger">{loginMutation.error.message}</Alert>}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="ada@team.dev" error={!!errors.email} {...register('email')} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="mb-1.5 text-xs font-medium text-brand hover:text-brand-strong">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" placeholder="••••••••" error={!!errors.password} {...register('password')} />
          <FieldError>{errors.password?.message}</FieldError>
        </div>

        <Button type="submit" className="w-full" loading={loginMutation.isPending}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Don&apos;t have an account?{' '}
        <Link
          href={next ? `/register?next=${encodeURIComponent(next)}` : '/register'}
          className="font-medium text-brand hover:text-brand-strong"
        >
          Create one
        </Link>
      </p>
    </AuthSplitLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
