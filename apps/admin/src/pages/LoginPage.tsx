import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Card,
  Field,
  Heading,
  Input,
  Text,
  headingVariants,
} from '@mern/ui';
import { loginSchema, type LoginFormValues } from '@/schemas/auth.schema';
import { useLogin } from '@/hooks/useAuthQueries';
import { useAuthStore } from '@/store/auth.store';

export default function LoginPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  if (user) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (data: LoginFormValues) => {
    await login.mutateAsync(data);
    navigate('/');
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted px-4 py-12">
      <span className={headingVariants({ variant: 'brand' })}>MERN Admin</span>
      <Card className="grid w-full max-w-sm gap-4 p-8">
        <div className="space-y-1.5">
          <Heading as="h1" variant="subtitle">
            Đăng nhập
          </Heading>
          <Text variant="description">Chỉ dành cho tài khoản quản trị.</Text>
        </div>

        {login.isError && (
          <Alert variant="danger">
            Đăng nhập thất bại. Vui lòng kiểm tra lại.
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

          <Button type="submit" disabled={isSubmitting || login.isPending}>
            Đăng nhập
          </Button>
        </form>
      </Card>
    </div>
  );
}
