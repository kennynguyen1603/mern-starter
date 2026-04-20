import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Xin chào, <strong>{user?.name}</strong>!</p>

      <section style={{ marginTop: '1rem' }}>
        <h2>Thông tin tài khoản</h2>
        <p>Email: {user?.email}</p>
        <p>Vai trò: {user?.role}</p>
        <p>Trạng thái: {user?.status}</p>
        <p>Email đã xác minh: {user?.isEmailVerified ? 'Có' : 'Chưa'}</p>
      </section>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
        <Link to={`/profile/${user?._id}`}>
          <button type="button">Chỉnh sửa profile</button>
        </Link>
        {!user?.providers?.includes('local' as never) && (
          <Link to="/profile/me/set-password">
            <button type="button">Đặt mật khẩu</button>
          </Link>
        )}
      </div>
    </div>
  );
}
