import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProfileSchema, type UpdateProfileFormValues } from '@/schemas/user.schema';
import { changePasswordSchema, type ChangePasswordFormValues } from '@/schemas/auth.schema';
import { useProfile, useUpdateProfile } from '@/hooks/useUserQueries';
import { useChangePassword } from '@/hooks/useAuthQueries';
import { useAuthStore } from '@/store/auth.store';

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const isOwnProfile = currentUser?._id === id;

  const { data: profile, isLoading } = useProfile(id!);
  const updateProfile = useUpdateProfile(id!);
  const changePassword = useChangePassword();

  const profileForm = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    values: { name: profile?.name, avatar: profile?.avatar ?? '' },
  });

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onUpdateProfile = async (data: UpdateProfileFormValues) => {
    await updateProfile.mutateAsync(data);
  };

  const onChangePassword = async (data: ChangePasswordFormValues) => {
    await changePassword.mutateAsync(data);
    passwordForm.reset();
  };

  if (isLoading) return <p>Đang tải...</p>;
  if (!profile) return <p>Không tìm thấy người dùng.</p>;

  return (
    <div>
      <h1>Profile</h1>

      <section>
        <h2>Thông tin cá nhân</h2>
        <p>Email: {profile.email}</p>

        {isOwnProfile && (
          <form onSubmit={profileForm.handleSubmit(onUpdateProfile)}>
            <div>
              <label>Tên</label>
              <input type="text" {...profileForm.register('name')} />
              {profileForm.formState.errors.name && (
                <p style={{ color: 'red' }}>{profileForm.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label>Avatar URL</label>
              <input type="text" {...profileForm.register('avatar')} />
              {profileForm.formState.errors.avatar && (
                <p style={{ color: 'red' }}>{profileForm.formState.errors.avatar.message}</p>
              )}
            </div>

            {updateProfile.isSuccess && <p style={{ color: 'green' }}>Đã cập nhật.</p>}
            {updateProfile.isError && <p style={{ color: 'red' }}>Cập nhật thất bại.</p>}

            <button type="submit" disabled={updateProfile.isPending}>
              Lưu thay đổi
            </button>
          </form>
        )}
      </section>

      {isOwnProfile && profile.authProvider === 'local' && (
        <section style={{ marginTop: '2rem' }}>
          <h2>Đổi mật khẩu</h2>

          <form onSubmit={passwordForm.handleSubmit(onChangePassword)}>
            <div>
              <label>Mật khẩu hiện tại</label>
              <input type="password" {...passwordForm.register('currentPassword')} />
              {passwordForm.formState.errors.currentPassword && (
                <p style={{ color: 'red' }}>{passwordForm.formState.errors.currentPassword.message}</p>
              )}
            </div>

            <div>
              <label>Mật khẩu mới</label>
              <input type="password" {...passwordForm.register('newPassword')} />
              {passwordForm.formState.errors.newPassword && (
                <p style={{ color: 'red' }}>{passwordForm.formState.errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label>Xác nhận mật khẩu mới</label>
              <input type="password" {...passwordForm.register('confirmNewPassword')} />
              {passwordForm.formState.errors.confirmNewPassword && (
                <p style={{ color: 'red' }}>{passwordForm.formState.errors.confirmNewPassword.message}</p>
              )}
            </div>

            {changePassword.isSuccess && <p style={{ color: 'green' }}>Đã đổi mật khẩu.</p>}
            {changePassword.isError && <p style={{ color: 'red' }}>Đổi mật khẩu thất bại.</p>}

            <button type="submit" disabled={changePassword.isPending}>
              Đổi mật khẩu
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
