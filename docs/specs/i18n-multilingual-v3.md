# Tính năng đa ngôn ngữ (Tiếng Anh) — Spec v3

> Phiên bản này được tổng hợp từ spec gốc + phân tích BA Tech Lead (Socratic + SMART) + codebase review (middleware.ts, types/enums.ts, config/reserved-subdomains.ts).
> **Trạng thái:** Sẵn sàng triển khai PoC.
> **Supersedes:** v2 (2026-08-29).

---

## 1. Mục tiêu & phạm vi

### 1.1. Mục tiêu

- Cho phép người dùng sử dụng giao diện Tiếng Anh trên toàn bộ nền tảng Vielora.
- Không phá vỡ luồng multi-tenant hiện tại (subdomain bot, workspace path-based routing, widget chat).
- Đảm bảo trải nghiệm nhất quán trên dashboard và landing.

### 1.2. Phạm vi (MVP)

- **Public routes:** landing, pricing, legal, marketing pages (`app/(public)`) — hỗ trợ tiếng Việt và Anh qua locale prefix.
- **Dashboard + Auth:** hỗ trợ tiếng Việt và Anh qua cookie + DB.
- **Chat widget, bot subdomain, API, Shopify:** đứng ngoài locale routing (giữ nguyên URL/hành vi).

### 1.3. Ngoài phạm vi (MVP)

- Blog (DB-driven): **không dịch**. URL giữ nguyên `/blog/...`, nội dung tiếng Việt.
- Email transactional: workstream riêng.
- Nội dung động khác.
- `ui_language` cấp bot widget: **scope sau**.

---

## 2. Hiện trạng & rủi ro đã xác minh

### 2.1. Middleware hiện tại (đã đọc middleware.ts)

Thứ tự xử lý hiện tại:

1. Subdomain bot → rewrite `/public-bot/${subdomain}`
2. Excluded paths (`/api`, `/_next`, `/static`, `/public-bot`, `/auth`, file extensions)
3. CSP cho `/shopify` và `/api/shopify`
4. **Workspace path-based routing** (dòng 121–173): mọi path segment đầu không nằm trong `RESERVED_PATHS` và khớp `SLUG_PATTERN` sẽ được lookup `workspaces` và rewrite thành `/dashboard/...`.
5. `/dashboard` → redirect 308 sang `/{workspace-slug}` (nếu có active workspace).

**Rủi ro chính đã được xác định:** Nếu có workspace slug `"en"` hoặc `"vi"`, toàn bộ route `/en/...` sẽ bị rewrite thành `/dashboard` trước khi bất kỳ logic locale nào chạy.

**Giải pháp:** Thêm `"en"`, `"vi"` vào `RESERVED_SUBDOMAINS` (config/reserved-subdomains.ts) và thêm constraint ở DB `workspaces.slug` để reject các giá trị này.

### 2.2. RESERVED_PATHS hiện tại

Danh sách ~90 mục, **chưa có** `"en"` hay `"vi"`. → Sẽ bổ sung.

### 2.3. Claim sai từ spec gốc (đã đính chính)

Spec cũ nói middleware redirect `/chat/` → subdomain — **không đúng**. Route `/chat/[slug]` tồn tại và render trực tiếp. Không có redirect nào ở middleware cho prefix `/chat/`. → Đã loại bỏ khỏi risk assessment.

---

## 3. Kiến trúc đề xuất (điều chỉnh từ spec v2)

### 3.1. Chiến lược lai theo 4 khu vực

| Khu vực                                                | Cơ chế locale                                        | Lý do                                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `app/(public)` (landing, pricing, legal)               | **A — Locale prefix** (`/en/pricing`, `/vi/pricing`) | Cần SEO đa ngôn ngữ; quy mô nhỏ (~19 file).                                             |
| `app/dashboard`, `app/auth`, `app/onboarding`          | **B — Cookie + DB**                                  | Không cần SEO; tránh tái cấu trúc 40+ file; locale lưu trong cookie và bảng `profiles`. |
| `app/chat`, `app/public-bot`, `app/api`, `app/shopify` | **Đứng ngoài locale routing**                        | URL đã được nhúng cứng / dùng cho bot; không thay đổi cấu trúc.                         |

