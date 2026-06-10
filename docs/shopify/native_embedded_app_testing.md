# Shopify Native Embedded App Testing Guide

## Mục Tiêu

Tài liệu này dùng để kiểm thử thủ công các thay đổi chuyển Shopify app sang mô hình Native Embedded chạy trong iframe Shopify Admin, sử dụng `window.shopify.idToken()` và header `Authorization: Bearer <token>` thay cho Supabase auth cookie trong iframe.

Các phần cần xác nhận:

- Trang `/shopify/dashboard` chạy trực tiếp trong Shopify Admin iframe.
- Frontend gọi `/api/shopify/v1/bots` kèm Bearer token từ Shopify App Bridge.
- Backend giải mã Shopify session token và map shop domain sang Supabase merchant.
- Dashboard hiển thị trạng thái loading, lỗi, empty state, hoặc danh sách chatbot mà không mở tab mới.

## Điều Kiện Chuẩn Bị

### Biến môi trường bắt buộc

Ứng dụng cần có các biến sau trong môi trường chạy local hoặc deploy:

```bash
NEXT_PUBLIC_SHOPIFY_CLIENT_ID=<shopify_app_client_id>
SHOPIFY_CLIENT_SECRET=<shopify_app_client_secret>
NEXT_PUBLIC_APP_URL=<public_https_app_url>
NEXT_PUBLIC_SUPABASE_URL=<supabase_project_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<supabase_service_role_key>
DATABASE_URL=<postgres_url_if_shopify_session_storage_uses_postgres>
```

Nếu test local qua tunnel, `NEXT_PUBLIC_APP_URL` phải là URL HTTPS công khai đang được cấu hình trong Shopify Partner app, ví dụ:

```bash
NEXT_PUBLIC_APP_URL=https://<your-tunnel>.ngrok-free.app
```

### Shopify Partner App

Kiểm tra cấu hình app trong Shopify Partner Dashboard:

- App URL trỏ về `https://<app-url>/shopify/dashboard`.
- Allowed redirection URLs vẫn chứa OAuth callback hiện có, ví dụ `https://<app-url>/api/shopify/callback`.
- Embedded app được bật.
- Development store đã cài app phiên bản mới nhất.

### Supabase Merchant User

Mô hình native hiện tại map shop domain sang Supabase Auth user bằng email managed:

```text
shopify+<shop-domain>@vielora.local
```

Ví dụ với shop `vielora-dev.myshopify.com`:

```text
shopify+vielora-dev.myshopify.com@vielora.local
```

Trước khi test dashboard có dữ liệu, xác nhận Supabase Auth có user tương ứng và bảng `bots` có ít nhất một row với `user_id` bằng ID của user đó.

## Kiểm Thử Local Trước Khi Mở Shopify

Chạy các lệnh sau để xác nhận code compile:

```bash
npx vitest run lib/helpers/shopify-auth.test.ts
npm run lint
npm run build
```

Nếu `npm run build` fail vì thiếu biến Shopify trong local shell, chạy lại với biến thật hoặc placeholder chỉ để kiểm tra compile:

```bash
NEXT_PUBLIC_SHOPIFY_CLIENT_ID=dummy \
SHOPIFY_CLIENT_SECRET=dummy \
NEXT_PUBLIC_APP_URL=http://localhost:3000 \
DATABASE_URL=postgresql://user:pass@localhost:5432/db \
npm run build
```

Lưu ý: placeholder chỉ dùng để build local. Không dùng placeholder khi kiểm thử thật trong Shopify vì token decode cần client secret thật.

## Kiểm Thử Trong Shopify Admin

### 1. Mở app trong Shopify Admin

1. Vào Shopify Admin của development store.
2. Mở menu Apps và chọn Vielora app.
3. Xác nhận app render trong iframe tại route `/shopify/dashboard`.

Kỳ vọng:

- Không mở tab mới.
- Không redirect sang `/auth`.
- Không xuất hiện lỗi trắng trang do `X-Frame-Options`.
- Giao diện hiện loading text `Đang tải cấu hình Vielora AI...`, sau đó render dashboard.

### 2. Kiểm tra request API native

Mở DevTools của browser tại trang Shopify Admin:

1. Chọn tab Network.
2. Filter theo `/api/shopify/v1/bots`.
3. Reload iframe hoặc mở lại app.
4. Click request `GET /api/shopify/v1/bots`.

Kỳ vọng request:

```http
GET /api/shopify/v1/bots
Authorization: Bearer <shopify_id_token>
```

Kỳ vọng response thành công:

```json
{
  "success": true,
  "data": [
    {
      "id": "<bot-id>",
      "name": "<bot-name>",
      "status": "ready"
    }
  ]
}
```

