import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import compression from 'compression';
import session from 'express-session';
import passport from 'passport';
import helmet from 'helmet';
import '@/config/passport/passport.js';
import { env } from '@/config/env/env.js';
import { defaultErrorHandler } from '@/middlewares/error.middleware.js';
import rootRouterV1 from '@/routes/v1/index.js';
import { errorConverter, NotFoundError } from '@/core/error.response.js';

const app: Express = express();

app.use(
  cors({
    origin: [env.frontendUrl, 'http://localhost:5173'],
    credentials: true,
  }),
);

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
  res.send('Yay!! Backend of wanderlust app is now accessible');
});
app.use('/api/v1', rootRouterV1);

app.use((req, res, next) => {
  const notFoundError = new NotFoundError(
    'The requested resource was not found',
  );
  next(notFoundError);
});

app.use(errorConverter);
app.use(defaultErrorHandler);

export default app;
