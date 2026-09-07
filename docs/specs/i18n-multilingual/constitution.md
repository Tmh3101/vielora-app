# Constitution — Đa ngôn ngữ (Multilingual) Toàn hệ thống

**Version**: 2.0  
**Date**: 2026-08-30  
**Status**: Ratified  
**Supersedes**: v1.0 (thêm coverage widget chat + mở rộng ngôn ngữ)

---

## 1. Nguyên tắc nền tảng (Core Principles)

### 1.1. Multi-tenant Workspace là trung tâm

- Mọi tính năng đều phải hoạt động trong bối cảnh workspace hiện tại.
- Không hardcode tenant-specific logic (ví dụ: không viết `if (workspace === 'curioo')`).
- Ngôn ngữ giao diện phải tách biệt với dữ liệu nghiệp vụ.

### 1.2. Plan-gating (kiểm soát theo gói cước)

- Tính năng đa ngôn ngữ phải tuân theo kế hoạch đăng ký của workspace:
  - **Free**: Chỉ hỗ trợ tiếng Việt.
  - **Standard, Pro, Enterprise**: Hỗ trợ tiếng Việt + Tiếng Anh + Ả Rập.
- Kiểm soát ở tầng **middleware + API + UI**, không chỉ ở một lớp.

### 1.3. RLS (Row Level Security) — Mặc định deny

- Mọi bảng mới phải có RLS được bật và policy rõ ràng.
- Policy mẫu: `auth.uid() = id` cho SELECT/UPDATE.
- Không cho phép client truy cập trực tiếp vào bảng mà không qua RLS.

### 1.4. Kiến trúc 4 Lớp (Full Coverage)

| Lớp    | Khu vực                                                  | Cơ chế                                              | Lý do                                                    |
| ------ | -------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| **L1** | Public Pages (landing, pricing, legal)                   | **URL Prefix** (`/en/...`, `/vi/...`)               | SEO-friendly, search engines index riêng biệt            |
| **L2** | Dashboard + Auth                                         | **Cookie + DB** (`NEXT_LOCALE` + `profiles.locale`) | Trải nghiệm mượt, không thay đổi URL workspace           |
| **L3** | Widget Chat (widget.js, StandaloneChatUI, GroupChatView) | **Bot-level JSONB** (`widget_settings.ui_language`) | Mỗi bot có ngôn ngữ riêng, tách biệt với platform locale |
| **L4** | Chat routes, API, Shopify                                | **Không áp dụng i18n**                              | URL đã nhúng cứng, thay đổi = phá vỡ khách hàng          |

### 1.5. Tách biệt Platform Locale vs Widget Locale

- **Platform Locale (L1 + L2)**: Ngôn ngữ giao diện nền tảng (dashboard, public pages)
  - Được điều khiển bởi user preference (cookie + DB)
  - Áp dụng cho toàn bộ workspace
- **Widget Locale (L3)**: Ngôn ngữ hiển thị của widget chat
  - Được điều khiển bởi bot owner (cấu hình trong SettingsTab)
  - Mỗi bot có thể có ngôn ngữ khác nhau
  - **Không phụ thuộc** vào platform locale

### 1.6. Sử dụng thư viện chuẩn

- **Next.js App Router**: `next-intl` (L1 + L2)
- **Widget Chat**: Lightweight translations object (không dùng next-intl vì widget.js là plain JS)
- Không tự xây dựng hệ thống i18n từ đầu.

### 1.7. Migration zero-downtime

- Thêm cột `locale` vào `profiles` với DEFAULT `'vi'`.
- Thêm field `ui_language` vào `widget_settings` JSONB (không cần migration, JSONB linh hoạt).
- Không xóa hoặc thay đổi schema hiện có gây ảnh hưởng đến luồng đang chạy.
- RLS policy phải được tạo trước khi bảng được sử dụng.

### 1.8. Mở rộng ngôn ngữ mới

- **Database**: Không cần migration (JSONB + enum linh hoạt)
- **Enum**: Thêm giá trị mới vào `ELanguage` (types/enums.ts)
- **Translations**: Thêm file `messages/{lang}.json` (L1) + translations object (L3)
- **UI**: Thêm option vào Select component
- **Validation**: Sử dụng enum `ELanguage` để đảm bảo type safety

---

## 2. Ràng buộc kỹ thuật (Technical Constraints)

| Constraint         | Chi tiết                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------ |
| **Next.js**        | 14 App Router (không dùng Pages Router)                                                    |
| **Middleware**     | Chỉ có 1 `middleware.ts` — phải compose logic locale với logic hiện tại                    |
| **Supabase**       | Dùng `auth.users` và bảng `profiles` (public schema) + bảng `bots` (widget_settings JSONB) |
| **Cookie**         | `NEXT_LOCALE` để lưu locale ưu tiên trên client (L2)                                       |
| **Database**       | PostgreSQL via Supabase; RLS bắt buộc                                                      |
| **Deployment**     | Vercel (production)                                                                        |
| **Widget Runtime** | Plain JavaScript (không qua Next.js build pipeline)                                        |