Nếu merchant chưa có bot, response hợp lệ là:

```json
{
  "success": true,
  "data": []
}
```

### 3. Kiểm tra dashboard state

Với merchant có bot:

- Card `Trạng thái kết nối` hiển thị `Native Active`.
- Card `Số lượng Trợ lý ảo` hiển thị đúng số lượng bot.
- Bảng chatbot hiển thị `id`, `name`, `status`.

Với merchant chưa có bot:

- Dashboard hiển thị empty state `Chưa tìm thấy Chatbot`.
- Không có lỗi 401 hoặc 500 trong Network.

### 4. Kiểm tra không còn luồng tab mới

Xác nhận không còn các hành vi sau khi mở `/shopify/dashboard`:

- Không render nút `Open Vielora Workspace`.
- Không gọi `window.open(...)`.
- Không gọi `/api/shopify/sso?token=...` khi tải dashboard.
- Không điều hướng `_blank` hoặc `_top` để thoát iframe.

## Kiểm Thử Lỗi Có Chủ Đích

### Thiếu Authorization header

Gọi endpoint trực tiếp không kèm token:

```bash
curl -i https://<app-url>/api/shopify/v1/bots
```

Kỳ vọng:

```http
HTTP/2 401
```

```json
{
  "success": false,
  "message": "Missing or invalid authorization header"
}
```

### Token không hợp lệ

```bash
curl -i \
  -H "Authorization: Bearer invalid-token" \
  https://<app-url>/api/shopify/v1/bots
```

Kỳ vọng:

- HTTP `401`.
- JSON `success: false`.
- `message` mô tả lỗi decode hoặc authentication failed.

### Không tìm thấy merchant trong Supabase

1. Dùng một development store chưa có Supabase Auth user managed email tương ứng.
2. Mở app trong Shopify Admin.
3. Kiểm tra response `/api/shopify/v1/bots`.

Kỳ vọng:

```json
{
  "success": false,
  "message": "Merchant organization not found inside Supabase"
}
```

Dashboard phải hiển thị card lỗi `Lỗi cấu hình hệ thống`.

## Debug Checklist

### App Bridge không cấp token

Dấu hiệu:

- Console có warning `Native idToken function is unavailable in this context.`
- Request `/api/shopify/v1/bots` không có header `Authorization`.

Kiểm tra:

- `app/shopify/layout.tsx` có load script `https://cdn.shopify.com/shopifycloud/app-bridge.js`.
- Meta `shopify-api-key` có giá trị đúng `NEXT_PUBLIC_SHOPIFY_CLIENT_ID`.
- URL iframe có query `host`.
- App đang chạy trong Shopify Admin iframe, không phải mở trực tiếp bằng tab browser.

### Backend không decode được token

Dấu hiệu:

- `/api/shopify/v1/bots` trả `401`.
- Message liên quan chữ ký token hoặc Shopify session token.

Kiểm tra:

- `SHOPIFY_CLIENT_SECRET` đúng với app đang cài trên development store.
- `NEXT_PUBLIC_SHOPIFY_CLIENT_ID` đúng app.
- Development store đang mở đúng app/version.
- Token chưa hết hạn. Shopify ID token sống ngắn, nên không copy token cũ để test lâu dài.

### Supabase không trả user

Dấu hiệu:

- `/api/shopify/v1/bots` trả `Merchant organization not found inside Supabase`.

Kiểm tra:

- Shop domain trong token là domain `.myshopify.com`.
- Supabase Auth user email đúng format `shopify+<shop-domain>@vielora.local`.
- Email đang lowercase.
- `SUPABASE_SERVICE_ROLE_KEY` đúng project.

### API trả bots rỗng

Dấu hiệu:

- Response `success: true`, `data: []`.
- Dashboard hiển thị `Chưa tìm thấy Chatbot`.

Kiểm tra:

- Bảng `bots` có row với `user_id` đúng Supabase Auth user ID.
- Bot row có `id`, `name`, `status`.
- Đang test đúng Supabase project tương ứng với env đang deploy.

## Tiêu Chí Pass Cuối Cùng

Đánh dấu pass khi tất cả điều kiện sau đúng:

- `/shopify/dashboard` chạy trong iframe Shopify Admin.
- Không có popup hoặc tab mới trong luồng dashboard native.
- Request `/api/shopify/v1/bots` có `Authorization: Bearer <token>`.
- Response API là `200` với danh sách bot hoặc empty list hợp lệ.
- UI hiển thị đúng số lượng bot hoặc empty state.
- Test lỗi thiếu token trả `401`.
- Console không có lỗi App Bridge, CORS, hoặc iframe redirect loop.
