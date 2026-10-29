import type { APIRequestContext } from '@playwright/test';

/** Read a cookie value from an API context's jar (tests only — the browser never sees these). */
export async function cookieValue(ctx: APIRequestContext, name: string) {
  const { cookies } = await ctx.storageState();
  const value = cookies.find((c) => c.name === name)?.value;
  if (!value) throw new Error(`Cookie ${name} not set`);
  return value;
}
