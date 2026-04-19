import { Router } from 'express';
import userRouter from './user.route.js';
import authRouter from './auth.route.js';
import docsRouter from './docs.route.js';
// import demoRouter from './demo.route.js';
import { env } from '@/config/env/env.js';

const rootRouterV1: Router = Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRouter,
  },
  {
    path: '/user',
    route: userRouter,
  },
];

const devRouter = [
  {
    path: '/docs',
    route: docsRouter,
  },
];

defaultRoutes.forEach((route) => {
  rootRouterV1.use(route.path, route.route);
});

if (env.nodeEnv === 'development') {
  devRouter.forEach((route) => {
    rootRouterV1.use(route.path, route.route);
  });
}

export default rootRouterV1;
