import 'express';

declare global {
  namespace Express {
    interface User {
      userId: string;
      role?: string;
      sessionId: string;
    }
    interface Request {
      user?: User;
    }
  }
}