**Bổ sung:** Đối với lần truy cập đầu tiên (chưa có cookie), middleware sẽ đọc `Accept-Language` header và redirect sang locale phù hợp (ưu tiên `en` nếu `en` trong header, ngược lại fallback `vi`).

### 3.2. Middleware compose — code mẫu cụ thể

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";

const intlMiddleware = createMiddleware({
  locales: ["vi", "en"],
  defaultLocale: "vi",
  localePrefix: "always", // luôn có prefix /en/... hoặc /vi/...
});

// Các hàm hiện có: getSubdomain, isExcludedPath, withShopifyCsp, ...
// Workspace rewrite logic (giữ nguyên)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Subdomain bot rewrite (giữ nguyên)
  const subdomain = getSubdomain(request);
  if (subdomain && !RESERVED_SUBDOMAINS.has(subdomain)) {
    // ... rewrite /public-bot ...
  }

  // 2. Excluded paths (giữ nguyên)
  if (isExcludedPath(pathname)) {
    return withShopifyCsp(NextResponse.next());
  }

  // 3. Shopify CSP (giữ nguyên)
  if (pathname.startsWith("/api/shopify") || pathname.startsWith("/shopify")) {
    return withShopifyCsp(NextResponse.next());
  }

  // 4. Workspace rewrite (giữ nguyên — chạy TRƯỚC intlMiddleware)
  // ... logic workspace slug (dòng 121–173)

  // 5. Chỉ áp dụng intlMiddleware cho các path thuộc app/(public)
  //    Các path: /, /pricing, /legal, /about, /contact, /terms, /privacy, ...
  const PUBLIC_PATHS = ["/", "/pricing", "/legal", "/about", "/contact", "/terms", "/privacy"];
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isPublicPath) {
    // Gọi intlMiddleware để xử lý locale prefix
    const response = await intlMiddleware(request);
    return withShopifyCsp(response);
  }

  // 6. Các path khác (dashboard, chat, api, ...) — không qua intlMiddleware
  return withShopifyCsp(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next|api|static|.*\\..*).*)",
    "/apple-touch-icon.png",
    "/apple-touch-icon-precomposed.png",
  ],
};
```

**Lưu ý:** `intlMiddleware` sẽ tự động redirect `/` → `/vi` hoặc `/en` dựa trên `Accept-Language` hoặc locale mặc định.

### 3.3. Folder structure cho public routes

- Hiện tại: `app/(public)/pricing/page.tsx`, `app/(public)/legal/...`
- Sau khi chuyển: `app/[locale]/pricing/page.tsx`, `app/[locale]/legal/...`
- Hoặc giữ nguyên nhóm: `app/(public)/[locale]/pricing/page.tsx` (tùy chọn, nhưng phức tạp hơn)

**Khuyến nghị:** Dùng `app/[locale]/...` (không nhóm) để đơn giản và tường minh với next-intl.

### 3.4. Lưu trữ locale (dashboard)

- Bảng `public.profiles` (đã có trong spec gốc) — **bổ sung RLS policy**:

  ```sql
  CREATE POLICY profiles_select_own ON profiles
    FOR SELECT USING (auth.uid() = id);
  CREATE POLICY profiles_upsert_own ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id)
    FOR UPDATE USING (auth.uid() = id);
  ```

- Luồng:
  - Toggle locale → update `profiles` + set cookie `NEXT_LOCALE` ngay.
  - Server component ưu tiên đọc cookie; fallback query `profiles` nếu cookie trống.

### 3.5. Ngôn ngữ bot widget (`ui_language`) — scope sau

- Tái dùng enum `ELanguage` (`vi`, `en`, `ar`) có sẵn trong `types/enums.ts`.
- Thêm field `ui_language` vào `widget_settings` (JSONB) — theo pattern đã dùng.
- **Triển khai sau MVP** (Phase 3).

---

## 4. Thư viện: next-intl

Lựa chọn next-intl cho Next.js 14 App Router. **Không** dùng `createMiddleware` mặc định — tự compose với middleware hiện tại (xem §3.2).

---

## 5. PoC bắt buộc trước khi triển khai toàn bộ

Các test case cần xác nhận trong Phase 0:

- [ ] Tạo workspace slug `"en"` → route `/en/pricing` **không** bị rewrite thành `/dashboard`.
- [ ] Bot subdomain `{slug}.vielora.vn` vẫn rewrite `/public-bot/{slug}` không bị lẫn locale.
- [ ] `/chat/{slug}` và `/chat/{slug}/group` không đổi hành vi.
- [ ] `/dashboard` → redirect 308 sang `/{workspace-slug}` vẫn hoạt động khi cookie `NEXT_LOCALE` có giá trị.
- [ ] `/shopify` và `/api/shopify` vẫn nhận CSP header đúng.
- [ ] Lần truy cập đầu (không cookie) với `Accept-Language: en-US` → redirect sang `/en/pricing`.

---

## 6. Open Questions (đã chốt)

| Câu hỏi                                                | Quyết định                                                                                                                  |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Blog có dịch trong MVP không?                          | **Không.** Blog giữ nguyên tiếng Việt, URL không prefix locale.                                                             |
| `ui_language` cấp bot — triển khai luôn hay scope sau? | **Scope sau.** MVP chỉ hỗ trợ platform locale.                                                                              |
| Phạm vi rollout?                                       | Phase 0: PoC (landing+pricing). Phase 1: toàn bộ public routes. Phase 2: dashboard + auth. Phase 3: bot widget (scope sau). |

---

## 7. Locked Decisions (đã chốt)

- Chọn next-intl làm thư viện i18n.
- Chiến lược lai: prefix cho public, cookie/DB cho dashboard.
- Loại trừ `/chat`, `/public-bot`, `/api`, `/shopify` khỏi locale routing.
- Thêm `"en"`, `"vi"` vào `RESERVED_SUBDOMAINS` và DB constraint.
- Tái dùng enum `ELanguage` cho `ui_language` (scope sau).
- Bắt buộc RLS policy cho `profiles`.
- Không dịch blog trong MVP.
- `ui_language` cấp bot để scope sau.

---

## 8. Timeline & Phases

| Phase             | Scope                                                           | Thời gian dự kiến | Deliverable                                         |
| ----------------- | --------------------------------------------------------------- | ----------------- | --------------------------------------------------- |
| **Phase 0 (PoC)** | Landing + pricing (1 route) + middleware compose                | 1-2 ngày          | Xác nhận 6 test cases ở §5                          |
| **Phase 1**       | Toàn bộ public routes (landing, pricing, legal, about, contact) | 3-5 ngày          | Public pages có thể switch locale                   |
| **Phase 2**       | Dashboard + Auth (cookie/DB sync, toggle UI)                    | 5-7 ngày          | Dashboard hiển thị theo locale, lưu được preference |
| **Phase 3**       | Bot widget `ui_language`                                        | Scope sau         | —                                                   |

---

## 9. Appendix: Socratic Question Log (tóm tắt)

| #   | Câu hỏi                                   | Phát hiện          | Giải pháp                                     |
| --- | ----------------------------------------- | ------------------ | --------------------------------------------- |
| Q1  | Accept-Language cho lần truy cập đầu?     | Spec chưa đề cập.  | Thêm logic detect Accept-Language → redirect. |
| Q4  | Ai cấu hình `ui_language` bot?            | Chưa rõ.           | Để scope sau, khi có giao diện cấu hình bot.  |
| Q6  | Folder structure thay đổi thế nào?        | Chưa nêu.          | Chuyển `app/(public)` → `app/[locale]`.       |
| Q7  | `createMiddleware` exclude paths thế nào? | Chưa có code.      | Đã thêm code mẫu ở §3.2.                      |
| Q11 | Blog có prefix locale không?              | Mâu thuẫn spec cũ. | Chốt DP1: không dịch blog MVP.                |

---

**Kết luận:** Spec v3 đã giải quyết các gap tìm thấy, có code mẫu cụ thể và timeline rõ ràng. Sẵn sàng để triển khai Phase 0 (PoC).
