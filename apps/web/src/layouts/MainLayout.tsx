import { NavLink, Outlet } from 'react-router-dom';
import { Button, cn, headingVariants } from '@mern/ui';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/useAuthQueries';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'border-b-2 py-4 text-sm transition-colors',
    isActive
      ? 'border-accent text-foreground'
      : 'border-transparent text-muted-foreground hover:text-foreground',
  );

export default function MainLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  return (
    <div className="min-h-svh">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-8">
            <span className={headingVariants({ variant: 'brand' })}>
              MERN Starter
            </span>
            <nav className="flex gap-6">
              <NavLink to="/" end className={navLinkClass}>
                Dashboard
              </NavLink>
              {user && (
                <NavLink to={`/profile/${user._id}`} className={navLinkClass}>
                  Profile
                </NavLink>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user?.name}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              Đăng xuất
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">
        <Outlet />
      </main>
    </div>
  );
}
