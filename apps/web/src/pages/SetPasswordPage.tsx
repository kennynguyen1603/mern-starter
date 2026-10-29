import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Card, Field, Input } from '@mern/ui';
import {
  setPasswordSchema,
  type SetPasswordFormValues,
} from '@/schemas/auth.schema';
import { useSetPassword } from '@/hooks/useAuthQueries';
import AuthHeading from '@/components/AuthHeading';

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const setPassword = useSetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordFormValues>({
    resolver: zodResolver(setPasswordSchema),
  });

  const onSubmit = async (data: SetPasswordFormValues) => {
    await setPassword.mutateAsync(data.newPassword);
    navigate('/');
  };

  return (
    <Card className="mx-auto grid max-w-sm gap-4 p-8">
      <AuthHeading
        title="Đặt mật khẩu"
        description="Đặt mật khẩu để có thể đăng nhập bằng email."
      />

      {setPassword.isError && (
        <Alert variant="danger">Đặt mật khẩu thất bại. Vui lòng thử lại.</Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <Field label="Mật khẩu mới" error={errors.newPassword?.message}>
          <Input
            type="password"
            aria-invalid={!!errors.newPassword}
            {...register('newPassword')}
          />
        </Field>

        <Field
          label="Xác nhận mật khẩu"
          error={errors.confirmNewPassword?.message}
        >
          <Input
            type="password"
            aria-invalid={!!errors.confirmNewPassword}
            {...register('confirmNewPassword')}
          />
        </Field>

        <Button type="submit" disabled={isSubmitting || setPassword.isPending}>
          Đặt mật khẩu
        </Button>
      </form>
    </Card>
  );
}
