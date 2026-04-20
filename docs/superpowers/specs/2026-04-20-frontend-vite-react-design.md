# Frontend Vite React — Design Spec

**Date:** 2026-04-20
**Scope:** Cấu hình toàn bộ `apps/web` cho MERN boilerplate: Zustand + TanStack Query + react-hook-form + zod, đầy đủ auth + user flows, Google OAuth, type-safe với `@mern/shared`.

---

## 1. Stack

| Layer | Library |
|---|---|
| Framework | React 19 + Vite 6 + TypeScript |
| Routing | react-router-dom v7 |
| HTTP | axios |
| Server state | @tanstack/react-query |
| Client state (auth) | zustand |
| Forms | react-hook-form + @hookform/resolvers + zod |
| Shared types | @mern/shared (workspace) |

**Deps bổ sung vào `apps/web/package.json`:**
`zustand`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`

---

## 2. Token Strategy

Backend dùng **HttpOnly cookies** cho `accessToken` (15 phút) và `refreshToken` (7 ngày, path `/api/v1/auth`). Frontend không đọc/lưu token — chỉ cần `withCredentials: true` trên axios.

---

## 3. Backend Addition

### `GET /api/v1/user/me`

Dùng để khởi tạo auth state khi reload page và sau Google OAuth redirect.

**`apps/api/src/controllers/user.controller.ts`** — thêm:
```typescript
getMe = async (req: Request, res: Response) => {
  const user = await userService.getProfile(req.user!.userId);
  return new OkResponse({ data: user });
};
```

**`apps/api/src/routes/v1/user.route.ts`** — thêm (TRƯỚC `/:id`):
```typescript
userRouter.get('/me', requireAuth, wrapAsyncHandler(userController.getMe));
```

---

## 4. Shared Types Fix

**`packages/shared/index.ts`** — thêm 2 types:

```typescript
// FE-specific: login/OAuth trả user trong body, tokens trong cookie
export interface ILoginResponse {
  user: IUserResponse;
}

