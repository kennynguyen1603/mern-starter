# Auth Extension: Google OAuth2 + Email Auth Features

**Date:** 2026-04-19  
**Status:** Approved  
**Scope:** Google OAuth2 login, User model updates, Email verification, Password management (forgot/reset/change/set)

---

## 1. Context & Goals

The existing auth system uses JWT + refresh token rotation with HttpOnly cookies, device fingerprinting, and multi-device session tracking. This spec extends it with:

1. Google OAuth2 login (Twitter deferred)
2. User model: `isEmailVerified`, `googleId`, `authProvider`, `providers[]`
3. Email flows: verify-email (link), resend-verification
4. Password flows: forgot-password (OTP), reset-password, change-password, set-password
5. Account linking: local + Google merge with password confirmation
6. Email delivery via **Resend**

**Not in scope:** Twitter OAuth, admin panel, email templates beyond basic structure.

---

## 2. Architecture Decision

**Passport.js as OAuth protocol only, business logic in AuthService.**

Passport handles the Google redirect + callback (OAuth dance, CSRF state, code exchange). After receiving the Google profile, Passport calls a verify callback that delegates entirely to `AuthService.handleGoogleCallback()`. Passport is configured with `session: false` — no session store, JWT remains the single auth mechanism.

This keeps the existing service → repository layer intact and makes adding Twitter later a matter of adding one Passport strategy + one route, reusing the same service logic.

---

## 3. User Model Changes

### 3.1 New Fields on `IUserDocument`

```typescript
isEmailVerified: boolean        // default: false. Google users: true on creation.
authProvider: AuthProvider      // primary provider used at registration
providers: AuthProvider[]       // all linked providers, e.g. ['local', 'google']
googleId?: string               // Google OAuth sub ID
password?: string               // now optional — Google-only users may not have one
// twitterId?: string           // reserved for future Twitter integration
```

### 3.2 `AuthProvider` Enum

Added to `packages/shared` and `apps/api`:

```typescript
enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}
```

### 3.3 Shared Types Updates

- `packages/shared/index.ts`: export `AuthProvider`, update `IUser` with new fields, update `IUserResponse` (exclude `password`, `googleId`)
- `IRegisterRequest`, `ILoginRequest` unchanged

### 3.4 MongoDB Indexes (new)

| Field | Type | Notes |
|---|---|---|
| `googleId` | unique sparse | Skips null/undefined values — prevents conflict |
| `isEmailVerified` | — | No standalone index needed; always queried with `email` |

---

## 4. Email Service (Resend)

Single `EmailService` class (singleton) wrapping the Resend SDK.

```typescript
class EmailService {
  private static instance: EmailService
  private resend: Resend

  static getInstance(): EmailService

  sendVerificationEmail(to: string, token: string): Promise<void>
  sendPasswordResetOTP(to: string, otp: string): Promise<void>
}
```

- `RESEND_API_KEY` added to env config
- `FROM_EMAIL` env var (e.g. `noreply@yourdomain.com`)
- All send failures throw `InternalServerError` — caller handles retry via resend-verification endpoint
- Located at `apps/api/src/services/email.service.ts`

---

## 5. Google OAuth Flow

### 5.1 Routes

```
GET  /api/v1/auth/google                — Passport redirect to Google consent
GET  /api/v1/auth/google/callback       — Passport callback, calls AuthService
POST /api/v1/auth/google/link           — Confirm account merge (submit password)
```

### 5.2 Happy Path — New Google User

```
GET /auth/google
  → Passport: redirect to Google with state (CSRF token)
  → Google callback with profile
  → AuthService.handleGoogleCallback(profile)
  → No user with googleId, no user with email
  → Create user: { googleId, isEmailVerified: true, authProvider: 'google', providers: ['google'], password: undefined }
  → Issue JWT pair → set HttpOnly cookies
  → Redirect: FRONTEND_URL/?auth=success
```

### 5.3 Happy Path — Returning Google User

```
→ AuthService.handleGoogleCallback(profile)
→ Found user by googleId
→ Issue JWT pair → redirect FRONTEND_URL/?auth=success
```

### 5.4 Account Merge Flow (email conflict)

```
→ AuthService.handleGoogleCallback(profile)
→ No user by googleId, but found user by email (local account)
→ Generate pending link token:
     JWT { googleId, email, type: 'account-link' }, TTL 10 min
     Store in DB as AccountLinkToken (hashed)
→ Redirect: FRONTEND_URL/auth/link-account?token=<raw>

Frontend shows: "Tài khoản email này đã tồn tại. Nhập mật khẩu để liên kết với Google."

POST /auth/google/link { pendingToken, password }
  → Verify pendingToken (not expired, not used, type=account-link)
  → Load user by email from token payload
  → bcrypt.compare(password, user.password)
  → If fail: 401 "Mật khẩu không đúng"
  → Update: user.googleId = googleId, push 'google' into user.providers[]
  → Revoke pendingToken (single-use)
  → Issue JWT pair → set cookies → return auth response
```

### 5.5 Security

