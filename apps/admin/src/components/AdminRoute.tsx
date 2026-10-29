import { Navigate, Outlet } from 'react-router-dom';
import { UserRole } from '@mern/shared';
import { Button, Heading, Text } from '@mern/ui';
import { useAuthStore } from '@/store/auth.store';
import { useCurrentUser, useLogout } from '@/hooks/useAuthQueries';

export default function AdminRoute() {
  const user = useAuthStore((s) => s.user);
  const { isLoading } = useCurrentUser();
  const logout = useLogout();

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Đang tải...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== UserRole.ADMIN) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
        <Heading as="h1" variant="display">
          403
        </Heading>
        <Text>
          Tài khoản {user.email} không có quyền truy cập trang quản trị.
        </Text>
        <Button
          variant="secondary"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          Đăng xuất
        </Button>
      </div>
    );
  }

  return <Outlet />;
}