---

## 3. Quy trình phát triển (Process)

- Tuân theo **spec-kit workflow**: CONSTITUTION → SPEC → PLAN → TASKS → ANALYZE → IMPLEMENT → CONVERGE.
- Mỗi bước phải có **role** cụ thể (Product Architect, Tech Lead, v.v.).
- Phải sử dụng **GitNexus** và **OpenViking** trong SPEC, PLAN, ANALYZE để verify codebase.
- Sử dụng **find-skills** trước mỗi bước để tìm skills hỗ trợ.
- Commit theo từng task, không commit ồ ạt.

---

## 4. Chất lượng và Kiểm thử (Quality & Testing)

- **Lint & Build**: `npm run lint && npm run build` phải pass trước mỗi commit.
- **PoC bắt buộc**: Phải chạy Phase 0 (PoC) và xác nhận test cases trước khi triển khai.
- **Manual testing**: Cập nhật `docs/manual-testing/feature-catalog.md` với các test case cho i18n.
- **E2E**: Sử dụng Playwright hoặc manual test cho các luồng chính (switch locale, redirect, widget rendering).
- **Widget testing**: Verify widget renders correct language based on `widget_settings.ui_language`.

---

## 5. Quyết định đã chốt (Locked Decisions)

| Quyết định                                    | Lý do                                                                              |
| --------------------------------------------- | ---------------------------------------------------------------------------------- |
| Chọn next-intl cho L1 + L2                    | Chuẩn de-facto cho Next.js 14 App Router, type-safe, cộng đồng lớn.                |
| Chiến lược 4 Lớp                              | Tối ưu cho từng vùng: SEO (L1), trải nghiệm (L2), linh hoạt (L3), ổn định (L4).    |
| Không dịch blog trong MVP                     | Content-heavy, effort lớn, không ảnh hưởng đến core UX.                            |
| Widget Locale tách biệt Platform Locale       | Mỗi bot có thể phục vụ khách hàng khác ngôn ngữ, không phụ thuộc workspace locale. |
| Thêm `"en"`, `"vi"` vào RESERVED_SUBDOMAINS   | Ngăn workspace slug trùng với locale code.                                         |
| Sử dụng JSONB cho widget_settings.ui_language | Linh hoạt, không cần migration khi thêm ngôn ngữ mới.                              |
| Tái dùng enum `ELanguage`                     | Đảm bảo type safety và nhất quán toàn hệ thống.                                    |

---

## 6. Mở rộng ngôn ngữ mới (Extensibility)

### Quy trình thêm ngôn ngữ mới (ví dụ: Tiếng Pháp)

1. **Enum Extension** (types/enums.ts):

   ```typescript
   export enum ELanguage {
     Vi = "vi",
     En = "en",
     Ar = "ar",
     Fr = "fr", // ← Thêm mới
   }
   ```

2. **Public Pages Translations** (L1):
   - Tạo file: `messages/fr.json`
   - Thêm tất cả keys cần thiết

3. **Widget Translations** (L3):

   ```javascript
   // public/widget.js
   const translations = {
     vi: { welcome: "Xin chào! Tôi có thể giúp gì cho bạn?" },
     en: { welcome: "Hello! How can I help you?" },
     ar: { welcome: "مرحبا! كيف يمكنني مساعدتك؟" },
     fr: { welcome: "Bonjour ! Comment puis-je vous aider ?" }, // ← Thêm mới
   };
   ```

4. **UI Select Options** (SettingsTab.tsx):

   ```tsx
   <SelectItem value="fr">Français</SelectItem>
   ```

5. **Validation**:
   - Sử dụng `ELanguage` enum để validate `widget_settings.ui_language`
   - Không cho phép giá trị ngoài enum

### Ưu điểm của kiến trúc này:

- ✅ **Không cần migration DB** (JSONB + enum linh hoạt)
- ✅ **Type-safe** (enum đảm bảo chỉ có giá trị hợp lệ)
- ✅ **Dễ dàng mở rộng** (thêm ngôn ngữ = thêm 4 bước đơn giản)
- ✅ **Tách biệt rõ ràng** (Platform vs Widget locale)
- ✅ **Zero downtime** (không ảnh hưởng hệ thống hiện có)

---

## 7. Tham khảo (References)

- `docs/specs/i18n-multilingual/spec.md` — Spec chi tiết
- `docs/specs/i18n-multilingual/plan.md` — Implementation plan
- `docs/specs/i18n-multilingual/tasks.md` — Task breakdown
- `docs/specs/i18n-multilingual/data-model.md` — Database schema
- `docs/specs/i18n-multilingual/research.md` — Technology rationale
- `types/enums.ts` — ELanguage enum
- `components/dashboard/bot-detail/tabs/SettingsTab.tsx` — Widget language settings UI

---

**End of Constitution v2.0**
