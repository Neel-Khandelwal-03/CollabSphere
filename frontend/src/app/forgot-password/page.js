'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AuthSplitLayout from '@/components/AuthSplitLayout';
import Button from '@/components/ui/Button';
import { Input, Label, FieldError } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Card';
import { useForgotPassword } from '@/hooks/useAuth';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
});

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = (values) => forgotPassword.mutate(values);

  return (
    <AuthSplitLayout
      eyebrow="Account recovery"
      title="Reset your password"
      subtitle="We'll email you a link to choose a new one."
    >
      {forgotPassword.isSuccess ? (
        <Alert variant="success">
          If an account with that email exists, a reset link is on its way.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {forgotPassword.isError && (
            <Alert variant="danger">{forgotPassword.error.message}</Alert>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="ada@team.dev"
              error={!!errors.email}
              {...register('email')}
            />
            <FieldError>{errors.email?.message}</FieldError>
          </div>
          <Button type="submit" className="w-full" loading={forgotPassword.isPending}>
            Send reset link
          </Button>
        </form>
      )}

      <p className="mt-6 text-sm text-muted">
        Remembered it after all?{' '}
        <Link href="/login" className="font-medium text-brand hover:text-brand-strong">
          Back to sign in
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
