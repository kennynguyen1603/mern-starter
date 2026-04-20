import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useCurrentUser } from '@/hooks/useAuthQueries';

export default function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  const { isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        Đang tải...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
