import { Link, Outlet } from 'react-router-dom';
import { Card, headingVariants } from '@mern/ui';

/** Centered card frame shared by all public auth screens. */
export default function AuthShell() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted px-4 py-12">
      <Link to="/" className={headingVariants({ variant: 'brand' })}>
        MERN Starter
      </Link>
      <Card className="w-full max-w-sm p-8">
        <Outlet />
      </Card>
    </div>
  );
}
