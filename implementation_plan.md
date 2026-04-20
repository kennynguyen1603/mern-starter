# Frontend Boilerplate — Vite React Configuration

Cấu hình lại toàn bộ phần frontend (`apps/web`) cho MERN monorepo boilerplate: cấu trúc thư mục sạch, type-safe với `@mern/shared`, và tương tác đầy đủ với backend API (auth + user).

## User Review Required

> [!IMPORTANT]
> **Token strategy**: Backend sử dụng **HttpOnly cookies** cho cả `accessToken` và `refreshToken`. Frontend **không** lưu token ở `localStorage` — chỉ cần `withCredentials: true` trên Axios. Refresh token được gửi tự động qua cookie khi gọi `/api/v1/auth/refresh`.

> [!IMPORTANT]
> **Proxy config**: Hiện tại `vite.config.ts` proxy `/auth` và `/user`, nhưng backend mount routes ở `/api/v1/auth` và `/api/v1/user`. Sẽ sửa proxy thành `/api` → `http://localhost:4000`.

> [!WARNING]
> **`@mern/shared` import**: `tsconfig.app.json` hiện chưa có `paths` mapping cho `@mern/shared`. Cần thêm `baseUrl` + `paths` vào `tsconfig.app.json` và alias trong `vite.config.ts` để import từ `@mern/shared` hoạt động.

## Proposed Changes

### Cấu trúc thư mục sau khi hoàn thành

```
apps/web/src/
├── api/                    # API service layer
│   ├── axios.ts            # Axios instance + interceptors
│   ├── auth.api.ts         # Auth API calls
│   └── user.api.ts         # User API calls
├── components/             # Reusable UI components
│   └── ProtectedRoute.tsx  # Route guard cho authenticated pages
├── contexts/               # React Context providers
│   └── AuthContext.tsx      # Auth state management
├── hooks/                  # Custom hooks
│   └── useAuth.ts          # Auth hook (re-export từ context)
├── layouts/                # Layout wrappers
│   └── AuthLayout.tsx      # Layout cho auth pages (login/register)
│   └── MainLayout.tsx      # Layout cho main pages (dashboard)
├── pages/                  # Page components
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   ├── ProfilePage.tsx
│   ├── ForgotPasswordPage.tsx
│   ├── ResetPasswordPage.tsx
│   └── NotFoundPage.tsx
├── router.tsx              # Centralized route definitions
├── App.tsx                 # Root component (providers + router)
├── main.tsx                # Entry point
└── index.css               # Global styles (minimal)
```

---

### Config Layer

#### [MODIFY] [vite.config.ts](file:///Users/nguyenny/Documents/Projects/module/mern-monorepo/apps/web/vite.config.ts)
- Sửa proxy: `/api` → `http://localhost:4000` (thay vì `/auth`, `/user` riêng lẻ)
- Thêm `resolve.alias` cho `@/` → `./src` và `@mern/shared`

#### [MODIFY] [tsconfig.app.json](file:///Users/nguyenny/Documents/Projects/module/mern-monorepo/apps/web/tsconfig.app.json)
- Thêm `baseUrl: "."` và `paths` cho `@/*` → `src/*`
- Strict mode settings

---

### API Layer (`src/api/`)

#### [NEW] [axios.ts](file:///Users/nguyenny/Documents/Projects/module/mern-monorepo/apps/web/src/api/axios.ts)
- Axios instance với `baseURL: '/api/v1'`, `withCredentials: true`
- **Response interceptor**: khi nhận 401 → tự động gọi `/api/v1/auth/refresh` → retry request gốc (token rotation tự động qua cookies)
- Queue mechanism: nếu nhiều request cùng bị 401, chỉ refresh **1 lần**, các request khác chờ

#### [NEW] [auth.api.ts](file:///Users/nguyenny/Documents/Projects/module/mern-monorepo/apps/web/src/api/auth.api.ts)
- Sử dụng types từ `@mern/shared`: `ILoginRequest`, `IRegisterRequest`, `IAuthResponse`, `IApiSuccess`, `IUserResponse`
- Functions: `loginApi`, `registerApi`, `logoutApi`, `refreshApi`, `getSessionsApi`
- Functions: `forgotPasswordApi`, `resetPasswordApi`, `changePasswordApi`, `resendVerificationApi`

#### [NEW] [user.api.ts](file:///Users/nguyenny/Documents/Projects/module/mern-monorepo/apps/web/src/api/user.api.ts)
- Functions: `getProfileApi`, `updateProfileApi`, `deleteUserApi`, `getAllUsersApi`
- Sử dụng `IUserResponse`, `IPaginatedResponse` từ `@mern/shared`

---

### Context & Hooks