// FE-specific: refresh trả accessToken để confirm thành công
export interface IRefreshResponse {
  accessToken: string;
}
```

`IAuthResponse` (có `tokens`) giữ nguyên — backend service dùng internally. FE dùng `ILoginResponse` thay thế.

---

## 5. Cấu trúc thư mục

```
apps/web/src/
├── api/
│   ├── axios.ts              # Axios instance + 401 interceptor
│   ├── auth.api.ts           # Auth API calls
│   └── user.api.ts           # User API calls
├── components/
│   └── ProtectedRoute.tsx    # Route guard từ Zustand store
├── hooks/
│   ├── useAuthQueries.ts     # TanStack Query hooks cho auth
│   └── useUserQueries.ts     # TanStack Query hooks cho user
├── layouts/
│   ├── AuthLayout.tsx        # Centered form, redirect nếu đã auth
│   └── MainLayout.tsx        # Header + nav + outlet
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── ForgotPasswordPage.tsx
│   ├── ResetPasswordPage.tsx
│   ├── LinkAccountPage.tsx   # Google OAuth account linking
│   ├── DashboardPage.tsx
│   ├── ProfilePage.tsx       # view + edit + change password
│   ├── SetPasswordPage.tsx   # OAuth user chưa có password
│   └── NotFoundPage.tsx
├── schemas/
│   ├── auth.schema.ts        # Zod schemas cho auth forms
│   └── user.schema.ts        # Zod schemas cho user forms
├── store/
│   └── auth.store.ts         # Zustand store
├── router.tsx                # createBrowserRouter
├── App.tsx                   # Providers + RouterProvider + auth init
├── main.tsx
└── index.css
```

**Xóa (cleanup):**
- `src/axios.ts`
- `src/context/AuthContext.tsx`
- `src/components/AuthExample.tsx`

---

## 6. Config

### `vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
```

### `tsconfig.app.json` — thêm vào `compilerOptions`:
```json
{
  "baseUrl": ".",
  "paths": {
    "@/*": ["src/*"]
  }
}
```

`@mern/shared` resolve qua node_modules (workspace symlink) — không cần alias riêng.

---

## 7. API Layer

### `src/api/axios.ts`
- Instance: `baseURL: '/api/v1'`, `withCredentials: true`
- Response interceptor: 401 → POST `/auth/refresh` → retry request gốc
- Queue mechanism: nhiều request cùng 401 → chỉ refresh 1 lần, các request khác chờ trong queue

### `src/api/auth.api.ts`

| Function | Method | Endpoint | Request | Response |
|---|---|---|---|---|
| `loginApi` | POST | `/auth/login` | `ILoginRequest` | `IApiSuccess<ILoginResponse>` |
| `registerApi` | POST | `/auth/register` | `IRegisterRequest` | `IApiSuccess<{ user: IUserResponse }>` |
| `logoutApi` | POST | `/auth/logout` | — | `IApiSuccess<null>` |
| `forgotPasswordApi` | POST | `/auth/forgot-password` | `{ email: string }` | `IApiSuccess<null>` |
| `resetPasswordApi` | POST | `/auth/reset-password` | `{ email, otp, newPassword }` | `IApiSuccess<null>` |
| `changePasswordApi` | POST | `/auth/change-password` | `{ currentPassword, newPassword }` | `IApiSuccess<null>` |
| `setPasswordApi` | POST | `/auth/set-password` | `{ newPassword: string }` | `IApiSuccess<null>` |
| `googleLinkApi` | POST | `/auth/google/link` | `{ pendingToken, password }` | `IApiSuccess<ILoginResponse>` |

### `src/api/user.api.ts`

| Function | Method | Endpoint | Response |
|---|---|---|---|
| `getMeApi` | GET | `/user/me` | `IApiSuccess<IUserResponse>` |
| `getProfileApi(id)` | GET | `/user/:id` | `IApiSuccess<IUserResponse>` |
| `updateProfileApi(id, data)` | PUT | `/user/:id` | `IApiSuccess<IUserResponse>` |
| `getAllUsersApi(params)` | GET | `/user` | `IApiSuccess<IPaginatedResponse<IUserResponse>>` |
| `deleteUserApi(id)` | DELETE | `/user/:id` | `IApiSuccess<null>` |

---

## 8. Zustand Store

```typescript
// src/store/auth.store.ts
interface AuthState {
  user: IUserResponse | null;
  setUser: (user: IUserResponse) => void;
  clearUser: () => void;
}

// Selector dùng trong component:
const isAuthenticated = useAuthStore(state => state.user !== null);
```

- Không persist (localStorage) — source of truth là HttpOnly cookie
- `isAuthenticated` không lưu riêng — là selector để tránh desync với `user`

---

## 9. TanStack Query Hooks

### `src/hooks/useAuthQueries.ts`

```typescript
useCurrentUser()     // useQuery: getMeApi → onSuccess: setUser
useLogin()           // useMutation: loginApi → onSuccess: setUser + setQueryData('currentUser')
useLogout()          // useMutation: logoutApi → onSuccess: clearUser + queryClient.clear()
useRegister()        // useMutation: registerApi
useForgotPassword()  // useMutation: forgotPasswordApi
useResetPassword()   // useMutation: resetPasswordApi
useChangePassword()  // useMutation: changePasswordApi
useSetPassword()     // useMutation: setPasswordApi
useGoogleLink()      // useMutation: googleLinkApi → onSuccess: setUser
```

`useCurrentUser` config:
- `staleTime: Infinity` — không tự refetch, chỉ chạy khi mount
- `retry: false` — axios interceptor đã tự refresh + retry

### `src/hooks/useUserQueries.ts`

```typescript
useProfile(id)       // useQuery: getProfileApi(id)
useUpdateProfile()   // useMutation: updateProfileApi → onSuccess: setQueryData + setUser nếu là chính mình
useAllUsers(params)  // useQuery: getAllUsersApi(params)
useDeleteUser()      // useMutation: deleteUserApi
```

---

## 10. Auth Init Flow

```
App.tsx mount
  → QueryClientProvider + RouterProvider
  → useCurrentUser() chạy lần đầu
      ├── 200: setUser(data) → isAuthenticated = true
      └── 401: interceptor → POST /auth/refresh
              ├── 200: retry GET /user/me → setUser
              └── 401: store rỗng → isAuthenticated = false
