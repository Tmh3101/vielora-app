# Kế Hoạch Triển Khai Chi Tiết: Tính Năng Tạo Bot Hàng Loạt qua CSV (Bulk Bot Creation - Track A)

> **Mục tiêu**: Xây dựng tính năng cho phép chọn "Import file CSV" từ Dropdown tại Dashboard, chuyển sang luồng Onboarding 4 bước để khởi tạo hàng loạt Bot với cấu hình chung và nạp kiến thức khởi tạo tự động.
> **Nhánh Git**: `feat/bulk-bot-creation`  
> **Tài liệu tham chiếu**: [docs/specs/bulk-bot-creation.md](file:///home/hieutm/Work/Titops/Vielora/vielora/docs/specs/bulk-bot-creation.md)

---

## 📅 Giai Đoạn 0: Chuẩn Bị Assets & Khai Báo Hằng Số (Preparation)

### Task 0.1: Tạo Asset File CSV Mẫu Tải Về

- **Mục tiêu**: Cung cấp file CSV chuẩn cho người dùng tải xuống ở Bước 1.
- **Tệp cần tạo**: `public/templates/bulk-bot-import-template.csv`
- **Nội dung tệp**:
  ```csv
  name,slug,knowledge_title,knowledge_content
  Bot Trợ Lý Toán 10,bot-toan-10,Đề cương Toán 10,Công thức lượng giác và hình học không gian...
  Bot Lý 11 Chuyên,bot-ly-11-chuyen,Nội dung Vật Lý 11,Các định luật nhiệt động lực học và điện từ...
  ```
- **Kiểm tra**: Có thể tải được từ URL `/templates/bulk-bot-import-template.csv`.

### Task 0.2: Tạo File Hằng Số Giới Hạn (`lib/constants/bulk-import.ts`)

- **Mục tiêu**: Lưu trữ các giới hạn và cấu hình cho Bulk Import.
- **Tệp cần tạo**: `lib/constants/bulk-import.ts`
- **Nội dung**:
  ```typescript
  export const BULK_IMPORT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  export const BULK_IMPORT_ALLOWED_EXTENSIONS = [".csv"];
  export const BULK_IMPORT_SUB_BATCH_SIZE = 15; // 15 bots per sub-batch request for real-time progress
  export const BULK_IMPORT_REQUIRED_COLUMNS = [
    "name",
    "slug",
    "knowledge_title",
    "knowledge_content",
  ] as const;
  ```

---

## 🛠️ Giai Đoạn 1: Xây Dựng Core Services Phía Backend

### Task 1.1: Xây Dựng `lib/services/bulk-bot.service.ts`

- **Mục tiêu**: Xử lý logic nghiệp vụ chính gồm Parse CSV, Validate dòng, Dedupe Slug, và Tạo Bot hàng loạt trong DB Transaction.
- **Tệp cần tạo**: `lib/services/bulk-bot.service.ts`
- **Các hàm cần triển khai**:
  1. `parseCSVString(csvText: string)`: Parse chuỗi CSV, tự động trim khoảng trắng và hỗ trợ UTF-8 BOM.
  2. `validateBulkRows(rows: RawRow[])`: Kiểm tra 4 cột bắt buộc (`name`, `slug`, `knowledge_title`, `knowledge_content`), validate độ dài và regex slug.
  3. `generateUniqueSlugs(rows: ValidatedRow[], client: ServiceClient)`: Kiểm tra trùng lặp slug nội bộ trong batch và trong Database (`bots.slug`).
  4. `createBotsBulk(client, { workspaceId, ownerId, template, rows })`:
     - Khóa dòng workspace bằng `SELECT ... FOR UPDATE`.
     - Kiểm tra lại Quota khả dụng (`botsLimit - currentCount`).
     - Thực hiện SQL Multi-row Insert tạo N bots (`domain = 'manual-upload.local'`, `widget_settings.primaryColor`, `is_public`).
     - Insert liên kết kỹ năng vào bảng `bot_skills`.
     - Insert trang kiến thức vào bảng `pages` (`source_type = 'manual_text'`, `url = 'manual://{uuid}'`).
     - Đẩy job embedding vào BullMQ Queue bằng `addIndexerJob({ botId, pageId })`.
     - Trừ credit workspace bằng `deductWorkspaceCredits`.

### Task 1.2: Viết Unit Test Cho Service (`__tests__/unit/bulk-bot.service.test.ts`)

- **Tệp cần tạo**: `__tests__/unit/bulk-bot.service.test.ts`
- **Nội dung kiểm thử**:
  - Test parse CSV hợp lệ & không hợp lệ.
  - Test validate dòng thiếu tên hoặc slug sai regex.
  - Test dedupe slug bị trùng.

---

## 🚀 Giai Đoạn 2: Xây Dựng API Route Endpoint

### Task 2.1: Xây Dựng `app/api/bots/bulk-create/route.ts`

- **Mục tiêu**: Cung cấp API endpoint phục vụ `mode: "dry-run"` và `mode: "create"`.
- **Tệp cần tạo**: `app/api/bots/bulk-create/route.ts`
- **Các bước xử lý**:
  1. Xác thực người dùng bằng `createAdminClient` / Auth Session.
  2. Xác minh quyền `owner` / `admin` của caller đối với `workspaceId` qua bảng `workspace_members`.
  3. Nếu `mode === "dry-run"`:
     - Chạy `validateBulkRows` + `generateUniqueSlugs`.
     - Lấy Quota qua `getEffectiveEntitlements(client, workspaceId)`.
     - Tính tổng Credits cần dùng (`knowledgeRows × CREDIT_PER_PAGE`).
     - Trả về `blocked: true/false`, Quota Summary và danh sách kết quả xem trước từng dòng.
  4. Nếu `mode === "create"`:
     - Thực hiện `createBotsBulk`.
     - Trả về danh sách kết quả bot đã khởi tạo kèm `jobId`.

---

## 🎨 Giai Đoạn 3: Nút Bấm Entry Point Trên Dashboard Header

### Task 3.1: Cập Nhật `components/dashboard/overview/DashboardClient.tsx`

- **Mục tiêu**: Chuyển đổi nút "Tạo bot mới" thành **Split Button Dropdown**.
- **Tệp chỉnh sửa**: `components/dashboard/overview/DashboardClient.tsx`
- **Chi tiết giao diện**:
  - Nút bấm chính: **"Tạo bot mới"** -> Click trực tiếp navigate tới `/onboarding` (Luồng tạo đơn lẻ).
  - Nút mũi tên Chevron bên phải -> Mở `DropdownMenu`:
    - Option 1: `Tạo bot đơn lẻ` (Navigate `/onboarding`)
    - Option 2: `Import file CSV` (Icon Upload, Navigate `/onboarding?mode=bulk`)
- **Phân quyền**: Menu Dropdown chỉ hiển thị nếu người dùng có vai trò `owner` hoặc `admin`.

---

## 🧙‍♂️ Giai Đoạn 4: Luồng Onboarding Wizard 4 Bước (`/onboarding?mode=bulk`)

### Task 4.1: Cập Nhật Zustand Store (`store/useOnboardingStore.ts`)

- **Tệp chỉnh sửa**: `store/useOnboardingStore.ts`
- **Bổ sung State**:
  - `isBulkMode: boolean`
  - `bulkRows: BulkParsedRow[]`
  - `bulkConfig: { primaryColor: string; isPublic: boolean; personalityId?: string; skillIds: string[] }`
  - `bulkProgress: { current: number; total: number; currentBotName: string }`

### Task 4.2: Cập Nhật Component Chính (`components/onboarding/OnboardingWizard.tsx`)

- **Tệp chỉnh sửa**: `components/onboarding/OnboardingWizard.tsx`
- **Xử lý**: Đọc Query Param `mode` từ `useSearchParams()`. Nếu `mode === "bulk"`, hiển thị bộ 4 bước Bulk Wizard thay cho wizard cũ.

### Task 4.3: Xây Dựng Step 1 (`components/onboarding/bulk-steps/Step1CSVUpload.tsx`)

- **Tệp cần tạo**: `components/onboarding/bulk-steps/Step1CSVUpload.tsx`
- **Chức năng**:
  - Màn hình hướng dẫn định dạng CSV + Nút [Tải file mẫu CSV].
  - Khung Drag & Drop upload file `.csv` (≤ 10MB).
  - Parse client-side và hiển thị bảng tóm tắt kết quả kiểm tra (Số dòng hợp lệ / Số dòng lỗi).
  - Nút "Tiếp tục sang Bước 2".

### Task 4.4: Xây Dựng Step 2 (`components/onboarding/bulk-steps/Step2GlobalConfig.tsx`)

- **Tệp cần tạo**: `components/onboarding/bulk-steps/Step2GlobalConfig.tsx`
- **Chức năng**:
  - Cấu hình dùng chung:
    - Color Picker cho `primaryColor`.
    - Switch Toggle cho `isPublic` (Công khai / Riêng tư).
    - Dropdown chọn `personality`.
    - Multi-select chọn `skills`.
  - Bảng xem trước dữ liệu (Preview Table) + Thống kê Quota/Credit.
  - Tự động gọi Dry-run API. Nút "Tạo bot ngay" bị vô hiệu hóa nếu `blocked: true`.

### Task 4.5: Xây Dựng Step 3 (`components/onboarding/bulk-steps/Step3RealtimeProgress.tsx`)

- **Tệp cần tạo**: `components/onboarding/bulk-steps/Step3RealtimeProgress.tsx`
- **Chức năng**:
  - Vòng lặp Client Sub-batching (mỗi batch 15 bots): Gọi API `POST /api/bots/bulk-create` với `mode: "create"`.
  - Hiển thị thanh Progress bar (%) động và live text `Đang tạo bot X/N...`.
  - Tự động chuyển tiếp sang Step 4 khi hoàn tất 100%.

### Task 4.6: Xây Dựng Step 4 (`components/onboarding/bulk-steps/Step4CompletionReport.tsx`)

- **Tệp cần tạo**: `components/onboarding/bulk-steps/Step4CompletionReport.tsx`
- **Chức năng**:
  - Báo cáo tổng kết: Số bot tạo thành công, số bot thất bại.
  - Nút "Chỉ import lại các dòng lỗi".
  - Nút "Về trang Dashboard".

---

## 🧪 Giai Đoạn 5: Kiểm Thử, Rà Soát Lỗi & Hoàn Thiện

### Task 5.1: Kiểm Tra TypeCheck & Linting

- **Lệnh chạy**: `npx tsc --noEmit` và `npx eslint` trên toàn bộ các file mới.

### Task 5.2: Kiểm Thử Tích Hợp (Integration Testing)

- Test tạo 50 bot qua file CSV thực tế.
- Test trường hợp file CSV dính lỗi (thiếu cột, trùng slug, file > 10MB).
- Test vượt Quota workspace.

### Task 5.3: Cập Nhật Tài Liệu Documentation

- Cập nhật README.md về tính năng Bulk Import CSV.

### Task 5.4: Git Commit & Push

- Thực hiện `git add` và `git commit` mã nguồn hoàn chỉnh lên nhánh `feat/bulk-bot-creation`.
