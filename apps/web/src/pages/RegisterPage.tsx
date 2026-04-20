import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormValues } from '@/schemas/auth.schema';
import { useRegister } from '@/hooks/useAuthQueries';

export default function RegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const register_ = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterFormValues) => {
    await register_.mutateAsync(data);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div>
        <h1>Kiểm tra email của bạn</h1>
        <p>Chúng tôi đã gửi email xác minh. Vui lòng kiểm tra hộp thư và nhấn vào liên kết để kích hoạt tài khoản.</p>
        <Link to="/login">Quay lại đăng nhập</Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Đăng ký</h1>

      {register_.isError && (
        <p style={{ color: 'red' }}>Đăng ký thất bại. Vui lòng thử lại.</p>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label>Tên</label>
          <input type="text" {...register('name')} />
          {errors.name && <p style={{ color: 'red' }}>{errors.name.message}</p>}
        </div>

        <div>
          <label>Email</label>
          <input type="email" {...register('email')} />
          {errors.email && <p style={{ color: 'red' }}>{errors.email.message}</p>}
        </div>

        <div>
          <label>Mật khẩu</label>
          <input type="password" {...register('password')} />
          {errors.password && <p style={{ color: 'red' }}>{errors.password.message}</p>}
        </div>

        <div>
          <label>Xác nhận mật khẩu</label>
          <input type="password" {...register('confirmPassword')} />
          {errors.confirmPassword && <p style={{ color: 'red' }}>{errors.confirmPassword.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting || register_.isPending}>
          Đăng ký
        </button>
      </form>

      <p>
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </div>
  );
}
