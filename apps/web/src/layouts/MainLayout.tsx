import { Link, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/useAuthQueries';

export default function MainLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  return (
    <div>
      <header style={{ padding: '1rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/">Dashboard</Link>
          {user && <Link to={`/profile/${user._id}`}>Profile</Link>}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>{user?.name}</span>
          <button
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            Đăng xuất
          </button>
        </div>
      </header>
      <main style={{ padding: '2rem' }}>
        <Outlet />
      </main>
    </div>
  );
}
