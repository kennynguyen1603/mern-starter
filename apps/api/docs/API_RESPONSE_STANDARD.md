# Tiêu Chuẩn Phản Hồi API (API Response Standards)

Tài liệu này quy định cách xử lý lỗi (Error Handling) và trả về dữ liệu (Success Response) chuẩn mực cho toàn bộ dự án backend.

## 1. Nguyên Tắc Cốt Lõi (Core Principles)

- **Controller Layer**: KHÔNG bao giờ gọi trực tiếp `res.send()` hoặc `res.json()`. Chỉ cấu trúc object và `return`. `wrapHandler` sẽ tự động catch và send response.
- **Service Layer**: KHÔNG bao giờ sử dụng `throw new Error()`. Bắt buộc phải throw các Custom Exceptions đã được định nghĩa sẵn (VD: `BadRequestError`, `NotFoundError`).
- **Middleware**: Mọi lỗi ném ra từ Controller hoặc Service sẽ được gom về duy nhất 1 phễu là `defaultErrorHandler` để format chuẩn xác trước khi gửi cho Client.

---

## 2. Tiêu Chuẩn Trả Về Thành Công (Success Response)

Sử dụng các class trong `src/core/success.response.ts`.

### Các class hỗ trợ:
1. `OkResponse` (Trạng thái `200 OK` - cho các request fetch, update, delete thông thường).
2. `CreatedResponse` (Trạng thái `201 Created` - cho thao tác tạo mới dữ liệu).

### Cách sử dụng chuẩn xác (Tại Controller):
Chỉ cần `return` Object, không cần quan tâm `req` hay `res`.

```typescript
import { OkResponse, CreatedResponse } from '@/core/success.response.js';

export const createUser = async (req, res) => {
  const newUser = await userService.create(req.body);
  
  // ✅ DO THIS
  return new CreatedResponse({
    message: 'Tạo tài khoản thành công',
    data: newUser
  });
};

export const getUser = async (req, res) => {
  const user = await userService.findById(req.params.id);
  
  // ✅ DO THIS
  return new OkResponse({
    data: user
  }); // message mặc định sẽ là "OK"
};
```

---

## 3. Tiêu Chuẩn Báo Lỗi (Error Handling)

Hệ thống xử lý lỗi được thiết kế nhiều lớp nhằm đảm bảo tính toàn vẹn và độ an toàn bảo mật ở môi trường production. Sử dụng các class trong `src/core/error.response.ts`. Tuyệt đối không dùng class `Error` gốc của NodeJS để ném lỗi nghiệp vụ.

### Các class hỗ trợ thường dùng:
- `BadRequestError` (400): Tham số gửi lên sai hoặc không hợp lệ.
- `UnauthorizedError` (401): Chưa đăng nhập hoặc Token hết hạn/sai.
- `ForbiddenError` (403): Đã đăng nhập nhưng không có quyền thực hiện hành động này.
- `NotFoundError` (404): Không tìm thấy dữ liệu.
- `ConflictError` (409): Lỗi logic nghiệp vụ như "Email đã tồn tại".
- `UnprocessableEntityError` (422): Lỗi Validation Form (Zod/Joi).

### Cách sử dụng chuẩn (Tại Service hoặc Middleware):

```typescript
import { ConflictError, UnauthorizedError } from '@/core/error.response.js';

class UserService {
  async register(email: string) {
    if (await isEmailExist(email)) {
      // ✅ DO THIS
      throw new ConflictError('Email này đã được sử dụng!');
    }
  }

  async login(password: string) {
    if (password !== correctPassword) {
      // ✅ DO THIS
      throw new UnauthorizedError('Mật khẩu không chính xác!');
    }
  }
}
```

---

## 4. Các Tham Số Nâng Cao Trong Môi Trường Lỗi

### A. Phân Biệt `details` và `data`
Khi throw Error, class hỗ trợ truyền vào 2 tham số bổ sung là `data` (any) và `details` (mảng Validation).

- **`details` (Chuyên dụng Form Validation)**: Báo cho UI dạng Form biết chính xác ô input nào đang nhập sai để bôi đỏ.
  ```typescript
  throw new UnprocessableEntityError('Dữ liệu không hợp lệ', [
    { field: 'email', message: 'Email không đúng định dạng' }
  ]);
  ```
- **`data` (Context Data)**: Chứa các siêu dữ liệu phụ trợ giúp Frontend xử lý UI thông minh hơn (suggestion, context ID...).
  ```typescript
  throw new ConflictError('Email đã tồn tại', { suggestion: 'Đăng nhập?' });
  ```

### B. Cờ đánh dấu `isOperational` (An Toàn Production)
Thuộc tính `isOperational` dùng để phân biệt giữa **"Lỗi dự báo được"** và **"Bugs hệ thống/lập trình"**:
- **`isOperational: true` (Mặc định)**: Các Exception do chính bạn throw ra từ logic (sai password, form lỗi). Thông báo lỗi chuẩn sẽ được trả về nguyên vẹn cho Frontend.
- **`isOperational: false`**: Lỗi văng ra ngoài ý muốn (Syntax Error, lỗi connection DB...). Khi hoạt động ở `production`, Middleware sẽ **cố tình che giấu mọi chi tiết lỗi** này (chỉ trả về `500 Internal Server Error`) để tránh làm hệ thống rò rỉ thông tin cấu trúc code cho Hacker.

---

## 5. Chuẩn Hoá Đầu Vào & Ghi Log (Normalization & Sanitization)

Bảo vệ và đồng nhất luồng lỗi qua 2 Middleware quan trọng trong API lifecycle:

### `errorConverter` (Tại app.ts)
Tất cả những lỗi không thuộc định dạng `ErrorResponse` (do thư viện thứ 3 trả về, lỗi DB, lỗi unhandle...) khi văng ra sẽ lập tức đi qua `errorConverter` và được **ép kiểu (normalize)** sạch sẽ về dạng class `ErrorResponse`. Quan trọng nhất, chúng bị đánh cờ `isOperational: false` (vì đây là bug lập trình). Việc này đảm bảo logic tại `errorHandler` cuối cùng luôn đồng nhất và không bao giờ bị xử lý sai hướng.

### `sanitizeRequest` (Trước khi ghi Log)
Ngay trước khi lỗi được logger ghi xuống file hoặc tracking system (trong `error.middleware.ts`), hàm `sanitizeRequest` sẽ tự động xoá sổ (omit) tất cả các trường dữ liệu mang tính nhạy cảm có trong request người dùng (vd: `password`, `confirmPassword`, `token`, `refreshToken`). Điều này ngăn ngừa tuyệt đối thảm họa rò rỉ mật khẩu người dùng do vô tình in ra log thông tin.

---
> **Triết lý thiết kế:** Đảm bảo tất cả Middleware, Server Logs, APM (Datadog/Sentry) thu thập đủ Data truy vết lỗi thông qua kiến trúc OOP, nhưng hoàn toàn ẩn giấu thông tin quan trọng trước End-Users tại Production và loại bỏ 100% rủi ro lộ Log nhạy cảm.
