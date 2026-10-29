import { NavLink, Outlet } from 'react-router-dom';
import { Button, cn, headingVariants } from '@mern/ui';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/useAuthQueries';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'border-l-2 px-4 py-2 text-sm transition-colors',
    isActive
      ? 'border-accent bg-muted text-foreground'
      : 'border-transparent text-muted-foreground hover:text-foreground',
  );

export default function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  return (
    <div className="min-h-svh md:grid md:grid-cols-[14rem_1fr]">
      <aside className="flex flex-col border-b border-border md:border-r md:border-b-0">
        <div
          className={headingVariants({
            variant: 'brand',
            className: 'flex h-14 items-center border-b border-border px-4',
          })}
        >
          MERN Admin
        </div>
        <nav className="flex flex-col py-4">
          <NavLink to="/users" className={navLinkClass}>
            Người dùng
          </NavLink>
        </nav>
        <div className="mt-auto grid gap-3 border-t border-border p-4">
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium">{user?.name}</p>
            <p className="truncate text-muted-foreground">{user?.email}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            Đăng xuất
          </Button>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-10 md:px-10">
        <Outlet />
      </main>
    </div>
  );
}
