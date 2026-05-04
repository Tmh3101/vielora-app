# Vielora — Supabase Setup Runbook

> Tài liệu này hướng dẫn từng bước cấu hình Supabase cho môi trường production.
> Thực hiện theo đúng thứ tự. Bỏ qua bất kỳ bước nào cũng có thể dẫn đến lỗi runtime.

---

## Tổng quan

Vielora phụ thuộc vào Supabase cho 4 vai trò cốt lõi:

| Vai trò             | Chi tiết                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------ |
| **Authentication**  | Quản lý đăng ký, đăng nhập, OAuth, và session người dùng                                   |
| **Vector Database** | PostgreSQL + extension `pgvector` để lưu trữ và tìm kiếm embeddings (RAG pipeline)         |
| **Storage**         | Lưu trữ avatar chatbot (`bot-avatars` bucket)                                              |
| **Financial State** | Quản lý `subscriptions`, `wallets`, `payments`, `credit_transactions` toàn bộ qua Supabase |

Toàn bộ trạng thái tài chính và dữ liệu người dùng được bảo vệ bởi **Row Level Security (RLS)** kích hoạt trên 100% các bảng.

---

## Bước 1: Khởi tạo Project và Extensions

1. Truy cập [supabase.com](https://supabase.com/) và tạo một project mới.
2. Chọn region gần nhất với người dùng cuối để giảm latency.
3. Ghi lại **Database Password** — sẽ cần khi cấu hình kết nối trực tiếp (nếu cần).

---

## Bước 2: Thực thi Database Schema

**File:** `supabase/db-schema.sql`

Sao chép toàn bộ nội dung file `supabase/db-schema.sql` và dán vào **SQL Editor**, sau đó nhấn **Run**.

### Script này thực hiện

**Tạo Enums:**

- `bot_status`, `page_status`, `page_error_type`
- `pricing_plan`, `billing_cycle`, `payment_status`, `payment_type`, `transaction_type`, `job_status`

**Tạo các bảng cốt lõi (theo thứ tự phụ thuộc):**

| Bảng                         | Mô tả                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `plans`                      | Định nghĩa các gói dịch vụ (`free`, `standard`, `pro`) kèm giá tiền JSONB    |
| `bots`                       | Chatbot của người dùng, bao gồm domain, widget settings, và trạng thái crawl |
| `pages`                      | Các trang được crawl/index theo lifecycle `pending → completed/failed`       |
| `documents`                  | Chunks văn bản kèm vector embedding `vector(768)` cho RAG                    |
| `conversations` / `messages` | Lịch sử hội thoại của widget                                                 |
| `usage_logs`                 | Ghi nhận lượt chat theo visitor và IP để rate limiting                       |
| `subscriptions`              | Gói dịch vụ đang active của mỗi user                                         |
| `wallets`                    | Số dư credits (`subscription_credits` + `payg_credits`)                      |
| `payments`                   | Lịch sử giao dịch thanh toán                                                 |
| `credit_transactions`        | Nhật ký từng lần cộng/trừ credits                                            |
| `jobs`                       | Theo dõi trạng thái BullMQ jobs trong database                               |

**Tạo Indexes:**

- `HNSW (vector_cosine_ops)` trên cột `embedding` của bảng `documents` — tối ưu cho Approximate Nearest Neighbor search
- `GIN` trên cột `fts` (full-text search) của bảng `documents`
- Các B-tree index hỗ trợ rate limiting và truy vấn billing

**Kích hoạt Row Level Security (RLS):**

RLS được bật trên **tất cả** các bảng. Cấu trúc phân quyền:

- **`plans`**: Public read-only — bất kỳ client nào cũng có thể đọc danh sách gói
- **`bots`, `pages`, `documents`, `jobs`**: Chỉ chủ sở hữu bot mới được CRUD
- **`subscriptions`, `wallets`, `payments`, `credit_transactions`**: Chỉ read từ client — mọi thao tác ghi phải qua `service_role` key (backend/workers)
- **`messages`**: Truy cập qua chain `conversation → bot → user_id`

> **Quan trọng:** Không disable RLS trên bất kỳ bảng nào. Toàn bộ ghi dữ liệu nhạy cảm (billing, credits) được thực hiện qua `createAdminClient()` với `service_role` key ở phía server.

**Trigger Tự động Provisioning (`handle_new_user_billing`):**

Khi một user mới đăng ký, trigger `on_auth_user_created_billing` trên `auth.users` sẽ tự động:

1. Tạo bản ghi `subscriptions` với gói **Free**, `current_period_end` và `next_credit_reset_at` đặt sau 1 tháng
2. Tạo bản ghi `wallets` với số dư ban đầu bằng `monthly_credits` của gói Free
3. Ghi entry đầu tiên vào `credit_transactions` loại `subscription_renewal`

Không cần code ứng dụng nào xử lý bước provisioning này — toàn bộ được thực hiện tại tầng database.

---

## Bước 3: Cấu hình Storage

**File:** `supabase/init-storage.sql`

Sao chép toàn bộ nội dung file `supabase/init-storage.sql` và chạy trong **SQL Editor**.

### Script này thực hiện

- Tạo bucket **`bot-avatars`** với cấu hình:
  - **Public**: Bất kỳ ai cũng có thể đọc URL ảnh (cần thiết để hiển thị avatar trong widget)
  - **Giới hạn kích thước**: 2 MB mỗi file
  - **Định dạng được phép**: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Tạo các RLS policy cho Storage:
  - Authenticated users được **upload** và **update** avatars
  - Authenticated users được **xóa** avatars
  - Public được **đọc** (SELECT) tất cả objects trong bucket

---

## Bước 4: Thiết lập Hàm Tìm kiếm RAG

**File:** `supabase/hybrid-search-function.sql`

Sao chép toàn bộ nội dung file `supabase/hybrid-search-function.sql` và chạy trong **SQL Editor**.

### Script này thực hiện

Tạo RPC function `public.hybrid_search(...)` được gọi bởi API widget tại mỗi lượt chat.

Function kết hợp hai phương pháp tìm kiếm qua **Reciprocal Rank Fusion (RRF, k=60)**:

- **Full-text Search (BM25)**: Dùng `plainto_tsquery('simple', ...)` trên cột `fts` (GIN-indexed)
- **Semantic Search**: Tìm kiếm vector cosine similarity trên cột `embedding` (HNSW-indexed)

Điểm cuối cùng của mỗi document:

```
score(d) = (fts_weight / (60 + rank_fts)) + (semantic_weight / (60 + rank_semantic))
```

Trọng số `fts_weight` và `semantic_weight` được truyền vào từ ứng dụng TypeScript (mặc định: `0.2` và `0.8`). Nếu hybrid search không trả về kết quả, hệ thống fallback sang truy xuất trực tiếp nội dung trang.

> Script bao gồm lệnh `DROP FUNCTION IF EXISTS` để đảm bảo an toàn khi chạy lại sau khi cập nhật.

---

## Bước 5: Cấu hình Authentication

### 5.1 - URL Configuration

Truy cập **Authentication → URL Configuration** trong Supabase Dashboard:

- **Site URL**: Đặt thành giá trị của `NEXT_PUBLIC_APP_URL`
  - Production: `https://your-domain.com`
  - Vercel: `https://your-project.vercel.app`

- **Redirect URLs**: Thêm các URL sau vào whitelist:
  - `https://your-domain.com/auth/callback`
  - `http://localhost:3000/auth/callback` (cho môi trường development)

### 5.2 - Email Templates (Tùy chọn)

Nếu muốn tùy chỉnh email xác nhận và đặt lại mật khẩu, các template mẫu có trong thư mục `docs/email-templates/`. Dán nội dung vào **Authentication → Email Templates** tương ứng.

### 5.3 - OAuth Providers (Tùy chọn)

Để bật đăng nhập Google/GitHub, cấu hình trong **Authentication → Providers** và thêm Client ID/Secret từ provider tương ứng.

---

## Bước 6: Lấy Environment Variables

Truy cập **Project Settings → API** trong Supabase Dashboard và sao chép các giá trị sau vào file `.env` (hoặc `.env.production`):

```env
# Supabase — Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...         # "anon public" key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...             # "service_role" key — TUYỆT ĐỐI KHÔNG EXPOSE RA CLIENT
```

**Lưu ý bảo mật:**

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Có thể expose ra browser — được bảo vệ bởi RLS.
- `SUPABASE_SERVICE_ROLE_KEY`: **Bí mật tuyệt đối.** Chỉ dùng ở server-side (`createAdminClient()`). Key này bypass toàn bộ RLS — không bao giờ dùng trong Client Components hoặc public bundle.

---

## Kiểm tra

Sau khi hoàn thành tất cả các bước, xác nhận setup bằng cách:

1. Khởi động ứng dụng (`npm run dev` hoặc `./scripts/deploy.sh monolith`)
2. Đăng ký một tài khoản mới
3. Kiểm tra trong Supabase Dashboard → **Table Editor**:
   - Bảng `subscriptions`: Phải có 1 bản ghi với `plan_id` trỏ đến gói Free
   - Bảng `wallets`: Phải có 1 bản ghi với `subscription_credits > 0`
   - Bảng `credit_transactions`: Phải có 1 bản ghi loại `subscription_renewal`

Nếu 3 bảng trên được tạo tự động sau đăng ký, trigger `handle_new_user_billing` đang hoạt động đúng.
