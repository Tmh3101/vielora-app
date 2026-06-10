# Báo Cáo Kiến Trúc Kỹ Thuật: Luồng Giao Tiếp Mô Hình Hybrid App (Shopify + Supabase Auth)

## 1. Tổng Quan Vấn Đề & Động Lực Chuyển Đổi

Hệ thống SaaS **Vielora** hiện tại đang tích hợp với Shopify dưới dạng **Embedded App toàn phần** (`embedded = true`). Mô hình cũ cố gắng tải toàn bộ giao diện điều khiển cấu hình AI và RAG Chatbot đồ sộ vào bên trong Iframe của trang quản trị Shopify Admin (`admin.shopify.com`).

### Điểm Nghẽn Kỹ Thuật (Friction Points):

1. **Chặn Cookie Bên Thứ Ba (Third-Party Cookie Restriction):** Các trình duyệt hiện đại (Chrome, Safari, Brave) áp dụng chính sách `SameSite=Lax/Strict` nghiêm ngặt. Khi website Vielora chạy ẩn dưới dạng Iframe của Shopify, mọi cookie xác thực phát hành từ tên miền của Vielora (hoặc đường hầm ngrok `*.ngrok-free.dev`) đều bị trình duyệt chặn hoàn toàn.
2. **Vòng Lặp Chuyển Hướng Vô Hạn (Infinite 302 Redirect Loops):** Do cookie bị chặn, Middleware của Supabase không thể tìm thấy hoặc làm mới (refresh) JWT Token từ trình duyệt. Hệ thống coi Merchant là "chưa đăng nhập" và kích hoạt lệnh điều hướng `302` về trang `/auth` hoặc `/api/shopify/auth`.
3. **Lỗi Trắng Trang Bảo Mật (`X-Frame-Options: deny`):** Khi lệnh redirect đưa Merchant về trang đăng nhập của Shopify (`accounts.shopify.com`) ngay trong lòng Iframe, Shopify sẽ chặn đứng request này vì họ cấm nhúng trang đăng nhập vào Iframe để chống tấn công Clickjacking. Kết quả là giao diện ứng dụng bị sập hoàn toàn (màn hình trắng kèm lỗi Console).

### Giải Pháp: Kiến Trúc Hybrid App (Mô Hình Lai)

Chúng ta tách biệt ứng dụng Vielora thành hai không gian hoạt động bổ trợ cho nhau:

- **Không Gian 1 (Trong Iframe - Nhúng Tĩnh):** Tải một trang tĩnh nhẹ (`/shopify/dashboard`), không dùng Cookie, không check session Supabase. Trang này chỉ khởi tạo Shopify App Bridge v4 để lấy **Mã xác thực ngắn hạn (Session Token/JWT)** trực tiếp từ cửa sổ mẹ của Shopify Admin.
- **Không Gian 2 (Tab Mới - SaaS Độc Lập):** Dùng nút bấm để mở cửa sổ trình duyệt mới, truyền theo Session Token để xử lý đăng nhập ngầm qua API SSO (`/api/shopify/sso`). Luồng này hoạt động dưới ngữ cảnh **Bên thứ nhất (First-Party Context)**, giúp phục hồi 100% sức mạnh hệ thống Auth Cookie của Supabase.

---

## 2. Bản Đồ Phân Rã Luồng Giao Tiếp Hệ Thống (Step-by-Step)

Luồng vận hành mới của kiến trúc Hybrid tuân thủ quy trình bảo mật nghiêm ngặt gồm 5 bước chính dưới đây:

### Bước 2.1: Merchant Click Mở Ứng Dụng (Mở Không Gian 1)

- **Hành động:** Trong trang quản trị Shopify Admin, Merchant click vào menu ứng dụng "Vielora Chatbot".
- **Giao tiếp:** Shopify Admin gửi một request `GET` đến URL của ứng dụng đã cấu hình trong đối tượng ứng dụng Đối tác.
- **Thay đổi quan trọng:** URL này trỏ trực tiếp về trang tĩnh `/shopify/dashboard?shop=...&host=...` thay vì chạy luồng OAuth tự động ngầm `/api/shopify/auth` như trước đây để tránh làm nghẽn luồng Iframe.
- **Xử lý tại Middleware (`middleware.ts`):** Hệ thống phát hiện route này thuộc Scope `/shopify/*`, lập tức bypass qua lớp kiểm tra Session Supabase Auth thông thường để tránh trả về lệnh redirect `302`.

### Bước 2.2: Khởi Tạo Bắt Tay Shopify App Bridge v4

