import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, Heading, Text, buttonVariants } from '@mern/ui';
import type { UserStatus } from '@mern/shared';
import { useAuthStore } from '@/store/auth.store';

const statusVariant = {
  active: 'success',
  inactive: 'neutral',
  banned: 'danger',
} as const satisfies Record<UserStatus, string>;

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="grid gap-8">
      <div className="space-y-1">
        <Heading as="h1" variant="title">
          Dashboard
        </Heading>
        <Text>
          Xin chào, <strong className="text-foreground">{user?.name}</strong>!
        </Text>
      </div>

      <Card className="p-0">
        <Heading className="border-b border-border px-6 py-4 text-sm">
          Thông tin tài khoản
        </Heading>
        <dl className="divide-y divide-border text-sm">
          <InfoRow label="Email">{user?.email}</InfoRow>
          <InfoRow label="Vai trò">
            <Badge variant={user?.role === 'admin' ? 'accent' : 'neutral'}>
              {user?.role}
            </Badge>
          </InfoRow>
          <InfoRow label="Trạng thái">
            <Badge variant={user ? statusVariant[user.status] : 'neutral'}>
              {user?.status}
            </Badge>
          </InfoRow>
          <InfoRow label="Email đã xác minh">
            {user?.isEmailVerified ? 'Có' : 'Chưa'}
          </InfoRow>
        </dl>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link to={`/profile/${user?._id}`} className={buttonVariants()}>
          Chỉnh sửa profile
        </Link>
        {!user?.providers?.includes('local' as never) && (
          <Link
            to="/profile/me/set-password"
            className={buttonVariants({ variant: 'secondary' })}
          >
            Đặt mật khẩu
          </Link>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 px-6 py-3 sm:grid-cols-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="sm:col-span-2">{children}</dd>
    </div>
  );
}
