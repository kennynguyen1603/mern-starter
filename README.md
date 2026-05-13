# MERN Stack Starter

A production-ready monorepo boilerplate for quickly bootstrapping full-stack applications with MongoDB, Express, React, and Node.js. Includes a complete authentication system out of the box — JWT, Google OAuth, email verification, password management, and a React frontend — so you can skip the plumbing and ship features.

## Features

### Authentication & Security
- **Local auth** — register, login, logout with JWT access + refresh tokens
- **Google OAuth 2.0** — sign in with Google; account merge flow when the email already exists locally
- **Token rotation** — refresh token is rotated on every use; token reuse detection immediately revokes all user sessions
- **Session blacklisting** — instant session invalidation in MongoDB, effective even before the access token expires
- **HttpOnly cookies** — access token (15 min) and refresh token (7 days) stored in HttpOnly cookies; never exposed to JavaScript
- **Rate limiting** — per-route, per-user Redis counters with suspicious-request detection (bursts under 100 ms)
- **Password management** — forgot password via OTP email, reset, change, and set password (for OAuth-only accounts)
- **Email verification** — send and resend verification emails via Resend

### Backend (`apps/api`)
- Layered architecture: Routes → Middleware → Controllers → Services → Repositories → MongoDB
- Zod schema validation on all incoming request data
- Structured, typed error/success response hierarchy
- `wrapAsyncHandler` — zero-boilerplate async error propagation to Express error handler
- Winston logging with daily file rotation
- Swagger/OpenAPI documentation (available in development at `/api/v1/docs`)
- Device and browser info captured per session (`ua-parser-js`)
- Cloudinary integration configured and ready to wire up
- `PaginationUtils` with text search, date range, and custom filter support

### Frontend (`apps/web`)
- React 19 + Vite 6 + TypeScript
- TanStack Query for server state; Zustand for client auth state
- Axios interceptor — automatically queues concurrent 401s and retries after a single token refresh
- Proactive token refresh — re-issues tokens ~1 minute before expiry so users never see an interruption
- React Hook Form + Zod for form validation
- Protected routes with loading guard
- Pages: Login, Register, Forgot Password, Reset Password, Dashboard, Profile, Set Password, Link Account (Google merge flow)

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js ≥ 20, TypeScript 5 |
| Framework | Express 5 |
| Database | MongoDB 7 (native driver — no Mongoose) |
| Cache / Rate limit | Redis 5 |
| Auth | JWT (`jsonwebtoken`), Passport.js, Google OAuth 2.0 |
| Email | Resend + Handlebars templates |
| File storage | Cloudinary |
| Frontend | React 19, Vite 6 |
| Server state | TanStack Query 5 |
| Client state | Zustand 5 |
| Forms | React Hook Form 7 + Zod 4 |
| Routing | React Router 7 |
| HTTP client | Axios |
| Monorepo | pnpm workspaces |
| Code quality | ESLint, Prettier, Husky pre-commit hooks |

## Project Structure

