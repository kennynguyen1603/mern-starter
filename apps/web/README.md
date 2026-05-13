# @mern/web

React + TypeScript frontend for the MERN Starter. Communicates with the `@mern/api` backend via a Vite dev-server proxy.

## Tech Stack

- **Framework**: React 19 + Vite 6
- **Language**: TypeScript 5
- **Routing**: React Router 7 (`createBrowserRouter`)
- **Server state**: TanStack Query 5
- **Client state**: Zustand 5
- **Forms**: React Hook Form 7 + Zod 4 (`@hookform/resolvers`)
- **HTTP client**: Axios with automatic token refresh interceptor

## Project Structure

```
src/
├── api/
│   ├── axios.ts        # Axios instance with 401 → refresh interceptor
│   ├── auth.api.ts     # Auth API call functions
│   └── user.api.ts     # User API call functions
├── components/
│   └── ProtectedRoute.tsx   # Auth guard — redirects to /login if unauthenticated
├── hooks/
│   ├── useAuthQueries.ts    # useLogin, useLogout, useRegister, useForgotPassword …
│   └── useUserQueries.ts    # useGetMe, useUpdateProfile …
├── layouts/
│   ├── AuthLayout.tsx       # Wrapper for public auth pages
│   └── MainLayout.tsx       # Wrapper for protected app pages
├── lib/
│   └── tokenRefresh.ts      # Proactive access token refresh scheduler
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── ForgotPasswordPage.tsx
│   ├── ResetPasswordPage.tsx
│   ├── LinkAccountPage.tsx   # Google account merge flow
│   ├── DashboardPage.tsx
│   ├── ProfilePage.tsx
│   ├── SetPasswordPage.tsx   # Set password for OAuth-only accounts
│   └── NotFoundPage.tsx
├── router.tsx          # Route definitions
├── schemas/
│   ├── auth.schema.ts  # Zod schemas for auth forms
│   └── user.schema.ts  # Zod schemas for user forms
├── store/
│   └── auth.store.ts   # Zustand store — holds current user
├── App.tsx             # QueryClientProvider + RouterProvider
└── main.tsx            # React entry point
```

## Pages & Routing

| Path | Protection | Description |
|---|---|---|
| `/login` | Public | Login with email/password or Google |
| `/register` | Public | Create a new account |
| `/forgot-password` | Public | Request OTP reset code |
| `/reset-password` | Public | Reset password with OTP |
| `/auth/link-account` | Public | Merge Google account with existing local account |
| `/` | Protected | Dashboard |
| `/profile/:id` | Protected (owner/admin) | User profile |
| `/profile/me/set-password` | Protected | Set password for Google-only accounts |
| `*` | — | 404 Not Found |

## Authentication Flow

### Login

1. User submits credentials → `POST /api/v1/auth/login`
2. API sets `accessToken` and `refreshToken` as HttpOnly cookies
3. `useLogin` stores user in Zustand and TanStack Query cache
4. `scheduleTokenRefresh()` queues a proactive refresh ~1 minute before the access token expires

### Protected routes

`ProtectedRoute` calls `useCurrentUser()` → `GET /api/v1/user/me` on mount. If the request fails (unauthenticated), the user is redirected to `/login`.

### Automatic token refresh

The Axios interceptor in `api/axios.ts` intercepts 401 responses and:
1. Calls `POST /api/v1/auth/refresh` once
2. Queues all concurrent requests that arrived during the refresh
3. Replays the queue on success, or rejects it on failure

### Google OAuth

- Clicking "Sign in with Google" redirects to `GET /api/v1/auth/google`
- On success, the backend redirects to `/?auth=success` with cookies already set
- If the Google email matches an existing local account, the backend redirects to `/auth/link-account?token=<pendingToken>`; the user enters their password to confirm the merge

### Logout

`useLogout` calls `POST /api/v1/auth/logout`, then clears the Zustand store and the TanStack Query cache. The `clearTokenRefresh()` cancels any pending proactive refresh timer.

## State Management

| Concern | Tool |
|---|---|
| Authenticated user object | Zustand (`useAuthStore`) |
| API data (users, sessions…) | TanStack Query |
| Form data | React Hook Form (local component state) |

Zustand holds only the `user` object. Everything else lives in TanStack Query, keeping the global store minimal.

## Environment Variables

Copy `.env.example` to `.env.development`:

```bash
cp .env.example .env.development
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_ACCESS_TOKEN_EXP_MS` | Yes | `900000` | Access token lifetime in ms — must match `JWT_SECRET_ACCESS_TOKEN_EXP` on the backend (15 min = 900 000 ms) |
| `VITE_API_URL` | No | `http://localhost:8080` | Backend base URL for the Vite proxy |
| `VITE_PORT` | No | `5173` | Dev server port |

## Development

```bash
# Install from repo root
pnpm install

# Start dev server (with API proxy)
pnpm dev:web

# Type check
pnpm --filter @mern/web build

# Lint
pnpm --filter @mern/web lint
```

The Vite dev server proxies all `/api/v1/*` requests to `VITE_API_URL` (default `http://localhost:8080`), so no CORS configuration is needed during development.

## Build

```bash
pnpm --filter @mern/web build
```

Output is placed in `apps/web/dist/`. Serve it with any static file host or a reverse proxy (nginx, Caddy, etc.) pointing `/api/v1` at the backend.