- `state` param for CSRF: Passport GoogleStrategy handles generation and verification
- Passport configured `session: false`
- Pending link token: single-use, 10 min TTL, stored hashed in DB (`TokenType.AccountLinkToken`)
- Callback URL whitelisted in Google Cloud Console

---

## 6. Email Verification

### 6.1 Routes

```
GET  /api/v1/auth/verify-email?token=xxx   — Verify via link
POST /api/v1/auth/resend-verification      — Resend verification email
```

### 6.2 On Register

`AuthService.register()` after user creation:
1. Generate raw token: `crypto.randomBytes(32).toString('hex')`
2. Store SHA-256 hash in DB: `TokenType.EmailVerification`, TTL 24h
3. Call `EmailService.sendVerificationEmail(email, rawToken)`
4. Link format: `FRONTEND_URL/verify-email?token=<rawToken>`

Google OAuth users skip this — `isEmailVerified` is set `true` on creation.

### 6.3 Verify Email

```
GET /auth/verify-email?token=xxx
  → Hash token (SHA-256) → find in DB by hash
  → Check: isActive=true, not expired, type=EmailVerification
  → Set user.isEmailVerified = true
  → Revoke token
  → Redirect: FRONTEND_URL/login?verified=true
```

### 6.3.1 Login Policy for Unverified Emails

Local users with `isEmailVerified=false` **can still login** — but the auth response includes `isEmailVerified: false` so the frontend can show a banner ("Vui lòng xác nhận email") and optionally gate certain features. Login is NOT blocked. This avoids locking users out if the verification email lands in spam.

### 6.4 Resend Verification

```
POST /auth/resend-verification { email }
  → Find user by email
  → If isEmailVerified=true → 400 "Email đã được xác nhận"
  → Revoke all existing EmailVerification tokens for user
  → Generate new token → send email
  → Always return 200 (even if email not found — prevents enumeration)
  Rate limit: 3 requests/hour per email (Redis)
```

---

## 7. Forgot Password & Reset Password (OTP)

### 7.1 Routes

```
POST /api/v1/auth/forgot-password    — Send OTP to email
POST /api/v1/auth/reset-password     — Reset password with OTP
```

### 7.2 Forgot Password

```
POST /auth/forgot-password { email }
  → Find user by email
  → If user.providers does not include 'local':
       400 "Tài khoản Google không có mật khẩu. Đăng nhập bằng Google."
  → Revoke all existing PasswordReset tokens for user
  → Generate OTP: crypto.randomInt(100000, 999999) → 6 digits
  → Store SHA-256(OTP) in DB: type=PasswordReset, TTL 10 min, bound to userId
  → EmailService.sendPasswordResetOTP(email, otp)
  → Always return 200 (prevents enumeration)
  Rate limit: 5 requests/hour per email
```

### 7.3 Reset Password

```
POST /auth/reset-password { email, otp, newPassword }
  → Find user by email
  → SHA-256(submittedOTP) → DB lookup by (hash + userId)
  → Check: isActive=true, not expired, type=PasswordReset
  → (Timing-safe by design: comparison is a DB indexed lookup on the hash, not a direct buffer compare)
  → Hash newPassword (bcrypt, rounds=12)
  → Update user.password
  → Revoke PasswordReset token (single-use)
  → Revoke ALL refresh tokens for user (force logout all devices)
  → Return 200 OK
  Rate limit: 10 requests/hour per email
```

**Why force logout all devices:** A password reset is a security event. If an attacker triggered the reset, any existing sessions they hold must be invalidated.

---

## 8. Change Password & Set Password

### 8.1 Routes

```
POST /api/v1/auth/change-password    — Requires auth + current password
POST /api/v1/auth/set-password       — Requires auth, only for users without password
```

### 8.2 Change Password

```
POST /auth/change-password { currentPassword, newPassword }
  [requireAuth]
  → Load user by req.user.userId (NEVER from request body — prevents IDOR)
  → If user.password is undefined → 400 "Dùng set-password"
  → bcrypt.compare(currentPassword, user.password) — constant-time
  → If fail: 401 "Mật khẩu hiện tại không đúng"
  → If newPassword === currentPassword: 400 "Mật khẩu mới phải khác mật khẩu cũ"
  → Hash newPassword (bcrypt, rounds=12)
  → Update user.password
  → Revoke all refresh tokens EXCEPT current session (req.user.sessionId)
  → Return 200 OK
  Rate limit: 5 requests/15 min per userId
```

### 8.3 Set Password (Google-only users)

```
POST /auth/set-password { newPassword }
  [requireAuth]
  → Load user by req.user.userId
  → If user.password exists: 409 "Đã có mật khẩu, dùng change-password"
  → Hash newPassword (bcrypt, rounds=12)
  → Update user.password
  → Push 'local' into user.providers[]
  → Return 200 OK (no force logout — this is adding capability, not a security event)
```

### 8.4 IDOR Prevention Summary

