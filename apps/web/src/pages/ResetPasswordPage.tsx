import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/schemas/auth.schema';
import { useResetPassword } from '@/hooks/useAuthQueries';

export default function ResetPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const resetPassword = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    await resetPassword.mutateAsync(data);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div>
        <h1>Đặt lại mật khẩu thành công</h1>
        <p>Mật khẩu của bạn đã được cập nhật.</p>
        <Link to="/login">Đăng nhập</Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Đặt lại mật khẩu</h1>

      {resetPassword.isError && (
        <p style={{ color: 'red' }}>Mã OTP không hợp lệ hoặc đã hết hạn.</p>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label>Email</label>
          <input type="email" {...register('email')} />
          {errors.email && <p style={{ color: 'red' }}>{errors.email.message}</p>}
        </div>

        <div>
          <label>Mã OTP</label>
          <input type="text" {...register('otp')} />
          {errors.otp && <p style={{ color: 'red' }}>{errors.otp.message}</p>}
        </div>

        <div>
          <label>Mật khẩu mới</label>
          <input type="password" {...register('newPassword')} />
          {errors.newPassword && <p style={{ color: 'red' }}>{errors.newPassword.message}</p>}
        </div>

        <div>
          <label>Xác nhận mật khẩu mới</label>
          <input type="password" {...register('confirmNewPassword')} />
          {errors.confirmNewPassword && <p style={{ color: 'red' }}>{errors.confirmNewPassword.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting || resetPassword.isPending}>
          Đặt lại mật khẩu
        </button>
      </form>
    </div>
  );
}