- **Hành động:** Trình duyệt render trang tĩnh `/shopify/dashboard`.
- **Giao tiếp:** Mã nguồn client sử dụng thẻ `<Script src="https://cdn.shopify.com/shopifycloud/app-bridge.js">` để kích hoạt giao tiếp JavaScript native qua cơ chế `postMessage` với cửa sổ mẹ `admin.shopify.com`.
- **Dữ liệu truyền tải:** Thư viện App Bridge đọc tham số mã hóa `host` trên URL để định danh môi trường Shopify Admin của Merchant và liên kết thành công cửa sổ Iframe. Giao diện hiển thị trạng thái: _"Kết nối Vielora AI thành công với cửa hàng {shop}"_.

### Bước 2.3: Phát Hành Vé Thông Hành (Session Token Protocol)

- **Hành động:** Merchant click vào nút hành động chính (Call to Action) dạng `<SSOButton />` với tiêu đề: _"Mở không gian quản trị Vielora"_.
- **Mã nguồn kích hoạt:** ```

````text?code_stdout&code_event_index=2
File successfully generated.

```typescript
  const token = await window.shopify.idToken();

````

- **Bảo mật ngầm:** Không qua mạng Internet, App Bridge gửi tín hiệu trực tiếp đến trang mẹ Shopify Admin đòi cấp quyền. Shopify kiểm tra phiên làm việc của Merchant, đóng gói thông tin định danh của cửa hàng thành một chuỗi mã hóa **JWT (JSON Web Token)** ngắn hạn (Hạn sống 1 phút) được ký bằng chữ ký mật mã ứng với `SHOPIFY_CLIENT_SECRET`. Chuỗi JWT này được hoàn trả lại cho mã JS của nút bấm Client-side.

### Bước 2.4: Thoát Khỏi Iframe & Kích Hoạt API SSO

- **Hành động:** Ngay sau khi nhận chuỗi JWT thành công, nút bấm kích hoạt lệnh mở một Tab mới độc lập hoàn toàn với Shopify Admin.
- **Giao tiếp URL:** ```typescript
window.open(`/api/shopify/sso?token=${token}`, '\_blank');

```