| Attack | Defense |
|---|---|
| User A sends userId=B in body | `userId` always taken from JWT payload (`req.user.userId`) |
| Brute-force currentPassword | Rate limit 5/15min per userId |
| Timing attack on password compare | `bcrypt.compare` is inherently constant-time |
| Session reuse after password change | Revoke all sessions except current on change-password |

---

## 9. Password Validation Rules (Zod)

Applied to `newPassword` in register, reset-password, change-password, set-password:

```
- min 8 characters
- max 100 characters  
- at least 1 uppercase letter
- at least 1 number
```

---

## 10. New Token Types

Extend existing `TokenType` enum:

```typescript
enum TokenType {
  RefreshToken = 'refresh_token',
  EmailVerification = 'email_verification',    // existing
  PasswordReset = 'password_reset',            // existing
  WorkspaceInvite = 'workspace_invite',        // existing
  AccountLink = 'account_link',                // NEW — pending Google merge
}
```

All tokens stored hashed (SHA-256), with `userId`, `type`, `expiresAt`, `isActive` fields. Existing token repository methods cover create/find/revoke without modification.

---

## 11. New Routes Summary

| Method | Path | Auth | Rate Limit |
|---|---|---|---|
| GET | `/auth/google` | — | — |
| GET | `/auth/google/callback` | — | — |
| POST | `/auth/google/link` | — | 5/15min per IP |
| GET | `/auth/verify-email` | — | — |
| POST | `/auth/resend-verification` | — | 3/hour per email |
| POST | `/auth/forgot-password` | — | 5/hour per email |
| POST | `/auth/reset-password` | — | 10/hour per email |
| POST | `/auth/change-password` | requireAuth | 5/15min per userId |
| POST | `/auth/set-password` | requireAuth | 5/15min per userId |

---

## 12. Environment Variables (new)

```
RESEND_API_KEY=re_xxxx
FROM_EMAIL=noreply@yourdomain.com
ACCOUNT_LINK_TOKEN_SECRET=<secret>   # for signing pending link JWTs
```

`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` already exist.

---

## 13. Singleton Pattern & D.R.Y Refactor

### 13.1 Singleton Convention

All service classes follow the same pattern already established by `tokenService` and `jwtService`:

```typescript
class FooService {
  private static instance: FooService

  static getInstance(): FooService {
    if (!FooService.instance) FooService.instance = new FooService()
    return FooService.instance
  }
  // ... methods
}

export const fooService = FooService.getInstance()
```

**`authService`** and **`userService`** — currently plain object literals — must be converted to this class pattern. `tokenService` and `jwtService` already comply and require no change.

### 13.2 D.R.Y: Eliminate Duplicate Register Logic

**Problem:** `authService.register()` and `userService.register()` contain identical logic:
validate email → check duplicate → hash password → create user document.

**Fix:** Remove `authService.register()`. Route the `POST /auth/register` endpoint to `userService.createLocalUser()` (rename from `userService.register()` to clarify its scope). `AuthService` calls `userService.createLocalUser()` internally when needed — auth orchestrates, user service owns user creation.

### 13.3 D.R.Y: Unified User-to-Response Transform

**Problem:** `toUserResponse()` in `auth.service.ts` and `excludePassword()` in `user.service.ts` serve the same purpose with slightly different implementations.

**Fix:** Define a single `toUserResponse(user: WithId<IUserDocument>): IUserResponse` utility inside `user.service.ts`. `AuthService` imports and reuses it — no local copy.

### 13.4 Responsibility Split (post-refactor)

| Concern | Owner |
|---|---|
| User creation (local + Google) | `UserService` |
| User profile read/update/delete | `UserService` |
| Login, logout, token refresh | `AuthService` |
| Google OAuth callback, account linking | `AuthService` |
| Email verification, password reset flows | `AuthService` |
| Change/set password | `AuthService` |
| Token generation, rotation, revocation | `TokenService` (unchanged) |
| JWT sign/verify | `JwtService` (unchanged) |
| Email delivery | `EmailService` (new, singleton) |

`AuthService` depends on `UserService` (for user creation/lookup) and `TokenService`. `UserService` depends only on `userRepository`. This keeps the dependency graph acyclic.

---

## 14. File Structure (new/modified)

```
apps/api/src/
├── config/
│   └── passport/
│       └── google.strategy.ts          # modified: session:false, delegate to AuthService
├── models/
│   └── user.model.ts                   # modified: new fields (isEmailVerified, authProvider, providers, googleId)
├── services/
│   ├── auth.service.ts                 # refactored to class + singleton; new OAuth/email/password methods
│   ├── user.service.ts                 # refactored to class + singleton; register→createLocalUser; owns toUserResponse
│   └── email.service.ts                # NEW: Resend singleton class
├── routes/v1/
│   └── auth.route.ts                   # modified: new routes
├── controllers/
│   └── auth.controller.ts              # modified: new handlers
├── validations/
│   └── auth.validation.ts              # modified: new Zod schemas
└── repositories/
    └── user.repository.ts              # minor: add findByGoogleId, updateProviders methods

packages/shared/
└── index.ts                            # modified: AuthProvider enum, updated IUser, IUserResponse
```
