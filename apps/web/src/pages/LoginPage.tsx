import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '@/schemas/auth.schema';
import { useLogin } from '@/hooks/useAuthQueries';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verified = searchParams.get('verified') === 'true';
  const authSuccess = searchParams.get('auth') === 'success';

  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (authSuccess) {
      navigate('/', { replace: true });
    }
  }, [authSuccess, navigate]);

  const onSubmit = async (data: LoginFormValues) => {
    await login.mutateAsync(data);
    navigate('/');
  };

  return (
    <div>
      <h1>Đăng nhập</h1>

      {verified && (
        <p style={{ color: 'green' }}>Email đã được xác minh. Bạn có thể đăng nhập.</p>
      )}
      {login.isError && (
        <p style={{ color: 'red' }}>Đăng nhập thất bại. Vui lòng kiểm tra lại.</p>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
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

        <button type="submit" disabled={isSubmitting || login.isPending}>
          Đăng nhập
        </button>
      </form>

      <hr />

      <a href="/api/v1/auth/google">
        <button type="button">Đăng nhập với Google</button>
      </a>

      <p>
        Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
      </p>
      <p>
        <Link to="/forgot-password">Quên mật khẩu?</Link>
      </p>
    </div>
  );
}
