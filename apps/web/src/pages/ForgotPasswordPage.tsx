import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Field, Input, buttonVariants } from '@mern/ui';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from '@/schemas/auth.schema';
import { useForgotPassword } from '@/hooks/useAuthQueries';
import AuthHeading from '@/components/AuthHeading';

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const forgotPassword = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    await forgotPassword.mutateAsync(data.email);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="grid gap-4">
        <AuthHeading
          title="Kiểm tra email của bạn"
          description="Chúng tôi đã gửi mã OTP đặt lại mật khẩu đến email của bạn."
        />
        <Link to="/reset-password" className={buttonVariants()}>
          Nhập mã OTP
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <AuthHeading title="Quên mật khẩu" />

      {forgotPassword.isError && (
        <Alert variant="danger">Có lỗi xảy ra. Vui lòng thử lại.</Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <Field label="Email" error={errors.email?.message}>
          <Input
            type="email"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
        </Field>

        <Button
          type="submit"
          disabled={isSubmitting || forgotPassword.isPending}
        >
          Gửi mã OTP
        </Button>
      </form>

      <Link
        to="/login"
        className="text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Quay lại đăng nhập
      </Link>
    </div>
  );
}
