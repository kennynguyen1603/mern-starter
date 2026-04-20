import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/schemas/auth.schema';
import { useForgotPassword } from '@/hooks/useAuthQueries';

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const forgotPassword = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    await forgotPassword.mutateAsync(data.email);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div>
        <h1>Kiểm tra email của bạn</h1>
        <p>Chúng tôi đã gửi mã OTP đặt lại mật khẩu đến email của bạn.</p>
        <Link to="/reset-password">Nhập mã OTP</Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Quên mật khẩu</h1>

      {forgotPassword.isError && (
        <p style={{ color: 'red' }}>Có lỗi xảy ra. Vui lòng thử lại.</p>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label>Email</label>
          <input type="email" {...register('email')} />
          {errors.email && <p style={{ color: 'red' }}>{errors.email.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting || forgotPassword.isPending}>
          Gửi mã OTP
        </button>
      </form>

      <p>
        <Link to="/login">Quay lại đăng nhập</Link>
      </p>
    </div>
  );
}
