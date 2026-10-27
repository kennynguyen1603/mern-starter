import type { Express } from 'express';
import request from 'supertest';

export const getCookies = (res: request.Response): string[] => {
  const header = res.headers['set-cookie'] as string | string[] | undefined;
  if (!header) return [];
  return Array.isArray(header) ? header : [header];
};

export const cookieValue = (
  cookies: string[],
  name: string,
): string | undefined => {
  const cookie = cookies.find((c) => c.startsWith(`${name}=`));
  return cookie?.split(';')[0].slice(name.length + 1);
};

export const loginAs = async (
  app: Express,
  email: string,
  password: string,
): Promise<string[]> => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);
  return getCookies(res);
};