#### [NEW] [AuthContext.tsx](file:///Users/nguyenny/Documents/Projects/module/mern-monorepo/apps/web/src/contexts/AuthContext.tsx)
- `AuthProvider` quản lý: `user`, `isAuthenticated`, `isLoading`
- Methods: `login`, `register`, `logout`
- Init: gọi `/api/v1/auth/refresh` khi mount → nếu cookie hợp lệ → set user (sử dụng `getMe` endpoint hoặc decode từ response)
- Type-safe: `user: IUserResponse | null`

#### [NEW] [useAuth.ts](file:///Users/nguyenny/Documents/Projects/module/mern-monorepo/apps/web/src/hooks/useAuth.ts)
- Re-export `useAuth` hook từ `AuthContext`

---

### Router & Route Guards

#### [NEW] [router.tsx](file:///Users/nguyenny/Documents/Projects/module/mern-monorepo/apps/web/src/router.tsx)
- Sử dụng `react-router-dom` v7: `createBrowserRouter`
- Routes:
  - `/login` → LoginPage (redirect nếu đã login)
  - `/register` → RegisterPage (redirect nếu đã login)
  - `/forgot-password` → ForgotPasswordPage
  - `/reset-password` → ResetPasswordPage
  - `/` → DashboardPage (protected)
  - `/profile/:id` → ProfilePage (protected)
  - `*` → NotFoundPage

#### [NEW] [ProtectedRoute.tsx](file:///Users/nguyenny/Documents/Projects/module/mern-monorepo/apps/web/src/components/ProtectedRoute.tsx)
- Kiểm tra `isAuthenticated` từ `useAuth`
- Nếu đang loading → spinner
- Nếu chưa login → redirect `/login`

---

### Pages

#### [NEW] LoginPage.tsx
- Form: email + password, submit gọi `login()` từ context
- Link đến Register, Forgot Password
- Xử lý query params: `?verified=true` (hiển thị thông báo email verified)

#### [NEW] RegisterPage.tsx
- Form: name + email + password + confirm password
- Gọi `register()` → thông báo kiểm tra email

#### [NEW] DashboardPage.tsx
- Hiển thị thông tin user đang đăng nhập
- Nút logout

#### [NEW] ProfilePage.tsx
- Xem/chỉnh sửa profile (name, avatar)
- Change password form

#### [NEW] ForgotPasswordPage.tsx
- Form nhập email → gọi `forgotPasswordApi`

#### [NEW] ResetPasswordPage.tsx
- Form nhập email + OTP + new password → gọi `resetPasswordApi`

#### [NEW] NotFoundPage.tsx
- Trang 404

---

### Layouts

#### [NEW] AuthLayout.tsx
- Layout wrapper cho login/register pages (centered form)

#### [NEW] MainLayout.tsx
- Layout wrapper cho authenticated pages (header + main content)

---

### Cleanup

#### [DELETE] [src/axios.ts](file:///Users/nguyenny/Documents/Projects/module/mern-monorepo/apps/web/src/axios.ts)
- Thay bằng `src/api/axios.ts`

#### [DELETE] [src/context/AuthContext.tsx](file:///Users/nguyenny/Documents/Projects/module/mern-monorepo/apps/web/src/context/AuthContext.tsx)
- Thay bằng `src/contexts/AuthContext.tsx`

#### [DELETE] [src/components/AuthExample.tsx](file:///Users/nguyenny/Documents/Projects/module/mern-monorepo/apps/web/src/components/AuthExample.tsx)
- Thay bằng trang Login/Register đúng

---

### Shared Package Fix (nếu cần)

#### [MODIFY] [index.ts](file:///Users/nguyenny/Documents/Projects/module/mern-monorepo/packages/shared/index.ts)
- Kiểm tra và bổ sung types nếu thiếu (hiện tại đã đủ cho auth + user flow)

## Open Questions

> [!IMPORTANT]
> **Get current user endpoint**: Backend hiện không có endpoint `GET /api/v1/user/me` (get current authenticated user). Để khởi tạo auth state khi reload page, có 2 cách:
> 1. Thêm endpoint `GET /api/v1/user/me` vào backend (khuyến nghị)
> 2. Gọi `GET /api/v1/user/:id` — nhưng FE không biết userId khi chưa có token
> 3. Gọi `/api/v1/auth/refresh` → backend trả về user info trong response
>
> **Bạn muốn cách nào?** Mình khuyến nghị **cách 1** — thêm `GET /api/v1/user/me` endpoint vì đây là boilerplate pattern chuẩn.

## Verification Plan

### Automated Tests
- `pnpm dev:web` — chạy thành công không lỗi TypeScript
- `pnpm build` trong `apps/web` — build thành công

### Manual Verification
- Truy cập `http://localhost:5173/login` → hiển thị login form
- Register → redirect login → login thành công → redirect dashboard
- Logout → redirect login
- Refresh page → vẫn giữ session (auto refresh token)
- Truy cập protected route khi chưa login → redirect login
