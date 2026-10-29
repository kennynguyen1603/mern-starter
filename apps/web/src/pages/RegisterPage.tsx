import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Field, Input, Text, buttonVariants } from '@mern/ui';
import { registerSchema, type RegisterFormValues } from '@/schemas/auth.schema';
import { useRegister } from '@/hooks/useAuthQueries';
import AuthHeading from '@/components/AuthHeading';

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
      <div className="grid gap-4">
        <AuthHeading
          title="Kiểm tra email của bạn"
          description="Chúng tôi đã gửi email xác minh. Vui lòng kiểm tra hộp thư và nhấn vào liên kết để kích hoạt tài khoản."
        />
        <Link to="/login" className={buttonVariants({ variant: 'secondary' })}>
          Quay lại đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <AuthHeading title="Đăng ký" />

      {register_.isError && (
        <Alert variant="danger">Đăng ký thất bại. Vui lòng thử lại.</Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <Field label="Tên" error={errors.name?.message}>
          <Input
            type="text"
            aria-invalid={!!errors.name}
            {...register('name')}
          />
        </Field>

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

        <Field
          label="Xác nhận mật khẩu"
          error={errors.confirmPassword?.message}
        >
          <Input
            type="password"
            aria-invalid={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
        </Field>

        <Button type="submit" disabled={isSubmitting || register_.isPending}>
          Đăng ký
        </Button>
      </form>

      <Text variant="description" className="text-center">
        Đã có tài khoản?{' '}
        <Link to="/login" className="font-medium text-accent hover:underline">
          Đăng nhập
        </Link>
      </Text>
    </div>
  );
}