```
mern-starter/
├── apps/
│   ├── api/                  # Express backend (@mern/api)
│   │   ├── src/
│   │   │   ├── config/       # DB, Redis, Passport, env (Zod-validated), Cloudinary
│   │   │   ├── controllers/  # Thin request handlers
│   │   │   ├── core/         # ErrorResponse hierarchy, SuccessResponse, HTTP status codes
│   │   │   ├── middlewares/  # requireAuth, validate (Zod), rateLimit (Redis), error handler
│   │   │   ├── models/       # Document interfaces + MongoDB index creation
│   │   │   ├── repositories/ # MongoDB CRUD — the only layer that touches the DB
│   │   │   ├── routes/v1/    # Express routers
│   │   │   ├── services/     # Business logic: auth, user, token, jwt, email
│   │   │   ├── templates/    # Handlebars email layouts, partials, and templates
│   │   │   ├── types/        # Express type augmentation (req.user, req.validated)
│   │   │   ├── utils/        # crypto, logger, pagination, security utils, asyncHandler
│   │   │   └── validations/  # Zod request schemas
│   │   ├── postman/          # Postman collection and environment
│   │   ├── .env.example      # Environment variable template
│   │   └── Dockerfile
│   └── web/                  # React frontend (@mern/web)
│       └── src/
│           ├── api/          # Axios instance + typed API call functions
│           ├── components/   # ProtectedRoute
│           ├── hooks/        # useAuthQueries, useUserQueries
│           ├── layouts/      # AuthLayout, MainLayout
│           ├── lib/          # Proactive token refresh scheduler
│           ├── pages/        # All page components
│           ├── router.tsx    # React Router configuration
│           ├── schemas/      # Zod form validation schemas
│           └── store/        # Zustand auth store
└── packages/
    └── shared/               # Shared TypeScript types used by both api and web (@mern/shared)
```

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 10 (`npm install -g pnpm`)
- **MongoDB** — local instance or [MongoDB Atlas](https://www.mongodb.com/atlas)
- **Redis** — local instance or [Redis Cloud](https://redis.io/cloud/)
- **Google Cloud Console** project with OAuth 2.0 credentials ([guide](https://developers.google.com/identity/protocols/oauth2))
- **Resend** account for transactional email ([resend.com](https://resend.com))
- **Cloudinary** account for file uploads ([cloudinary.com](https://cloudinary.com))

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd mern-starter
pnpm install
```

### 2. Configure environment variables

```bash
# Backend
cp apps/api/.env.example apps/api/.env.development

# Frontend
cp apps/web/.env.example apps/web/.env.development
```

Fill in your credentials. See each app's README for a full variable reference:
- [apps/api/README.md](apps/api/README.md)
- [apps/web/README.md](apps/web/README.md)

### 3. Run in development

```bash
# Start API + Web concurrently
pnpm dev

# Or individually
pnpm dev:api
pnpm dev:web
```

| Service | URL |
|---|---|
| Frontend | `http://localhost:5173` |
| API | `http://localhost:8080` |
| Swagger docs | `http://localhost:8080/api/v1/docs` |

### 4. Build for production

```bash
pnpm build
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start API + Web in watch mode (concurrently) |
| `pnpm dev:api` | Start API only |
| `pnpm dev:web` | Start Web only |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint the entire repo |
| `pnpm format` | Format all files with Prettier |

## API Reference

Base URL: `http://localhost:8080/api/v1`

### Auth — `/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Create a local account |
| POST | `/login` | — | Login, set auth cookies |
| POST | `/logout` | Required | Revoke current session |
| POST | `/logout-all` | Required | Revoke all sessions |
| POST | `/refresh` | — | Rotate refresh token, issue new access token |
| GET | `/sessions` | Required | List active sessions |
| GET | `/google` | — | Redirect to Google OAuth |
| GET | `/google/callback` | — | Google OAuth callback |
| POST | `/google/link` | — | Merge Google account with an existing local account |
| GET | `/verify-email?token=` | — | Verify email address |
| POST | `/resend-verification` | — | Re-send verification email |
| POST | `/forgot-password` | — | Send OTP reset code to email |
| POST | `/reset-password` | — | Reset password with OTP |
| POST | `/change-password` | Required | Change password (keeps current session) |
| POST | `/set-password` | Required | Set password on OAuth-only account |

### Users — `/user`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/me` | Required | Get current user profile |
| GET | `/` | — | List users (paginated, searchable) |
| POST | `/` | — | Create user |
| GET | `/:id` | Required + Owner/Admin | Get user by ID |
| PUT | `/:id` | Required + Owner/Admin | Update user profile |
| DELETE | `/:id` | Required + Owner/Admin | Delete user |

A Postman collection is available at `apps/api/postman/`.

## Docker

A `docker-compose.yml` is provided for running MongoDB locally:

```bash
docker compose up mongo
```

> Note: the Docker Compose `api` service build path points to `packages/api` — update it to `apps/api` if you want to containerise the API.

## Shared Types

`packages/shared` exports all TypeScript types shared between the API and the frontend: user interfaces, auth DTOs, pagination types, and API response shapes. Both workspaces import from `@mern/shared`.
