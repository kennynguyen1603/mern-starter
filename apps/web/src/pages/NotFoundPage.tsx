import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <h1>404</h1>
      <p>Trang không tồn tại.</p>
      <Link to="/">Về trang chủ</Link>
    </div>
  );
}
