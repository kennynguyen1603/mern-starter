import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import AuthShell from '@/layouts/AuthShell';

export default function AuthLayout() {
  const user = useAuthStore((s) => s.user);

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <AuthShell />;
}
