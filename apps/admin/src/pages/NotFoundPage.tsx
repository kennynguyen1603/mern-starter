import { Link } from 'react-router-dom';
import { Heading, Text, buttonVariants } from '@mern/ui';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <Heading as="h1" variant="display">
        404
      </Heading>
      <Text>Trang không tồn tại.</Text>
      <Link to="/" className={buttonVariants({ variant: 'secondary' })}>
        Về trang chủ
      </Link>
    </div>
  );
}
