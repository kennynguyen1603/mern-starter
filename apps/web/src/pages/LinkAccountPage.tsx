import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { linkAccountSchema, type LinkAccountFormValues } from '@/schemas/auth.schema';
import { useGoogleLink } from '@/hooks/useAuthQueries';

export default function LinkAccountPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pendingToken = searchParams.get('token') ?? '';

  const googleLink = useGoogleLink();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LinkAccountFormValues>({ resolver: zodResolver(linkAccountSchema) });

  const onSubmit = async (data: LinkAccountFormValues) => {
    await googleLink.mutateAsync({ pendingToken, password: data.password });
    navigate('/');
  };

  if (!pendingToken) {
    return (
      <div>
        <p style={{ color: 'red' }}>Token không hợp lệ.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Liên kết tài khoản Google</h1>
      <p>Email Google của bạn đã được đăng ký trước đó. Nhập mật khẩu để liên kết tài khoản.</p>

      {googleLink.isError && (
        <p style={{ color: 'red' }}>Mật khẩu không đúng hoặc token đã hết hạn.</p>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label>Mật khẩu hiện tại</label>
          <input type="password" {...register('password')} />
          {errors.password && <p style={{ color: 'red' }}>{errors.password.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting || googleLink.isPending}>
          Liên kết tài khoản
        </button>
      </form>
    </div>
  );
}
