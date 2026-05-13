# @mern/api

Express + TypeScript REST API for the MERN Starter. Provides authentication, user management, Google OAuth, email verification, and password management.

## Tech Stack

- **Runtime**: Node.js, TypeScript 5 (`NodeNext` modules)
- **Framework**: Express 5
- **Database**: MongoDB 7 (native driver — no Mongoose)
- **Cache / Rate limit**: Redis 5
- **Auth**: JWT, Passport.js + Google OAuth 2.0
- **Email**: Resend + Handlebars templates
- **Validation**: Zod 4
- **Logging**: Winston + daily log rotation
- **Docs**: Swagger UI (`/api/v1/docs`, dev only)

## Architecture

```
src/
├── config/
│   ├── db/         # MongoDB singleton (Database class)
│   ├── env/        # Zod-validated environment (env.ts)
│   ├── passport/   # Google OAuth strategy
│   ├── redis/      # Redis singleton (Redis class)
│   └── upload/     # Multer config (ready to enable)
├── controllers/    # Thin handlers — call service, return SuccessResponse
├── core/           # ErrorResponse hierarchy, SuccessResponse, status codes
├── middlewares/
│   ├── auth.middleware.ts       # requireAuth, requireOwnerOrAdmin
│   ├── error.middleware.ts      # Global error handler
│   ├── rateLimit.middleware.ts  # Redis-backed rate limiter
│   └── validate.middleware.ts   # Zod request validator
├── models/         # Document interfaces + MongoDB index creation
├── repositories/   # MongoDB CRUD — only layer that touches the DB
├── routes/v1/      # Express routers with middleware chains
├── services/       # Business logic (auth, user, token, jwt, email)
├── templates/      # Handlebars email layouts, partials, and templates
├── types/          # Express augmentation (req.user, req.validated)
├── utils/
│   ├── asyncHandler.ts    # wrapAsyncHandler — propagates thrown errors to Express
│   ├── constants.ts       # RESPONSE_MESSAGES
│   ├── crypto.ts          # hashPassword, comparePassword, hashToken, generateOTP
│   ├── emailValidation.ts # Email normalisation
│   ├── logger.ts          # Winston logger
│   ├── pagination.utils.ts# PaginationUtils class
│   ├── pick.ts            # Request sanitiser for logging
│   └── security.utils.ts  # IP extraction, UA parsing, SecurityContext
└── validations/    # Zod schemas for auth and user routes
```

## API Endpoints

### Auth — `/api/v1/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Create local account |
| POST | `/login` | — | Login, set auth cookies |
| POST | `/logout` | Required | Revoke current session |
| POST | `/logout-all` | Required | Revoke all sessions |
| POST | `/refresh` | — | Rotate refresh token, issue new access token |
| GET | `/sessions` | Required | List active sessions |
| GET | `/google` | — | Redirect to Google OAuth consent |
| GET | `/google/callback` | — | Google OAuth callback |
| POST | `/google/link` | — | Link Google account to existing local account |
| GET | `/verify-email?token=` | — | Verify email address |
| POST | `/resend-verification` | — | Re-send verification email |
| POST | `/forgot-password` | — | Send OTP reset code to email |
| POST | `/reset-password` | — | Reset password with OTP |
| POST | `/change-password` | Required | Change password (keeps current session) |
| POST | `/set-password` | Required | Set password on OAuth-only account |

### Users — `/api/v1/user`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/me` | Required | Get current user profile |
| GET | `/` | — | List all users (paginated) |
| POST | `/` | — | Create user directly |
| GET | `/:id` | Required + Owner/Admin | Get user by ID |
| PUT | `/:id` | Required + Owner/Admin | Update user profile |
| DELETE | `/:id` | Required + Owner/Admin | Delete user |

### Query Parameters (list endpoints)

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10, max: 100) |
| `search` | string | Text search on `name` and `email` |
| `sortBy` | string | Field to sort by |
| `sortOrder` | `ASC` \| `DESC` | Sort direction |

## Response Format

### Success

```json
{
  "message": "Login successful",
  "status": 200,
  "data": { "user": { ... } }
}
```

### Error

```json
{
  "error": {
    "message": "Invalid email or password",
    "status": 401,
    "details": []
  },
  "data": null
}
```

## Authentication Flow

Access tokens are set as **HttpOnly cookies** (`accessToken`, `refreshToken`). They are not exposed in the response body. The frontend reads only the cookie — no `Authorization` header needed for browser clients.

For non-browser clients, pass the access token as `Authorization: Bearer <token>`.

### Token lifecycle

1. Login → `accessToken` cookie (15 min) + `refreshToken` cookie (7 days) set
2. On 401 → client calls `POST /auth/refresh` → new token pair issued, old session revoked
3. Token reuse detection: if a revoked refresh token is used, **all** sessions for that user are immediately revoked
4. Logout → session blacklisted in MongoDB; subsequent requests with the access token are rejected even if not yet expired

## Environment Variables

Copy `.env.example` to `.env.development` (or `.env.production`):

```bash
cp .env.example .env.development
```

See [.env.example](.env.example) for all required variables with descriptions.

You can switch environments at runtime:

```bash
# Default: loads .env.development
pnpm dev

# Explicit environment
node dist/server.js --env=production
```

## Development

```bash
# Install from repo root
pnpm install

# Start in watch mode
pnpm dev:api

# Lint
pnpm --filter @mern/api lint

# Build
pnpm --filter @mern/api build
```

### Swagger Docs

Available in development at `http://localhost:8080/api/v1/docs`.

## Key Design Decisions

- **No Mongoose** — the native MongoDB driver is used directly. Models are plain TypeScript interfaces with factory helper functions for document creation.
- **Singleton pattern** — `Database`, `Redis`, all services, and the JWT service are singletons.
- **Hashed tokens in DB** — refresh tokens, verification tokens, and password reset OTPs are stored as SHA-256 hashes; raw values are only ever in-transit.
- **Rate limiting in Redis** — custom sliding-window implementation with suspicious-request detection (bursts under 100 ms between requests trigger a 24 h block).
- **Zod at boundaries** — all incoming request data is parsed and validated before reaching controllers. Validated data is stored on `req.validated`.
