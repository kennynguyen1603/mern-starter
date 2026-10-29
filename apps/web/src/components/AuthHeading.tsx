import type { ReactNode } from 'react';
import { Heading, Text } from '@mern/ui';

type AuthHeadingProps = {
  title: string;
  description?: ReactNode;
};

export default function AuthHeading({ title, description }: AuthHeadingProps) {
  return (
    <div className="mb-6 space-y-1.5">
      <Heading as="h1" variant="subtitle">
        {title}
      </Heading>
      {description && <Text variant="description">{description}</Text>}
    </div>
  );
}
