import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '@/middlewares/validate.middleware.js';
import { ErrorResponse } from '@/core/error.response.js';

const run = async (
  schema: Parameters<typeof validate>[0],
  req: Partial<Request>,
) => {
  const next = jest.fn() as jest.MockedFunction<NextFunction>;
  await validate(schema)(req as Request, {} as Response, next);
  return next;
};

describe('validate middleware', () => {
  const schema = {
    body: z.object({ name: z.string().min(2).trim() }),
    query: z.object({ page: z.coerce.number().int().positive().default(1) }),
    params: z.object({ id: z.string().length(3) }),
  };

  it('stores parsed body, query and params on req.validated', async () => {
    const req: Partial<Request> = {
      body: { name: '  Alice  ' },
      query: { page: '2' },
      params: { id: 'abc' },
    };
    const next = await run(schema, req);

    expect(next).toHaveBeenCalledWith();
    expect(req.validated).toEqual({
      body: { name: 'Alice' },
      query: { page: 2 },
      params: { id: 'abc' },
    });
  });

  it('forwards a 422 error with field details on invalid input', async () => {
    const next = await run(schema, {
      body: { name: 'A' },
      query: {},
      params: { id: 'abc' },
    });

    const error = next.mock.calls[0][0] as unknown as ErrorResponse;
    expect(error).toBeInstanceOf(ErrorResponse);
    expect(error.status).toBe(422);
    expect(error.message).toBe('Validation failed');
    expect(error.details).toEqual([expect.objectContaining({ field: 'name' })]);
  });

  it('joins nested paths in field names', async () => {
    const next = await run(
      { body: z.object({ profile: z.object({ age: z.number() }) }) },
      { body: { profile: { age: 'x' } } },
    );
    const error = next.mock.calls[0][0] as unknown as ErrorResponse;
    expect(error.details).toEqual([
      expect.objectContaining({ field: 'profile.age' }),
    ]);
  });

  it('forwards non-Zod errors unchanged', async () => {
    const boom = new Error('boom');
    const next = await run(
      {
        body: z.string().transform(() => {
          throw boom;
        }),
      },
      { body: 'x' },
    );
    expect(next).toHaveBeenCalledWith(boom);
  });
});
