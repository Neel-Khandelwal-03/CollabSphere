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
import { useRegister } from '@/hooks/useAuth';

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().trim().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/\d/, 'Password must contain at least one number'),
});

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const registerMutation = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = (values) => {
    registerMutation.mutate(values, {
      onSuccess: () => router.push(next || '/dashboard'),
    });
  };

  return (
    <AuthSplitLayout
      eyebrow="Get started"
      title="Create your account"
      subtitle="Set up your workspace in under a minute."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {registerMutation.isError && (
          <Alert variant="danger">{registerMutation.error.message}</Alert>
        )}

        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" type="text" placeholder="Ada Lovelace" error={!!errors.name} {...register('name')} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" placeholder="ada@team.dev" error={!!errors.email} {...register('email')} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            error={!!errors.password}
            {...register('password')}
          />
          <FieldError>{errors.password?.message}</FieldError>
        </div>

        <Button type="submit" className="w-full" loading={registerMutation.isPending}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Already have an account?{' '}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
          className="font-medium text-brand hover:text-brand-strong"
        >
          Sign in
        </Link>
      </p>
    </AuthSplitLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
