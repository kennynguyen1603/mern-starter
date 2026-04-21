# MERN Monorepo Boilerplate

This is a fullstack MERN boilerplate built with a monorepo architecture, including:

- Backend API with Express + TypeScript
- Frontend with React + Vite + TypeScript
- Shared types package (`@mern/shared`)

The goal of this repository is to provide a ready-to-use foundation for projects that need authentication flows, user management, pagination, and a clear service/repository layer separation.

## Key Features

- Email/password registration and login
- Google OAuth login
- Link a Google account with an existing local account
- Forgot password / reset password with OTP via email
- Email verification via verification link
- Set password for OAuth-only accounts (without local password)
- Session management (logout current device or all devices)
- Access/refresh token handling with HttpOnly cookies
- Route-level rate limiting with Redis
- Standardized success/error API responses
- Swagger API docs in development mode

## Tech Stack

### Backend (`apps/api`)

- Node.js + Express 5 + TypeScript
- MongoDB (native driver)
- Redis
- JWT + Passport Google OAuth 2.0
- Zod validation
- Winston logging
- Swagger (swagger-jsdoc + swagger-ui-express)
- Resend (email service) + Handlebars templates

### Frontend (`apps/web`)

- React 19 + TypeScript + Vite
- React Router
- TanStack Query
- Zustand
- React Hook Form + Zod
- Axios (with automatic token refresh interceptor)

### Workspace & Tooling

- pnpm workspace
- ESLint + Prettier
- Husky pre-commit
- GitHub Actions CI (`lint` + `build`)

## Project Structure

```text
.
├─ apps/
│  ├─ api/          # Express API + auth/user modules
│  └─ web/          # React app
├─ packages/
│  └─ shared/       # Shared types/interfaces between frontend and backend
├─ docs/            # Internal design documentation
├─ docker-compose.yml
└─ package.json     # Workspace-level scripts
```

## System Requirements

- Node.js >= 22
- pnpm >= 10
- MongoDB
- Redis

## Installation

```bash
pnpm install
```

## Environment Configuration

### 1) Backend environment (`apps/api/.env.development`)

Create `apps/api/.env.development`:

```env
PORT=8080
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

MONGODB_URI=mongodb://localhost:27017
DB_NAME=mern_boilerplate

ENCRYPTION_KEY=your_32_chars_or_more_encryption_key_here

JWT_SECRET_ACCESS_TOKEN=your_access_secret_here
JWT_SECRET_ACCESS_TOKEN_EXP=15m
JWT_SECRET_REFRESH_TOKEN=your_refresh_secret_here
JWT_SECRET_REFRESH_TOKEN_EXP=7d

# Use one of these Redis config options:
REDIS_URL=redis://localhost:6379
# REDIS_HOST=localhost
# REDIS_PORT=6379

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:8080/api/v1/auth/google/callback

RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@example.com

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

Note: the current backend env schema requires all variables above, even if you are not using Google/Resend/Cloudinary yet.

### 2) Frontend environment (`apps/web/.env.development`)

Copy from the sample file:

```bash
cp apps/web/.env.example apps/web/.env.development
```

Default values:

```env
VITE_PORT=5173
VITE_API_URL=http://localhost:8080
VITE_ACCESS_TOKEN_EXP_MS=900000
```

## Run Locally

### Run API + Web together

```bash
pnpm dev
```

### Run each app separately

```bash
pnpm dev:api
pnpm dev:web
```

### Default URLs

- Frontend: `http://localhost:5173`
- API: `http://localhost:8080`
- Swagger docs (dev): `http://localhost:8080/api/v1/docs`

## Main Scripts

### Root-level scripts

- `pnpm dev`: run API + Web concurrently
- `pnpm dev:api`: run backend only
- `pnpm dev:web`: run frontend only
- `pnpm build`: build the entire workspace
- `pnpm lint`: lint the whole repo
- `pnpm format`: format code with Prettier

### API scripts (`@mern/api`)

- `pnpm --filter @mern/api dev`
- `pnpm --filter @mern/api build`
- `pnpm --filter @mern/api start`
- `pnpm --filter @mern/api lint`
- `pnpm --filter @mern/api lint:fix`

### Web scripts (`@mern/web`)

- `pnpm --filter @mern/web dev`
- `pnpm --filter @mern/web build`
- `pnpm --filter @mern/web preview`
- `pnpm --filter @mern/web lint`

## Notable API Routes (v1)

Base path: `/api/v1`

- Auth:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/logout`
  - `POST /auth/logout-all`
  - `POST /auth/refresh`
  - `GET /auth/sessions`
  - `GET /auth/google`
  - `GET /auth/google/callback`
  - `POST /auth/google/link`
  - `GET /auth/verify-email`
  - `POST /auth/resend-verification`
  - `POST /auth/forgot-password`
  - `POST /auth/reset-password`
  - `POST /auth/change-password`
  - `POST /auth/set-password`
- User:
  - `GET /user/me`
  - `GET /user`
  - `POST /user`
  - `GET /user/:id`
  - `PUT /user/:id`
  - `DELETE /user/:id`

Postman collections are available in `apps/api/postman/`.

## Main Frontend Routes

- Public:
  - `/login`
  - `/register`
  - `/forgot-password`
  - `/reset-password`
  - `/auth/link-account`
- Protected:
  - `/`
  - `/profile/:id`
  - `/profile/me/set-password`

## CI

The workflow in `.github/workflows/deploy.yml` runs:

1. `pnpm install --frozen-lockfile`
2. `pnpm lint`
3. `pnpm build`

on pushes to `main`, `dev`, and pull requests targeting `main`.

## Docker Note

This repo includes `docker-compose.yml` and `apps/api/Dockerfile`. However, the current compose file references `packages/api` (while the actual API source is in `apps/api`). If you use Docker Compose, update the build/context paths to match the current structure.

