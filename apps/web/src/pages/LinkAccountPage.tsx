import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Field, Input } from '@mern/ui';
import {
  linkAccountSchema,
  type LinkAccountFormValues,
} from '@/schemas/auth.schema';
import { useGoogleLink } from '@/hooks/useAuthQueries';
import AuthHeading from '@/components/AuthHeading';

export default function LinkAccountPage() {
  const navigate = useNavigate();
  // Token travels in the fragment so it never reaches server logs or Referer
  const { hash } = useLocation();
  const pendingToken = new URLSearchParams(hash.slice(1)).get('token') ?? '';

  const googleLink = useGoogleLink();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LinkAccountFormValues>({
    resolver: zodResolver(linkAccountSchema),
  });

  const onSubmit = async (data: LinkAccountFormValues) => {
    await googleLink.mutateAsync({ pendingToken, password: data.password });
    navigate('/');
  };

  if (!pendingToken) {
    return <Alert variant="danger">Token không hợp lệ.</Alert>;
  }

  return (
    <div className="grid gap-4">
      <AuthHeading
        title="Liên kết tài khoản Google"
        description="Email Google của bạn đã được đăng ký trước đó. Nhập mật khẩu để liên kết tài khoản."
      />

      {googleLink.isError && (
        <Alert variant="danger">
          Mật khẩu không đúng hoặc token đã hết hạn.
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <Field label="Mật khẩu hiện tại" error={errors.password?.message}>
          <Input
            type="password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
        </Field>

        <Button type="submit" disabled={isSubmitting || googleLink.isPending}>
          Liên kết tài khoản
        </Button>
      </form>
    </div>
  );
}
