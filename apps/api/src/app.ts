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

// Required for secure session cookies and correct req.ip behind a TLS proxy
app.set('trust proxy', env.trustProxy);

app.use(
  cors({
    origin: [
      env.frontendUrl,
      ...(env.adminUrl ? [env.adminUrl] : []),
      ...(env.nodeEnv === 'development'
        ? ['http://localhost:5173', 'http://localhost:5174']
        : []),
    ],
    credentials: true,
  }),
);

app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());
app.use(compression());
app.use(
  session({
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    },
  }),
);
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
  res.send('API is running');
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