```

- **Ý nghĩa chuyển đổi ngữ cảnh:** Tab mới mở ra thuộc tên miền riêng của hệ thống Vielora (`app.vielora.vn` hoặc `*.ngrok-free.dev`). Trình duyệt gắn nhãn cho tab này là **Bên thứ nhất (First-Party Context)**. Mọi rào cản chặn Cookie hoàn toàn bị dỡ bỏ.

### Bước 2.5: Xác Thực Ngầm & Cấp Quyền Supabase Cookie (Mở Không Gian 2)

- **Hành động:** Tab mới gửi request đến API xử lý Backend `/api/shopify/sso`.
- **Xử lý ngầm tại Server Next.js (`app/api/shopify/sso/route.ts`):**

1. **Giải Mã Mã Độc:** Server lấy tham số `token` trên URL, gọi hàm của thư viện Shopify để xác thực chữ ký: `const payload = await shopify.session.decodeSessionToken(token);`.
2. **Trích Xuất Danh Tính:** Trích xuất ra tên miền cửa hàng chính chủ từ payload: `const shopDomain = payload.dest.replace("https://", "");`. Bước này tuyệt đối an toàn vì chỉ có Shopify và Server Vielora nắm giữ Khóa bí mật Client Secret để giải mã chuỗi JWT này.
3. **Đăng Nhập/Đăng Ký Ngầm (Auto-Provisioning):** Server khởi tạo Supabase Client. Nó thực hiện phương pháp tối ưu hiệu năng (Optimistic Auth Check): Thử đăng nhập luôn bằng email định danh của shop (Ví dụ: `shopify.vielora-test-store@vielora.vn`). Nếu thất bại do tài khoản chưa tồn tại, Server dùng hàm Admin `supabase.auth.admin.createUser()` để tạo tài khoản mới ngầm với mật khẩu ngẫu nhiên phức tạp, rồi liên kết thông tin `shopDomain` vào siêu dữ liệu (Metadata) người dùng.
4. **Bơm Cookie Hợp Lệ (Set-Cookie Injection):** Sau khi xác định tài khoản, Server gọi lệnh:

```typescript
await supabase.auth.signInWithPassword({ email, password });
```

Hàm này chạy trên Server Next.js thông qua tiện ích `lib/supabase/server.ts`, tự động đính kèm các trường HTTP Header `Set-Cookie` chứa token đăng nhập của Supabase vào Response trả về. Trình duyệt nhận response, chấp nhận lưu trữ các cookie này vào bộ nhớ của tab Vielora một cách thuận lợi.

- **Chuyển Hướng Cuối Cùng (Safe Landing):** API kết thúc bằng việc trả về lệnh điều hướng: `NextResponse.redirect(new URL("/dashboard", request.url))`. Trình duyệt chuyển sang màn hình Dashboard chính thống. Lúc này, Middleware quét thấy Cookie Supabase hợp lệ, cho phép Merchant truy cập toàn bộ các chức năng cấu hình RAG nâng cao mà không đòi hỏi nhập bất kỳ mật khẩu nào.

---

## 3. Bản Đồ Phân Bộ File Cần Sửa Đổi (File System Mapping)

Để hiện thực hóa luồng giao tiếp trên, kiến trúc mã nguồn của Vielora cần điều chỉnh chính xác tại các tệp tin sau:

| Đường Dẫn Tệp Tin                   | Trách Nhiệm Trong Kiến Trúc Mới                                                                                                                                                                                     | Hành Động               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `middleware.ts`                     | Bỏ chặn (Bypass) cho các URL chứa tiền tố `/shopify/*` và `/api/shopify/*` để không bị chuyển hướng `302` quay về trang login mặc định của SaaS khi đang ở trong Iframe.                                            | Chỉnh sửa logic         |
| `components/shopify/SSOButton.tsx`  | Nút bấm Client-side nằm trong Iframe. Chịu trách nhiệm gọi `window.shopify.idToken()` để xin mã JWT từ Shopify và mở Tab mới trỏ về endpoint `/api/shopify/sso`.                                                    | Tạo mới                 |
| `app/shopify/dashboard/page.tsx`    | Loại bỏ component `<DashboardClient />` cũ. Biến trang này thành giao diện tĩnh nhẹ nhàng, bọc trong `<AppBridgeProvider>` để hiển thị lời chào Merchant và chứa nút `<SSOButton />`.                               | Tái cấu trúc (Refactor) |
| `app/api/shopify/sso/route.ts`      | Điểm tiếp nhận request từ Tab mới. Xử lý giải mã Token qua thư viện Shopify, thực hiện logic Auto-Login/Register bằng Supabase Auth Server Client và Redirect về `/dashboard`.                                      | Tạo mới                 |
| `app/api/shopify/callback/route.ts` | Điểm cuối của luồng cài đặt OAuth ban đầu. Thay vì redirect về trang quản trị Shopify chung chung gây lỗi vòng lặp, sửa lại để redirect về chính diện URL trang nhúng tĩnh: `/shopify/dashboard?shop=...&host=...`. | Chỉnh sửa logic         |

---

## 4. Kịch Bản Kiểm Thử & Theo Dõi Luồng Ngầm (Manual QA & Ngrok Telemetry)

### 4.1. Quan Sát Nhật Ký Mạng Qua Ngrok (Localhost:4040)

Khi chạy thử nghiệm ứng dụng qua đường hầm Ngrok, bạn mở trình duyệt truy cập vào `http://127.0.0.1:4040` để giám sát các mã trạng thái HTTP (Status Code) truyền từ Shopify:

- **Trạng thái lỗi (Cũ):** Xuất hiện chuỗi liên tiếp các dòng `GET /shopify/dashboard` trả về mã `302`, theo sau là `GET /auth` trả về mã `302`, lặp đi lặp lại. Điều này thể hiện Middleware đang bị kẹt vòng lặp chuyển hướng.
- **Trạng thái chuẩn (Mới):** 1. `GET /shopify/dashboard?...` phải trả về mã trạng thái `200 OK` (Tải thành công trang tĩnh trong Iframe).

2. Khi click nút SSO, terminal Next.js hoặc log ngrok xuất hiện dòng request đơn lẻ: `GET /api/shopify/sso?token=...` trả về mã trạng thái `307 Temporary Redirect` hoặc `302`.
3. Liền sau đó là request truy cập Dashboard SaaS: `GET /dashboard` trả về mã trạng thái `200 OK` tại Tab mới.

### 4.2. Các Bước Kiểm Thử Thực Tế Bằng Tay

1. **Bước 1 (Kiểm tra luồng OAuth):** Thực hiện gỡ ứng dụng khỏi Shopify Development Store cũ, sau đó bấm "Cài đặt" lại ứng dụng từ trang cấu hình Đối tác. Xác nhận xem sau khi cài đặt, hệ thống có đưa màn hình Iframe dừng lại an toàn ở giao diện tĩnh `/shopify/dashboard` hay không (Không được xuất hiện lỗi `X-Frame-Options: deny`).
2. **Bước 2 (Kiểm tra Sinh Token):** Nhấn `F12` mở Console của trình duyệt tại Iframe Shopify Admin. Bấm nút "Mở không gian quản trị Vielora". Xác nhận Console in ra dòng log chứa chuỗi Token JWT (Chứng tỏ App Bridge v4 hoạt động và xin vé thành công).
3. **Bước 3 (Kiểm tra Đồng bộ Auth):** Quan sát Tab mới vừa bật lên. Merchant phải được đưa thẳng vào giao diện Bảng điều khiển Chatbot mà không bị chặn lại bởi màn hình bắt điền Email/Mật khẩu của hệ thống SaaS Vielora. Vào Supabase Dashboard mục Authentication, kiểm tra xem một User ngầm định danh dạng `shopify.[ten-shop]@vielora.vn` đã được tự động khởi tạo thành công hay chưa.
