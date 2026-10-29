import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Field, Input, buttonVariants } from '@mern/ui';
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '@/schemas/auth.schema';
import { useResetPassword } from '@/hooks/useAuthQueries';
import AuthHeading from '@/components/AuthHeading';

export default function ResetPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const resetPassword = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    await resetPassword.mutateAsync(data);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="grid gap-4">
        <AuthHeading
          title="Đặt lại mật khẩu thành công"
          description="Mật khẩu của bạn đã được cập nhật."
        />
        <Link to="/login" className={buttonVariants()}>
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <AuthHeading title="Đặt lại mật khẩu" />

      {resetPassword.isError && (
        <Alert variant="danger">Mã OTP không hợp lệ hoặc đã hết hạn.</Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <Field label="Email" error={errors.email?.message}>
          <Input
            type="email"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
        </Field>

        <Field label="Mã OTP" error={errors.otp?.message}>
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="font-mono tracking-widest"
            aria-invalid={!!errors.otp}
            {...register('otp')}
          />
        </Field>

        <Field label="Mật khẩu mới" error={errors.newPassword?.message}>
          <Input
            type="password"
            aria-invalid={!!errors.newPassword}
            {...register('newPassword')}
          />
        </Field>

        <Field
          label="Xác nhận mật khẩu mới"
          error={errors.confirmNewPassword?.message}
        >
          <Input
            type="password"
            aria-invalid={!!errors.confirmNewPassword}
            {...register('confirmNewPassword')}
          />
        </Field>

        <Button
          type="submit"
          disabled={isSubmitting || resetPassword.isPending}
        >
          Đặt lại mật khẩu
        </Button>
      </form>
    </div>
  );
}
