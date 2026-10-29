import { useState, type FormEvent } from 'react';
import { UserRole, UserStatus, type IUserResponse } from '@mern/shared';
import { Alert, Badge, Button, Heading, Input, Text } from '@mern/ui';
import { useDeleteUser, useUsers } from '@/hooks/useUserQueries';
import { useAuthStore } from '@/store/auth.store';

const LIMIT = 10;

const statusVariant = {
  [UserStatus.ACTIVE]: 'success',
  [UserStatus.INACTIVE]: 'neutral',
  [UserStatus.BANNED]: 'danger',
} as const;

const dateFormat = new Intl.DateTimeFormat('vi-VN');

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Search runs on submit, not per keystroke — the list endpoint is rate limited.
  const { data, isLoading, isError, isFetching } = useUsers({
    page,
    limit: LIMIT,
    search: search || undefined,
  });
  const deleteUser = useDeleteUser();

  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = new FormData(e.currentTarget).get('search');
    setSearch(String(value ?? '').trim());
    setPage(1);
  };

  const onDelete = (user: IUserResponse) => {
    if (window.confirm(`Xóa người dùng ${user.email}?`)) {
      deleteUser.mutate(user._id!);
    }
  };

  const meta = data?.meta;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <Heading as="h1" variant="title">
            Người dùng
          </Heading>
          {meta && <Text variant="description">{meta.total} tài khoản</Text>}
        </div>
        <form onSubmit={onSearch} className="flex w-full gap-2 sm:w-auto">
          <Input
            name="search"
            placeholder="Tìm theo tên hoặc email"
            defaultValue={search}
            className="sm:w-64"
          />
          <Button type="submit" variant="secondary">
            Tìm
          </Button>
        </form>
      </div>

      {isError && (
        <Alert variant="danger">Không thể tải danh sách người dùng.</Alert>
      )}
      {deleteUser.isError && (
        <Alert variant="danger">Xóa người dùng thất bại.</Alert>
      )}

      <div className="overflow-x-auto border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Tên</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Vai trò</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3 font-medium">Đăng nhập qua</th>
              <th className="px-4 py-3 font-medium">Ngày tạo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Đang tải...
                </td>
              </tr>
            )}
            {data?.data.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Không có người dùng nào.
                </td>
              </tr>
            )}
            {data?.data.map((user) => (
              <tr key={user._id}>
                <td className="px-4 py-3 font-medium whitespace-nowrap">
                  {user.name}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {user.email}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      user.role === UserRole.ADMIN ? 'accent' : 'neutral'
                    }
                  >
                    {user.role}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant[user.status]}>
                    {user.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {user.providers.join(', ')}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {dateFormat.format(new Date(user.createdAt))}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDelete(user)}
                    disabled={
                      user._id === currentUser?._id || deleteUser.isPending
                    }
                  >
                    Xóa
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Trang {meta.page}/{meta.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={!meta.hasPreviousPage || isFetching}
            >
              Trước
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!meta.hasNextPage || isFetching}
            >
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
