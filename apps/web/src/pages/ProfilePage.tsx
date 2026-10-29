import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Card, Field, Heading, Input, Text } from '@mern/ui';
import {
  updateProfileSchema,
  type UpdateProfileFormValues,
} from '@/schemas/user.schema';
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '@/schemas/auth.schema';
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
    await updateProfile.mutateAsync({
      ...data,
      avatar: data.avatar || undefined,
    });
  };

  const onChangePassword = async (data: ChangePasswordFormValues) => {
    await changePassword.mutateAsync(data);
    passwordForm.reset();
  };

  if (isLoading) return <Text variant="description">Đang tải...</Text>;
  if (!profile)
    return <Text variant="description">Không tìm thấy người dùng.</Text>;

  const profileErrors = profileForm.formState.errors;
  const passwordErrors = passwordForm.formState.errors;

  return (
    <div className="grid max-w-2xl gap-8">
      <Heading as="h1" variant="title">
        Profile
      </Heading>

      <Card className="grid gap-6">
        <div className="space-y-1">
          <Heading>Thông tin cá nhân</Heading>
          <Text variant="description">Email: {profile.email}</Text>
        </div>

        {isOwnProfile && (
          <form
            onSubmit={profileForm.handleSubmit(onUpdateProfile)}
            className="grid gap-4"
          >
            <Field label="Tên" error={profileErrors.name?.message}>
              <Input
                type="text"
                aria-invalid={!!profileErrors.name}
                {...profileForm.register('name')}
              />
            </Field>

            <Field label="Avatar URL" error={profileErrors.avatar?.message}>
              <Input
                type="text"
                aria-invalid={!!profileErrors.avatar}
                {...profileForm.register('avatar')}
              />
            </Field>

            {updateProfile.isSuccess && (
              <Alert variant="success">Đã cập nhật.</Alert>
            )}
            {updateProfile.isError && (
              <Alert variant="danger">Cập nhật thất bại.</Alert>
            )}

            <Button
              type="submit"
              disabled={updateProfile.isPending}
              className="justify-self-start"
            >
              Lưu thay đổi
            </Button>
          </form>
        )}
      </Card>

      {isOwnProfile && profile.authProvider === 'local' && (
        <Card className="grid gap-6">
          <Heading>Đổi mật khẩu</Heading>

          <form
            onSubmit={passwordForm.handleSubmit(onChangePassword)}
            className="grid gap-4"
          >
            <Field
              label="Mật khẩu hiện tại"
              error={passwordErrors.currentPassword?.message}
            >
              <Input
                type="password"
                aria-invalid={!!passwordErrors.currentPassword}
                {...passwordForm.register('currentPassword')}
              />
            </Field>

            <Field
              label="Mật khẩu mới"
              error={passwordErrors.newPassword?.message}
            >
              <Input
                type="password"
                aria-invalid={!!passwordErrors.newPassword}
                {...passwordForm.register('newPassword')}
              />
            </Field>

            <Field
              label="Xác nhận mật khẩu mới"
              error={passwordErrors.confirmNewPassword?.message}
            >
              <Input
                type="password"
                aria-invalid={!!passwordErrors.confirmNewPassword}
                {...passwordForm.register('confirmNewPassword')}
              />
            </Field>

            {changePassword.isSuccess && (
              <Alert variant="success">Đã đổi mật khẩu.</Alert>
            )}
            {changePassword.isError && (
              <Alert variant="danger">Đổi mật khẩu thất bại.</Alert>
            )}

            <Button
              type="submit"
              disabled={changePassword.isPending}
              className="justify-self-start"
            >
              Đổi mật khẩu
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
