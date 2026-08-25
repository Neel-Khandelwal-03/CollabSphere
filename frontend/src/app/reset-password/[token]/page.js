'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AuthSplitLayout from '@/components/AuthSplitLayout';
import Button from '@/components/ui/Button';
import { Input, Label, FieldError } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Card';
import { useResetPassword } from '@/hooks/useAuth';

const schema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/\d/, 'Password must contain at least one number'),
});

export default function ResetPasswordPage() {
  const { token } = useParams();
  const router = useRouter();
  const resetPassword = useResetPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = (values) => {
    resetPassword.mutate(
      { token, password: values.password },
      { onSuccess: () => setTimeout(() => router.push('/login'), 1200) }
    );
  };

  return (
    <AuthSplitLayout
      eyebrow="Account recovery"
      title="Choose a new password"
      subtitle="Make it something you haven't used before."
    >
      {resetPassword.isSuccess ? (
        <Alert variant="success">Password updated. Redirecting you to sign in...</Alert>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {resetPassword.isError && (
            <Alert variant="danger">{resetPassword.error.message}</Alert>
          )}
          <div>
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              error={!!errors.password}
              {...register('password')}
            />
            <FieldError>{errors.password?.message}</FieldError>
          </div>
          <Button type="submit" className="w-full" loading={resetPassword.isPending}>
            Update password
          </Button>
        </form>
      )}

      <p className="mt-6 text-sm text-muted">
        <Link href="/login" className="font-medium text-brand hover:text-brand-strong">
          Back to sign in
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
