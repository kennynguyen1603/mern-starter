import { UserRole } from '@mern/shared';
import { userService } from '@/services/user.service.js';
import { userRepository } from '@/repositories/user.repository.js';

export const DEFAULT_PASSWORD = 'Password123';

let counter = 0;

export interface TestUser {
  id: string;
  name: string;
  email: string;
  password: string;
}

export const createUser = async (
  overrides: Partial<Omit<TestUser, 'id'>> = {},
): Promise<TestUser> => {
  counter += 1;
  const data = {
    name: overrides.name ?? `Test User ${counter}`,
    email: overrides.email ?? `user${counter}@example.com`,
    password: overrides.password ?? DEFAULT_PASSWORD,
  };
  const created = await userService.createLocalUser(data);
  return { ...data, email: created.email, id: created._id.toString() };
};

export const createAdmin = async (
  overrides: Partial<Omit<TestUser, 'id'>> = {},
): Promise<TestUser> => {
  const user = await createUser(overrides);
  await userRepository.updateById(user.id, { role: UserRole.ADMIN });
  return user;
};