```

Sau login thành công:
- `loginMutation.onSuccess` → `setUser(response.data.user)` + `queryClient.setQueryData('currentUser', user)`
- Không gọi lại `/user/me`

---

## 11. Routing

| Path | Page | Guard |
|---|---|---|
| `/login` | LoginPage | redirect `/` nếu đã auth |
| `/register` | RegisterPage | redirect `/` nếu đã auth |
| `/forgot-password` | ForgotPasswordPage | public |
| `/reset-password` | ResetPasswordPage | public |
| `/auth/link-account` | LinkAccountPage | public |
| `/` | DashboardPage | protected |
| `/profile/:id` | ProfilePage | protected |
| `/profile/me/set-password` | SetPasswordPage | protected |
| `*` | NotFoundPage | — |

`ProtectedRoute`: đọc `isAuthenticated` từ Zustand → nếu `isLoading` (currentUser đang fetch) → spinner → nếu false → redirect `/login`.

---

## 12. Zod Schemas

### `src/schemas/auth.schema.ts`
- `loginSchema`: email + password
- `registerSchema`: name + email + password + confirmPassword (refinement: match)
- `forgotPasswordSchema`: email
- `resetPasswordSchema`: email + otp + newPassword + confirmNewPassword
- `changePasswordSchema`: currentPassword + newPassword + confirmNewPassword
- `setPasswordSchema`: newPassword + confirmNewPassword
- `linkAccountSchema`: password

### `src/schemas/user.schema.ts`
- `updateProfileSchema`: name (optional) + avatar (optional, url)

---

## 13. Pages — Responsibilities

| Page | Chức năng |
|---|---|
| **LoginPage** | Form login (email/pw) + nút Google OAuth + link Register/ForgotPassword. Xử lý query `?verified=true` (hiện thông báo). |
| **RegisterPage** | Form register. Sau submit → hiện thông báo kiểm tra email. |
| **ForgotPasswordPage** | Form nhập email → gọi forgotPassword. |
| **ResetPasswordPage** | Form email + OTP + new password. |
| **LinkAccountPage** | Đọc `?token=` từ URL → form nhập password → googleLinkApi → redirect `/`. |
| **DashboardPage** | Hiển thị user info từ Zustand store. Nút logout. |
| **ProfilePage** | Hiển thị + edit profile. Form change password (nếu có password). |
| **SetPasswordPage** | Form set password cho OAuth user. |
| **NotFoundPage** | 404. |

---

## 14. Google OAuth Flow

```
LoginPage → nút "Login with Google" → GET /api/v1/auth/google (redirect)
  → Google consent → GET /api/v1/auth/google/callback
      ├── Account mới/match: setAuthCookies → redirect /?auth=success
      │     └── App detect ?auth=success → useCurrentUser refetch → setUser
      └── Account conflict: redirect /auth/link-account?token=<pendingToken>
            └── LinkAccountPage: POST /auth/google/link → setUser → redirect /
```

---

## 15. Verification Plan

**Build:**
```bash
cd apps/web && pnpm build  # no TypeScript errors
```

**Manual flows:**
| Flow | Expected |
|---|---|
| Login đúng | redirect `/` |
| Register | thông báo check email |
| Reload `/` khi đã login | giữ session |
| Truy cập `/` chưa login | redirect `/login` |
| Logout | store clear, redirect `/login` |
| Forgot password | thông báo email sent |
| Reset password | đổi password thành công |
| Google login → `/?auth=success` | user set, redirect dashboard |
| `/auth/link-account?token=...` | link account thành công |
| `/profile/me/set-password` | OAuth user set password thành công |
| `/login?verified=true` | hiển thị thông báo email verified |
