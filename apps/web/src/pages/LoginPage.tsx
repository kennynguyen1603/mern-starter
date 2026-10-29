import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { isAxiosError } from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Field, Input, Text, buttonVariants } from '@mern/ui';
import { loginSchema, type LoginFormValues } from '@/schemas/auth.schema';
import { useLogin, useResendVerification } from '@/hooks/useAuthQueries';
import AuthHeading from '@/components/AuthHeading';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verified = searchParams.get('verified') === 'true';
  const authSuccess = searchParams.get('auth') === 'success';

  const login = useLogin();
  const unverified =
    isAxiosError(login.error) && login.error.response?.status === 403;
  const resend = useResendVerification();
  const resendLimited =
    isAxiosError(resend.error) && resend.error.response?.status === 429;

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
    resend.reset();
    await login.mutateAsync(data);
    navigate('/');
  };

  return (
    <div className="grid gap-4">
      <AuthHeading title="Đăng nhập" />

      {verified && (
        <Alert variant="success">
          Email đã được xác minh. Bạn có thể đăng nhập.
        </Alert>
      )}
      {login.isError && (
        <Alert variant="danger">
          {unverified
            ? 'Email chưa được xác minh. Vui lòng kiểm tra hộp thư để xác minh trước khi đăng nhập.'
            : 'Đăng nhập thất bại. Vui lòng kiểm tra lại.'}
        </Alert>
      )}
      {unverified && (
        <Button
          type="button"
          variant="secondary"
          disabled={resend.isPending}
          // Resend to the address that was refused, not whatever is typed now.
          onClick={() => resend.mutate(login.variables!.email)}
        >
          {resend.isPending ? 'Đang gửi...' : 'Gửi lại email xác minh'}
        </Button>
      )}
      {resend.isSuccess && (
        <Alert variant="success">
          Đã gửi lại email xác minh. Vui lòng kiểm tra hộp thư.
        </Alert>
      )}
      {resend.isError && (
        <Alert variant="danger">
          {resendLimited
            ? 'Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau.'
            : 'Không thể gửi lại email xác minh. Vui lòng thử lại.'}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <Field label="Email" error={errors.email?.message}>
          <Input
            type="email"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
        </Field>

        <Field label="Mật khẩu" error={errors.password?.message}>
          <Input
            type="password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
        </Field>

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Quên mật khẩu?
          </Link>
        </div>

        <Button type="submit" disabled={isSubmitting || login.isPending}>
          Đăng nhập
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase">
        <span className="h-px flex-1 bg-border" />
        hoặc
        <span className="h-px flex-1 bg-border" />
      </div>

      <a
        href="/api/v1/auth/google"
        className={buttonVariants({ variant: 'secondary' })}
      >
        Đăng nhập với Google
      </a>

      <Text variant="description" className="text-center">
        Chưa có tài khoản?{' '}
        <Link
          to="/register"
          className="font-medium text-accent hover:underline"
        >
          Đăng ký
        </Link>
      </Text>
    </div>
  );
}
