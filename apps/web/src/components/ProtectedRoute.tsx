import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useCurrentUser } from '@/hooks/useAuthQueries';

export default function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  const { isLoading } = useCurrentUser();

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

  return <Outlet />;
}
