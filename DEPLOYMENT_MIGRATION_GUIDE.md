# Hướng dẫn Migration: Staging → Production (vielora-prod)

## Thông tin

| Item | Value |
|------|-------|
| Production Project | `vielora-prod` (`gckcimbcyztzswkqainp`) |
| Organization | Titops DX4U (`nxrkhjkxetdjvesqsnfr`) |
| Staging Project | `velora-staging` (`cykshrevwqfcduuqrreu`) |
| Organization | Velora (`tdfrrvfdsdezwktrrvvw`) |
| Date | 2026-06-17 |

## Tổng quan sự khác biệt

Sau khi kiểm tra, production đang thiếu các thay đổi so với local (đã sync từ staging):

### 1. Bảng mới cần tạo

| Bảng | Mô tả |
|------|-------|
| `categories` | Danh mục blog |
| `posts` | Bài viết blog |
| `post_categories` | Liên kết bài viết ↔ danh mục |
| `shopify_sessions_migrations` | Track migration cho Shopify sessions |
| `shopify_sessions` | Session OAuth Shopify |

### 2. Cột mới

| Bảng | Cột | Kiểu |
|------|-----|------|
| `bots` | `allowed_domains` | `text[] NOT NULL DEFAULT '{}'` |

### 3. Function mới / cập nhật

| Function | Loại |
|----------|------|
| `get_user_id_by_email(text)` | **MỚI** - Tra cứu user ID bằng email |
| `hybrid_search(...)` | **CẬP NHẬT** - Thêm `source_type`, `resolved_url` vào kết quả |

### 4. RLS Policies mới

| Policy | Bảng |
|--------|------|
| `bots_select_public_pwa_branding` | `bots` (cho phép anon đọc public bot) |
| Blog policies (6 policies) | `categories`, `posts`, `post_categories` |
| Shopify policies (2 policies) | `shopify_sessions_migrations`, `shopify_sessions` |

### 5. Storage mới

| Bucket | Loại |
|--------|------|
| `thumbnails` | Public bucket cho ảnh thumbnail blog |

### 6. Dọn dẹp

| Hành động | Chi tiết |
|-----------|----------|
| Xoá policy dư thừa | `credit_packages_select_active` (trùng với policy đã có) |

### 7. Thông tin migration khác

- `ensure_rls` event trigger **đã tồn tại** trên production
- Hầu hết indexes **đã tồn tại** trên production
- `send_ticket_notification` trigger **đã tồn tại** với URL production (`https://admin-portal.vielora.vn/...`)

## Các bước thực hiện

### Bước 1: Backup database

Truy cập **Supabase Dashboard → Production (`vielora-prod`) → Database → Backups** và tạo bản backup trước khi chạy migration.

Hoặc dùng `pg_dump`:

```bash
pg_dump --host=db.gckcimbcyztzswkqainp.supabase.co \
        --port=5432 \
        --username=postgres \
        --dbname=postgres \
        --format=custom \
        --file=./backup_production_20260617.dump
```

### Bước 2: Chạy migration file

**Cách 1: Supabase SQL Editor**

1. Vào Supabase Dashboard → Production → **SQL Editor**
2. Mở file `supabase/migrations/20260617_deploy_production_migration.sql`
3. Copy nội dung và paste vào SQL Editor
4. Chạy (đảm bảo tất cả đều thành công)

**Cách 2: psql**

```bash
psql "postgresql://postgres:[PASSWORD]@db.gckcimbcyztzswkqainp.supabase.co:5432/postgres" \
  -f supabase/migrations/20260617_deploy_production_migration.sql
```

### Bước 3: (Tùy chọn) Chạy migration sync từ staging

Sau khi migration chính hoàn tất, bạn có thể chạy thêm file sync nếu muốn đồng bộ trigger notification:

**Cách 1: Supabase SQL Editor** - Mở và chạy `supabase/migrations/20260617_sync_changes_from_staging.sql`

**Cách 2: psql**

```bash
psql "postgresql://postgres:[PASSWORD]@db.gckcimbcyztzswkqainp.supabase.co:5432/postgres" \
  -f supabase/migrations/20260617_sync_changes_from_staging.sql
```

> **Lưu ý:** `get_user_id_by_email` đã có trong file migration chính. File sync này chỉ chứa `send_ticket_notification` trigger dùng URL production (`admin-portal.vielora.vn`). Nếu trigger đã tồn tại với URL đúng thì không cần chạy file này.

### Bước 4: Kiểm tra và xác nhận

Chạy các câu query sau để verify:

```sql
-- Kiểm tra bảng mới
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('categories','posts','post_categories','shopify_sessions','shopify_sessions_migrations');

-- Kiểm tra cột mới trên bots
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'bots' AND column_name = 'allowed_domains';

-- Kiểm tra policies blog
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('categories','posts','post_categories');

-- Kiểm tra bots PWA policy
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'bots' AND policyname = 'bots_select_public_pwa_branding';

-- Kiểm tra thumbnails bucket
SELECT id, name, public FROM storage.buckets WHERE id = 'thumbnails';

-- Kiểm tra functions
SELECT proname FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('get_user_id_by_email', 'hybrid_search')
ORDER BY proname;
```

### Bước 5: Kiểm tra ứng dụng

Sau khi migration thành công:

1. Deploy code mới nhất lên production (bao gồm các tính năng blog, Shopify, etc.)
2. Kiểm tra chức năng:
   - Blog hoạt động (tạo post, xem categories)
   - Bot PWA public hoạt động
   - Allowed domains trên bot settings
   - Widget vẫn hoạt động bình thường
3. Kiểm tra logs trên Supabase để phát hiện lỗi

### Rollback

Nếu cần rollback, khôi phục từ backup đã tạo ở Bước 1:

1. Supabase Dashboard → Production → Database → Backups → Chọn backup và Restore
2. Hoặc dùng `pg_restore`:

```bash
pg_restore --host=db.gckcimbcyztzswkqainp.supabase.co \
           --port=5432 \
           --username=postgres \
           --dbname=postgres \
           --clean \
           --if-exists \
           ./backup_production_20260617.dump
```

## Tóm tắt các file migration

| File | Mô tả |
|------|-------|
| `supabase/migrations/20260617_deploy_production_migration.sql` | **File chính** - Tạo bảng mới, cập nhật functions, RLS, storage |
| `supabase/migrations/20260617_sync_changes_from_staging.sql` | **File bổ sung** - Function & trigger đã sync từ staging |
