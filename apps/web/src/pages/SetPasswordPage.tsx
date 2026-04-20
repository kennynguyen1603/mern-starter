import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { setPasswordSchema, type SetPasswordFormValues } from '@/schemas/auth.schema';
import { useSetPassword } from '@/hooks/useAuthQueries';

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const setPassword = useSetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordFormValues>({ resolver: zodResolver(setPasswordSchema) });

  const onSubmit = async (data: SetPasswordFormValues) => {
    await setPassword.mutateAsync(data.newPassword);
    navigate('/');
  };

  return (
    <div>
      <h1>Đặt mật khẩu</h1>
      <p>Đặt mật khẩu để có thể đăng nhập bằng email.</p>

      {setPassword.isError && (
        <p style={{ color: 'red' }}>Đặt mật khẩu thất bại. Vui lòng thử lại.</p>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label>Mật khẩu mới</label>
          <input type="password" {...register('newPassword')} />
          {errors.newPassword && <p style={{ color: 'red' }}>{errors.newPassword.message}</p>}
        </div>

        <div>
          <label>Xác nhận mật khẩu</label>
          <input type="password" {...register('confirmNewPassword')} />
          {errors.confirmNewPassword && <p style={{ color: 'red' }}>{errors.confirmNewPassword.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting || setPassword.isPending}>
          Đặt mật khẩu
        </button>
      </form>
    </div>
  );
}
