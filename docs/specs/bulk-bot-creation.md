---
title: "Bulk Bot Creation Specification (Track A)"
purpose: "Implementation-ready spec for creating multiple bots from a single CSV/Excel import file"
methodology: "BA/Tech Lead - Socratic questioning + structured spec"
---

# Bulk Bot Creation Specification (Track A)

**Version**: 1.0
**Date**: 2026-08-02
**Author**: BA/Tech Lead (Hermes) — for TS. Nguyễn Hoài Tưởng
**Status**: DRAFT — For Review
**Location**: `docs/specs/bulk-bot-creation.md`
**Branch**: `feat/workspace`

---

## 📋 Executive Summary

Transform the single-bot creation flow (wizard → `POST /api/bots/create`) into a **generic bulk-creation feature**: upload one CSV file containing N rows, map columns, dry-run validate every row, then batch-create bots (status=pending) with global configuration (primary color, personality, skills) applied in bulk and per-bot knowledge content fed into the existing indexing pipeline. Designed for any workspace (not Logic-Hub-specific), gated by the workspace owner's plan `bots_limit`, with a per-row success/error report and idempotent "re-import failed rows only".

**Core Principle**: _Bulk creation is the single-bot creation flow applied N times inside one request, with all validation moved before any mutation._

**Scope (Track A only)**: File import (CSV only) → dry-run → batch create → knowledge content (text columns) → report. **Out of scope**: Excel (.xlsx) files, per-bot knowledge files (Track B), student account provisioning, avatar file uploads, enterprise subscription gating (comes later — only affects plan data, not code).

---

## 🎯 1. Business Requirements (User Vision)

> **Original User Description** (verbatim, condensed):
>
> > "Logic Hub có hơn 100 học sinh, tạo bot đơn lẻ rất mất thời gian. Cần tạo bot hàng loạt, chỉ cần trên file CSV. Giới hạn số lượng bot dựa trên số bot còn lại của workspace. Thiết kế generic để bất kỳ ai cũng dùng được. File CSV chỉ cần các cột bắt buộc: name, slug, knowledge_title, knowledge_content. Cấu hình chung cho lượt tạo: màu chủ đạo (primaryColor), tính cách (personality), kỹ năng (skills) sẽ áp dụng cho tất cả các bot trong lượt import."

### 1.1 Extracted Requirements (Structured)

| ID    | Requirement                                                                              | Priority | Source                  |
| ----- | ---------------------------------------------------------------------------------------- | -------- | ----------------------- |
| BR-01 | Upload 1 file CSV chứa nhiều bot, tạo tất cả trong 1 lần                                 | P0       | User vision             |
| BR-02 | Giới hạn số bot tạo theo quota còn lại của workspace (plan `bots_limit` − bot hiện có)   | P0       | User vision             |
| BR-03 | Generic: bất kỳ workspace nào cũng dùng được; không hardcode Logic Hub                   | P0       | User vision             |
| BR-04 | Per-bot khác nhau: name, slug, knowledge_title, knowledge_content (bắt buộc trong CSV)   | P0       | User vision             |
| BR-05 | Cấu hình chung cho batch: Màu chủ đạo (primaryColor), Personality, Skills áp dụng tất cả | P0       | User vision             |
| BR-06 | Knowledge per bot qua cột text (knowledge_title + knowledge_content)                     | P0       | User decision (Track A) |
| BR-07 | Dry-run trước: preview từng dòng OK/lỗi kèm lý do, không mutate DB                       | P0       | BA analysis             |
| BR-08 | Báo cáo N thành công / M lỗi; cho phép import lại chỉ các dòng lỗi                       | P1       | BA analysis             |
| BR-09 | Không cần tạo tài khoản cho từng học sinh (workspace quản lý tất cả)                     | P1       | User vision             |
| BR-10 | File mẫu CSV (template download) để user điền đúng format                                | P1       | BA analysis             |

---

## 🏗️ 2. Current State Analysis (Codebase Reality)

### 2.1 Database Schema (Relevant, verified in `supabase/db-schema.sql`)

```sql
-- All tables below EXIST. NO migration required for Track A.
plans (id, code pricing_plan, name, bots_limit int4 DEFAULT 1, monthly_credits int4)
subscriptions (id, user_id FK, plan_id FK, status, current_period_end, needs_bot_selection)
workspaces (id, name, slug UNIQUE, owner_id FK auth.users)
workspace_members (workspace_id, user_id, role_id: owner|admin|member|viewer, status)
bots (id, user_id FK auth.users NOT NULL, workspace_id FK, name, slug UNIQUE,
      domain text NOT NULL, status, widget_settings jsonb, crawl_settings jsonb,
      personality_id FK ai_personalities NULL, avatar_url text NULL)
ai_personalities (id, name UNIQUE, ...)
ai_skills (id, name UNIQUE, prompt_injection, ...)
bot_skills (bot_id FK, skill_id FK)          -- junction
pages (id, bot_id FK, url, title, content, content_hash, source_type, status, crawled_at)
-- source_type values: website | manual_text | file | single_url
```

### 2.2 Key Services

| Service                                | Current Scope                                                                                                                                   | Bulk Impact                                                                                                                     |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `lib/services/bot.service.ts`          | `createBot()` (dòng ~662): validate allowed_domains → resolve workspace (auto-create default nếu thiếu) → insert bot + widget_settings mặc định | **Reuse per-row**: thêm biến thể `createBotBulk()` — bỏ auto-create workspace, nhận `workspaceId` bắt buộc, gom vào transaction |
| `lib/services/subscription.service.ts` | `getUserSubscriptionPlan()` trả `{ planCode, botsLimit }` từ subscription active của user                                                       | **Reuse**: quota = `botsLimit` của chủ workspace − `count(bots WHERE workspace_id)`. Cần biến thể lấy theo `workspace.owner_id` |
| `app/api/bots/knowledge/route.ts`      | POST manual/file/url → `insertPageServer` + `addIndexerJob` → bot Indexing; deduct `CREDIT_PER_PAGE`                                            | **Reuse logic**: cho dòng có `knowledge_content`, replicate nhánh manual (source_type=manual_text, pageUrl=`manual://{uuid}`)   |
| `lib/scraper/index.ts`                 | `addIndexerJob({botId, pageId})` — BullMQ queue, worker xử lý embedding                                                                         | **Reuse**: enqueue per bot; worker tự xử lý backpressure, không cần cơ chế concurrency mới                                      |
| `lib/services/workspace.service.ts`    | workspace CRUD + membership helpers                                                                                                             | **Reuse**: xác minh owner/admin + resolve workspace                                                                             |
| `lib/security/allowed-domains.ts`      | `validateAllowedDomains()`                                                                                                                      | **Reuse**: validate `website_url` từng dòng                                                                                     |
| `hooks/onboarding/useBotCreation.ts`   | Wizard tạo bot đơn (4 bước)                                                                                                                     | **Reference**: entry point UI + nơi gắn nút "Import nhiều bot"                                                                  |

### 2.3 HARD Constraints (từ schema — quyết định thiết kế)

| Constraint                                    | Thiết kế đáp ứng                                                                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bots.user_id NOT NULL` (FK auth.users)       | Tất cả bot gán `user_id = workspace.owner_id` (Logic Hub: chủ workspace quản lý toàn bộ)                                                               |
| `bots.slug UNIQUE` (toàn hệ thống)            | Thuật toán dedupe: slugify(name) → nếu trùng (trong batch hoặc DB) thêm `-2`, `-3`, ...                                                                |
| `bots.domain NOT NULL`                        | Không có `website_url` → `domain = 'manual-upload.local'` (pattern `createFileOnboardingBot` có sẵn) + `crawl_settings.onboardingSourceMode = 'files'` |
| `pages` yêu cầu title/content cho manual_text | `knowledge_content` bắt buộc có `knowledge_title` (mặc định = bot name), ≤ 10.000 chars (`MAX_MANUAL_CONTENT_LENGTH`)                                  |
| Credit per knowledge page                     | Mỗi dòng có knowledge = 1 page = `CREDIT_PER_PAGE` credit; dry-run kiểm tra tổng credit còn lại                                                        |

### 2.4 Frontend (hiện trạng)

- Dashboard bots list (`hooks/dashboard/main/useBotsList.ts` + trang tương ứng) — nơi thêm nút **"Import nhiều bot"** → `/dashboard/bots/import`
- `useBotCreation.ts` wizard — tham chiếu cho bước template (personality/skills/widget mặc định)

---

## ❓ 3. Socratic Analysis — Critical Questions & Gaps

### 3.1 Quota & Race Conditions

| Question                                                                         | Analysis                                                          | Resolution                                                                                                                                                                 |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Q1**: Hai người cùng bulk-create vào 1 workspace cùng lúc có vượt quota không? | dry-run chỉ đọc count; create chạy song song có thể double-insert | **[Resolution]**: Trong create mode, `SELECT ... FOR UPDATE` trên row workspace (serialize), đếm lại count, mới insert                                                     |
| **Q2**: Quota tính theo user hay workspace?                                      | `getUserSubscriptionPlan` là theo user; Logic Hub có 1 chủ sở hữu | **[Resolution]**: Lấy subscription active của `workspace.owner_id` → `bots_limit`; count bot theo `workspace_id`. Quy tắc generic: "quota workspace = plan của chủ sở hữu" |
| **Q3**: Free plan (bots_limit=1) mà import 100 dòng?                             | dry-run phải chặn từ sớm                                          | **[Resolution]**: dry-run trả quota summary; create bị reject nếu `validRows > remaining` (message + số cụ thể)                                                            |

### 3.2 Data Validation & File Parsing

| Question                                                  | Analysis                                               | Resolution                                                                                                                                                  |
| --------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Q4**: Format file nào?                                  | Đọc file CSV bằng parser CSV client-side / server-side | **[Resolution]**: Parse file CSV, validate dung lượng file ≤ 10MB, không giới hạn số dòng (số bot được tạo chỉ bị giới hạn bởi Quota còn lại của Workspace) |
| **Q5**: Cột lạ / thiếu cột / sai header?                  | File của user tùy ý → phải generic                     | **[Resolution]**: Column-mapping UI (auto-detect header → cho chỉnh bằng dropdown); dòng thiếu `name` → error per-row                                       |
| **Q6**: Slug trống / trùng?                               | `slug UNIQUE` global                                   | **[Resolution]**: sinh từ name + dedupe batch-local + DB check; dòng có slug tay bị trùng → error per-row (không tự sửa slug người dùng)                    |
| **Q7**: `website_url` sai format / domain không cho phép? | `validateAllowedDomains` có sẵn                        | **[Resolution]**: validate từng dòng như bot đơn; dòng lỗi → error per-row, không chặn cả batch                                                             |
| **Q8**: Personality/skill name không tồn tại?             | ai_personalities/ai_skills có UNIQUE name              | **[Resolution]**: resolve tại bước template (trước dry-run): name sai → template error chặn cả batch (vì áp cho tất cả dòng)                                |

### 3.3 Knowledge & Indexing

| Question                                                                       | Analysis                                                     | Resolution                                                                                                                                   |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Q9**: 100 dòng × 1 knowledge = 100 embedding job cùng lúc có quá tải worker? | Worker xử lý tuần tự qua BullMQ; manual_text không cần crawl | **[Resolution]**: Enqueue thẳng qua `addIndexerJob`; backpressure do queue đảm nhận. Không cần cơ chế concurrency mới                        |
| **Q10**: Credit không đủ cho N page?                                           | `deductBotCredits` deduct từng bot                           | **[Resolution]**: dry-run tính `creditsNeeded = count(knowledge rows) × CREDIT_PER_PAGE`; nếu > credit còn lại → chặn confirm với message rõ |
| **Q11**: Bot tạo xong nhưng job indexing fail?                                 | Bot kẹt status Indexing                                      | **[Resolution]**: Báo cáo per-row ghi nhận "bot tạo OK, knowledge đang xử lý"; bot kẹt theo cơ chế retry worker có sẵn                       |

### 3.4 Security & Permissions

| Question                                         | Analysis                               | Resolution                                                                                                                |
| ------------------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Q12**: Ai được bulk-create?                    | Workspace có owner/admin/member/viewer | **[Resolution]**: Chỉ owner/admin (kiểm tra `workspace_members.role_id`, pattern `canUserDeleteBot`). Member/viewer → 403 |
| **Q13**: File upload có nguy cơ gì?              | Parse ở server                         | **[Resolution]**: Parse buffer trong RAM, không persist; giới hạn size; không đọc macros (SheetJS không chạy macro)       |
| **Q14**: Dry-run có leak dữ liệu workspace khác? | API nhận workspaceId từ client         | **[Resolution]**: Luôn verify membership của user với workspaceId trước khi làm bất cứ điều gì                            |

### 3.5 Idempotency & UX

| Question                                         | Analysis      | Resolution                                                                                                                                                                          |
| ------------------------------------------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Q15**: Import lần 2 sau khi 1 phần thành công? | Tạo trùng bot | **[Resolution]**: "Re-import failed rows only" — client giữ rows lỗi, gửi lại; kèm hint kiểm tra slug đã tồn tại (error per-row "slug already exists")                              |
| **Q16**: Import chạy lâu, auth cookie hết hạn?   | Request dài   | **[Resolution]**: create mode xử lý trong ~vài giây (insert + enqueue, không chờ embedding); nếu timeout → client báo "kết quả không xác định, kiểm tra danh sách bot / import lại" |

---

## 🏛️ 4. Technical Architecture

### 4.1 File Format Spec (CSV Only)

Header row bắt buộc. Định dạng duy nhất hỗ trợ: **CSV (`.csv`)** (hỗ trợ UTF-8 với BOM để hiển thị tiếng Việt trên Excel).

Tất cả 4 cột dưới đây đều là **BẮT BUỘC (Required)**:

| Column              | Required | Type   | Rule                                                                     |
| ------------------- | -------- | ------ | ------------------------------------------------------------------------ |
| `name`              | ✅       | string | 1–100 chars, non-empty                                                   |
| `slug`              | ✅       | string | Pattern `^[a-z0-9]+(?:-[a-z0-9]+)*$`, non-empty, unique trong file và DB |
| `knowledge_title`   | ✅       | string | 1–100 chars (`MAX_MANUAL_TITLE_LENGTH`), non-empty                       |
| `knowledge_content` | ✅       | string | 1–10.000 chars (`MAX_MANUAL_CONTENT_LENGTH`), non-empty                  |

> **Cấu hình chung cho Batch (Global Configuration)**:
> Không nằm trong file CSV. Các thuộc tính: **Màu chủ đạo (`primaryColor`)**, **Tính cách (`personality`)**, **Kỹ năng (`skills`)** sẽ được chọn 1 lần duy nhất trên giao diện ở Bước 3. Khi bấm tạo, **tất cả bot** trong lượt import sẽ được áp dụng chung cấu hình này.

**Giới hạn**: Dung lượng file ≤ 10MB, **không giới hạn số dòng** (tối đa tạo theo Quota bot khả dụng của Workspace). File mẫu tải về: `docs/specs/templates/bulk-bot-import-template.csv`.

### 4.2 API Contract

```
POST /api/bots/bulk-create
```

**Auth**: `authenticateRequest` (cookie hoặc Bearer). **Permission**: owner/admin của `workspaceId`.

**Request body**:

```typescript
interface BulkCreateRequest {
  workspaceId: string;
  template: {
    primaryColor?: string; // widget_settings.primaryColor, áp dụng chung cho tất cả bot
    isPublic?: boolean; // bots.is_public (true = Công khai, false = Riêng tư), áp dụng chung
    personalityName?: string; // resolve → personality_id, áp dụng chung cho tất cả bot
    skillNames?: string[]; // resolve → skill_ids, áp dụng chung cho tất cả bot
  };
  rows: Array<{
    name: string;
    slug: string;
    knowledgeTitle: string;
    knowledgeContent: string;
  }>;
  mode: "dry-run" | "create";
}
```

**dry-run response** (không mutate, không consume quota/credit):

```typescript
{
  success: true,
  data: {
    quota: { planCode: "pro", botsLimit: 100, currentCount: 12, remaining: 88 },
    credits: { remaining: 350, needed: 60 },          // needed = knowledge rows × CREDIT_PER_PAGE
    rows: [                                          // song song với rows gửi lên
      { index: 0, status: "ok" | "error", reason?: string, generatedSlug?: string },
      ...
    ],
    summary: { total: 100, ok: 98, error: 2, wouldCreate: 98 },
    blocked: false                                   // true nếu wouldCreate > remaining hoặc credits needed > remaining
  }
}
```

**create response**:

```typescript
{
  success: true,
  data: {
    quota: { ... },
    results: [
      { index: 0, status: "created" | "error", botId?: string, slug?: string, reason?: string,
        knowledge: { pageId?: string, jobId?: string, status: "queued" | "skipped" } },
      ...
    ],
    summary: { total: 100, created: 98, error: 2 },
    reimportPayload: { rows: [ /* chỉ các dòng lỗi, đã strip field thừa */ ] }
  }
}
```

**Error responses**: 400 (file/body invalid, quota exceeded), 401 (unauth), 403 (không phải owner/admin, template personality/skill không tồn tại), 404 (workspace không tồn tại).

### 4.3 Service Layer

`lib/services/bulk-bot.service.ts` (mới):

- `parseBulkFile(buffer, filename)` → `RawRow[]` (dùng `xlsx`; `read(buffer, { type: "buffer" })` → `sheet_to_json`)
- `validateBulkRows(rows, ctx)` → per-row OK/error (name, slug pattern, domain, avatar URL, knowledge limits)
- `resolveTemplate(template, client)` → `{ personalityId?, skillIds[] }` (throw nếu name không tồn tại)
- `computeQuota(client, workspaceId, ownerId)` → `{ planCode, botsLimit, currentCount, remaining }` (dùng `getUserSubscriptionPlan` theo owner + `count(bots)`)
- `generateUniqueSlugs(rows, client)` → slugify(name) + dedupe batch-local + DB
- `createBotsBulk(client, { workspaceId, ownerId, template, rows })`:
  1. `SELECT ... FOR UPDATE` workspace row
  2. Re-check quota (defense in depth)
  3. Insert N bots (status = Pending; `domain` = website host hoặc `manual-upload.local`; `crawl_settings.onboardingSourceMode = "files"` khi không có website; `widget_settings` mặc định giống `createBot()`; `personality_id`; `avatar_url`)
  4. Insert `bot_skills` junction rows
  5. Với dòng có `knowledgeContent`: `insertPageServer` (manual_text, `manual://{uuid}`) + `addIndexerJob` + update bot status → Indexing; dòng không knowledge: status → Ready
  6. Deduct credit `CREDIT_PER_PAGE` mỗi page (dùng `deductBotCredits`)
  7. Rollback toàn bộ batch nếu lỗi nghiêm trọng giữa chừng (single transaction cho insert; knowledge enqueue ngoài transaction, lỗi enqueue → ghi nhận per-row error + refund credit)

> Lưu ý: **không tái sử dụng trực tiếp `createBot()`** vì nó tự resolve/auto-create workspace; tách phần validate + widget defaults thành helper dùng chung, giữ phần insert riêng cho bulk (batch, transaction).

### 4.4 Config (thêm vào `lib/constants/bulk-import.ts`)

```typescript
export const BULK_IMPORT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
// Không giới hạn số dòng (BULK_IMPORT_MAX_ROWS), giới hạn theo Quota workspace còn lại
```

### 4.5 API Route Tree

```
/api/bots
├── POST /create          # (hiện trạng, giữ nguyên)
└── POST /bulk-create     # (mới) dry-run | create
```

### 4.6 Performance Strategy & Infrastructure Overload Prevention (Tối Ưu Hiệu Năng & Chống Quá Tải)

Để đảm bảo hệ thống phản hồi cực nhanh (< 3-5 giây) và không bị đơ/treo hạ tầng khi người dùng tải lên file CSV 500 bot kèm khối lượng văn bản lớn, các cơ chế bảo vệ sau được triển khai bắt buộc:

1. **DB Batch Chunking (Ghi dữ liệu hàng loạt)**:
   - Thay vì 500 câu lệnh SQL `INSERT` riêng lẻ gây nghẽn kết nối Database, `createBotsBulk` gộp dữ liệu thành các **Chunks (50-100 dòng/chunk)** để chèn hàng loạt trong duy nhất 1 SQL transaction.

2. **Decoupling AI Vector Embedding qua Hàng Đợi (BullMQ Redis Queue)**:
   - Thao tác insert Bot và Page record vào PostgreSQL chỉ mất ~1-2 giây.
   - Thao tác nặng và tốn thời gian nhất là **Vector Embedding** (tạo vector từ `knowledge_content` qua Gemini API và lưu vào PgVector) **KHÔNG CHẠY ĐỒNG BỘ** trong luồng API Request.
   - API chỉ khởi tạo page và đẩy job vào hàng đợi Redis BullMQ (`addIndexerJob({ botId, pageId })`).
   - Các **Background Workers** tự động rút job xử lý ngầm từ Redis queue với các cấu hình an toàn:
     - **Concurrency Limit**: Giới hạn tối đa 5-10 embedding job xử lý song song per worker.
     - **Rate Limit & Exponential Backoff**: Tự động giãn khoảng cách thời gian gọi Gemini AI API để không dính lỗi HTTP 429 Too Many Requests.
     - **Auto-retry**: Thử lại tự động nếu mạng lỗi mà không làm thất thoát dữ liệu bot.

3. **Quản Lý Bộ Nhớ RAM & Không Ghi File Rác**:
   - File CSV được parse trực tiếp dưới dạng Buffer trong RAM và giải phóng ngay lập tức. Giới hạn `10MB` giúp Node.js process luôn an toàn, tránh lỗi nghẽn RAM (Out Of Memory).

4. **Kịch Bản Xử Lý Khi Số Dòng CSV > Quota Bot Khả Dụng**:
   - **Mức Dry-Run**: So sánh `validRows` với `remainingQuota` (`botsLimit` - `currentCount`). Nếu vượt quá, API trả về `blocked: true` cùng thông báo cụ thể (_"File chứa N bot nhưng workspace chỉ còn M lượt tạo khả dụng"_). Nút "Xác nhận tạo bot" bị **Vô hiệu hóa (Disabled)** trên UI.
   - **Mức Server Enforcement**: API Create đếm lại `count(bots)` với khoá `SELECT ... FOR UPDATE` trên workspace row. Nếu `validRows > remainingQuota`, API từ chối ngay lập tức với `HTTP 400 Bad Request`.

---

## 🔄 5. Migration Strategy

**Không có migration DB.** Không có thay đổi schema, RLS, hay trigger. Duy nhất một thay đổi dependency: `xlsx` (npm install). Triển khai feature flag không cần thiết (tính năng thêm mới, không đụng flow cũ).

| Phase | Action                                          | Rollback      |
| ----- | ----------------------------------------------- | ------------- |
| 1     | `npm i xlsx` + service layer + API route        | Revert commit |
| 2     | Frontend import page + column mapping + preview | Revert commit |
| 3     | Sample template + report/retry UI + docs        | Revert commit |

---

## 🎨 6. Frontend Spec & User Experience (UX Flow)

### 6.1 Entry Point trên Dashboard Overview

- **Vị trí**: Nút **"Tạo bot mới"** ở vị trí góc trên Dashboard (`DashboardClient.tsx`).
- **Thiết kế**: Chuyển thành **Split Button / Dropdown Button** với nút bấm chính kèm biểu tượng mũi tên xuống (Chevron) phía bên phải nút.
- **Tùy chọn Menu Dropdown**:
  1. **Tạo bot đơn lẻ** (Hành động mặc định khi bấm trực tiếp vào phần nút chính): Chuyển hướng tới `/onboarding` (Luồng tạo bot wizard chuẩn).
  2. **Import file CSV** (Khi bấm mở menu Dropdown): Chuyển hướng tới `/onboarding?mode=bulk` (Chuyển trực tiếp tới Luồng tạo bot hàng loạt).
- **Phân quyền**: Menu Dropdown chỉ hiển thị cho người dùng có quyền `owner` hoặc `admin` trong Workspace hiện tại (Check `workspace_members.role_id`).

### 6.2 Luồng Onboarding Wizard 4 Bước (`/onboarding?mode=bulk`)

```
┌───────────────────────────────────────────────────────────────────┐
│ STEP 1: Nhập & Kiểm Tra File CSV                                  │
│  • Hiển thị format CSV mẫu yêu cầu (name*, slug*, title*, content*)│
│  • Nút [⬇ Tải file mẫu CSV]                                       │
│  • Drop zone upload file (.csv, ≤10MB, ko giới hạn dòng)           │
│  • Hiển thị bảng tóm tắt kết quả kiểm tra dòng (Valid / Invalid)  │
│  👉 [Tiếp tục sang Step 2] (Chỉ bật khi file hợp lệ)              │
├───────────────────────────────────────────────────────────────────┤
│ STEP 2: Cấu Hình Chung & Preview                                  │
│  • Màu sắc chủ đạo: [ColorPicker]                                 │
│  • Chế độ công khai: [Toggle: Công khai / Riêng tư]               │
│  • Tính cách: [Dropdown]  Kỹ năng: [MultiSelect]                  │
│  • Bảng xem trước dữ liệu + Kiểm tra Quota/Credit Workspace        │
│  👉 [Tạo bot ngay] (Bị khóa nếu vượt Quota / hết Credit)          │
├───────────────────────────────────────────────────────────────────┤
│ STEP 3: Tiến Độ Tạo Bot Real-time                                 │
│  • Thanh Progress Bar (%) chạy Real-time (0% → 100%)              │
│  • Thông số live: "Đã tạo 15 / 50 bots..." + status badge         │
│  • Chia Sub-batches (10-20 bots/request) gửi song song ngầm       │
│  👉 Auto-advance sang Step 4 khi hoàn tất 100%                    │
├───────────────────────────────────────────────────────────────────┤
│ STEP 4: Hoàn Thành & Báo Cáo Kết Quả                              │
│  • Summary Dashboard: ✅ N bot đã tạo  ⛔ M dòng thất bại        │
│  • Chi tiết lỗi từng dòng + Nút [Chỉ import lại các dòng lỗi]     │
│  • Nút [Về trang Dashboard]                                       │
└───────────────────────────────────────────────────────────────────┘
```

**Mô tả chi tiết từng bước**:

- **Step 1 (Nhập & Kiểm tra File CSV)**:
  - Hiển thị bảng mô tả cấu trúc file CSV tiêu chuẩn gồm 4 cột bắt buộc: `name`, `slug`, `knowledge_title`, `knowledge_content`.
  - Nút tải file mẫu `bulk-bot-import-template.csv`.
  - Khung Drag & Drop tải file CSV. Khi người dùng thả file:
    - Client parse dữ liệu bằng CSV parser nhẹ.
    - Thực hiện kiểm tra sơ bộ (Check định dạng MIME `text/csv`, kích thước file ≤ 10MB, kiểm tra trùng lặp `slug` nội bộ trong file, kiểm tra các ô rỗng).
    - Hiển thị bảng tổng quan: _Tổng số dòng_, _Số dòng hợp lệ_, _Số dòng phát hiện lỗi_.
    - Nút **"Tiếp tục sang Bước 2"** chỉ sáng khi có ít nhất 1 dòng hợp lệ.

- **Step 2 (Cấu hình chung & Preview Quota)**:
  - Cho phép người dùng thiết lập thuộc tính dùng chung cho toàn bộ N bot:
    - **Màu sắc chủ đạo (`primaryColor`)**: Color Picker chọn màu giao diện chat widget.
    - **Chế độ công khai (`isPublic`)**: Switch Toggle chọn `Công khai` (`true`) hoặc `Riêng tư` (`false`).
    - **Tính cách (`personality`)**: Select dropdown chọn tính cách AI.
    - **Kỹ năng (`skills`)**: Multi-select dropdown chọn các kỹ năng AI đi kèm.
  - Gọi API `POST /api/bots/bulk-create` với `mode: "dry-run"` để kiểm tra Quota còn lại của Workspace và tổng số Credits cần dùng cho các trang kiến thức.
  - Nút **"Tạo bot ngay"** sẽ bị disabled nếu API trả về `blocked: true`.

- **Step 3 (Tiến độ tạo bot Real-time)**:
  - Để tránh timeout HTTP và hiển thị tiến độ mượt mà, Client chia danh sách dòng hợp lệ thành các **Sub-batches (mỗi batch 10-20 dòng)** và gọi `POST /api/bots/bulk-create` với `mode: "create"`.
  - Hiển thị màn hình theo dõi Real-time:
    - Thanh Progress bar động (tính % dựa trên số bot đã tạo thành công / tổng số bot).
    - Dòng chữ live: `Đang khởi tạo bot: "Bot Toán 10" (15/50)...`
    - Bộ đếm realtime số bot thành công và thất bại.
  - Khi tất cả sub-batches hoàn tất, tự động chuyển tiếp sang **Step 4**.

- **Step 4 (Hoàn thành & Báo cáo kết quả)**:
  - Báo cáo tổng kết toàn bộ lượt import: Số bot đã tạo thành công + đẩy vào hàng đợi Embedding (`Indexing`), số dòng lỗi (nếu có).
  - Cung cấp tính năng **"Chỉ import lại các dòng lỗi"**: Tự động giữ lại các dòng thất bại ở Step 1 để người dùng chỉnh sửa và thử lại nhanh chóng.
  - Nút **"Về trang Dashboard"** quay lại danh sách Bot.

### 6.3 Permissions Matrix

| Action           | Owner | Admin | Member | Viewer |
| ---------------- | ----- | ----- | ------ | ------ |
| Xem trang import | ✅    | ✅    | ❌     | ❌     |
| Dry-run          | ✅    | ✅    | ❌     | ❌     |
| Create           | ✅    | ✅    | ❌     | ❌     |

---

## ⚠️ 7. Edge Cases & Exception Handling

| Scenario                                               | Handling                                                                                 |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| File > 10MB                                            | Reject ngay ở bước 1, message rõ "File vượt quá 10MB"                                    |
| Dòng thiếu `name`                                      | Error per-row "name is required"                                                         |
| `slug` tay trùng với DB                                | Error per-row "slug already exists" (không tự sửa)                                       |
| `slug` trống                                           | Auto-generate: slugify(name) → trùng thì `-2`, `-3` (batch-local + DB check)             |
| `website_url` sai format / không thuộc allowed domains | Error per-row                                                                            |
| `knowledge_content` > 10.000 chars                     | Error per-row                                                                            |
| Personality/skill name không tồn tại                   | Template error, chặn cả batch (bước 3)                                                   |
| Valid rows > quota còn lại                             | `blocked: true` ở dry-run; create bị 400 kèm số cụ thể                                   |
| Credit không đủ cho tổng knowledge page                | `blocked: true`; message "cần N credits, còn M"                                          |
| Race: 2 bulk cùng lúc                                  | `SELECT FOR UPDATE` trên workspace khi create                                            |
| Insert thành công nhưng enqueue knowledge fail         | Per-row error + refund credit page đó; bot giữ status Pending                            |
| Auth hết hạn giữa chừng                                | 401; client hướng dẫn đăng nhập lại + import lại (idempotent theo slug)                  |
| File rỗng / chỉ header / không có cột name             | Error bước 1–2, không vào preview                                                        |
| Re-import failed rows                                  | Client giữ rows lỗi, gửi lại; slug đã tồn tại từ lần trước → error per-row (user tự sửa) |
| Slug tiếng Việt có dấu                                 | slugify bỏ dấu (pattern hiện tại của repo)                                               |

---

## 📊 8. Test Matrix (Happy / Edge / Exception)

### 8.1 Happy Path

| #   | Case                                              | Expected                                                                            |
| --- | ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| H1  | CSV 100 dòng hợp lệ, không knowledge, dry-run     | 100 OK, wouldCreate=100, blocked=false, quota đúng                                  |
| H2  | CSV 100 dòng hợp lệ, có knowledge_content, create | 100 bot Pending → Indexing; 100 page manual_text; 100 job enqueued; credit trừ đúng |
| H3  | Template personality + 3 skills                   | Tất cả bot có personality_id + 3 bot_skills rows                                    |
| H4  | Slug trống trên 100 dòng tên trùng                | Slug unique `ten`, `ten-2`, ... `ten-100`                                           |
| H5  | XLSX (multi-sheet, sheet đầu tiên)                | Parse đúng sheet đầu                                                                |
| H6  | File có BOM UTF-8 + tên tiếng Việt                | Parse đúng, slug không dấu                                                          |
| H7  | Workspace free plan còn 1 quota, import 1 dòng    | Tạo thành công                                                                      |

### 8.2 Edge Cases

| #   | Case                                    | Expected                                                                                                                                                                                                     |
| --- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| E1  | 499 dòng + 1 dòng lỗi                   | 499 OK + 1 error, create vẫn chạy phần OK                                                                                                                                                                    |
| E2  | File đúng 500 dòng                      | Pass (boundary)                                                                                                                                                                                              |
| E3  | File 501 dòng                           | Reject                                                                                                                                                                                                       |
| E4  | Dòng có slug tay hợp lệ + name          | Dùng slug tay, không sinh lại                                                                                                                                                                                |
| E5  | Dòng có website_url + knowledge_content | Bot domain=website, status Indexing, có page manual + (không crawl discover vì là file-onboarding? → **quyết định**: website + manual text cùng lúc → chỉ tạo page manual, không queue discover ở phase này) |
| E6  | Cột không mapping (bỏ trống field)      | Field bỏ qua, dùng default                                                                                                                                                                                   |
| E7  | knowledge_title rỗng                    | Mặc định = bot name                                                                                                                                                                                          |
| E8  | Avatar URL sai format                   | Error per-row                                                                                                                                                                                                |
| E9  | Trùng name trong batch (khác slug)      | Cả 2 OK nếu slug dedupe được                                                                                                                                                                                 |

### 8.3 Exceptions

| #   | Case                                            | Expected                                            |
| --- | ----------------------------------------------- | --------------------------------------------------- |
| X1  | Workspace không tồn tại                         | 404                                                 |
| X2  | User là member (không phải owner/admin)         | 403                                                 |
| X3  | Chưa đăng nhập / token hết hạn                  | 401                                                 |
| X4  | Template personality name sai                   | Template error, chặn cả batch, không create gì      |
| X5  | Valid rows > quota                              | blocked=true ở dry-run; create → 400                |
| X6  | Credit không đủ                                 | blocked=true; không create                          |
| X7  | Race 2 bulk (kiểm thử bằng 2 request song song) | Chỉ batch đầu pass quota; batch sau bị chặn         |
| X8  | DB lỗi giữa insert (mock)                       | Transaction rollback, không bot mồ côi              |
| X9  | addIndexerJob throw (mock)                      | Per-row error knowledge, refund credit, bot Pending |
| X10 | File binary hỏng (giả .xlsx)                    | Parse error bước 1, message rõ                      |

### 8.4 Non-Functional

| Metric                            | Target                                            |
| --------------------------------- | ------------------------------------------------- |
| Parse + validate 500 dòng         | < 2s                                              |
| Create 100 bot (insert + enqueue) | < 10s                                             |
| Không có N+1 query trầm trọng     | Gom: 1 query fetch existing slugs, 1 batch insert |
| Memory                            | Không giữ file > 10MB trong RAM lâu hơn request   |

---

## ✅ 9. Acceptance Criteria

| ID    | Criterion                                                                | Test                                  |
| ----- | ------------------------------------------------------------------------ | ------------------------------------- |
| AC-01 | Import 100 bot từ 1 CSV, dry-run không mutate DB (count bot không đổi)   | Integration + DB assert               |
| AC-02 | Create tạo đúng N bot với status/knowledge/personality/skills chuẩn      | Integration                           |
| AC-03 | Quota chặn đúng theo plan chủ workspace                                  | Integration (mock subscription)       |
| AC-04 | Chỉ owner/admin gọi được API                                             | Integration (3 roles)                 |
| AC-05 | Re-import failed rows hoạt động                                          | Integration                           |
| AC-06 | Báo cáo per-row chính xác (index, reason)                                | Unit + Integration                    |
| AC-07 | Không regression flow tạo bot đơn (`POST /api/bots/create` + onboarding) | Regression: lint, build, test hiện có |
| AC-08 | `npm run lint` + `npm run build` pass                                    | CI                                    |
| AC-09 | Docs/README cập nhật mô tả tính năng                                     | Manual review                         |

---

## 📦 10. Deliverables Checklist

### 10.1 Documentation

- [x] Spec này (`docs/specs/bulk-bot-creation.md`)
- [ ] File mẫu import: `docs/specs/templates/bulk-bot-import-template.csv`
- [ ] README section "Bulk bot creation" (cách chuẩn bị file, giới hạn)

### 10.2 Code

- [ ] `npm i xlsx` (+ types nếu cần)
- [ ] `lib/constants/bulk-import.ts` — limits
- [ ] `lib/services/bulk-bot.service.ts` — parse/validate/quota/slug/create
- [ ] `app/api/bots/bulk-create/route.ts` — dry-run | create
- [ ] `hooks/dashboard/main/useBulkImport.ts` — state machine wizard
- [ ] Page `/dashboard/bots/import` (4 bước: upload → mapping → template+preview → confirm/report)
- [ ] Nút "Import nhiều bot" trên dashboard bots list
- [ ] Tests: unit (parse/validate/slug/quota) + integration (dry-run/create/403/401)

### 10.3 DevOps

- [ ] (Không cần) — không migration, không env mới, không cron

---

## 🤔 11. Open Questions — **[STATUS: RESOLVED]**

| #     | Question                                 | Decision                                            | Rationale                                                                       |
| ----- | ---------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------- |
| OQ-01 | Nguồn kiến thức: docx/bot hay file tổng? | **Track A: cột text trong file import**             | User chốt chỉ Track A; docx/bot (Track B) để sau                                |
| OQ-02 | Tài khoản học sinh?                      | **Không provisioning** — bot gán chủ workspace      | Logic Hub quản lý 1 workspace                                                   |
| OQ-03 | Config chung nào cần per-bot?            | **Chỉ name/slug/avatar_url/website_url/knowledge**  | Welcome/màu/câu hỏi gợi ý dùng widget mặc định                                  |
| OQ-04 | Personality + skills?                    | **Template chung (bulk), cột override tùy chọn**    | User yêu cầu bulk-set                                                           |
| OQ-05 | Bot limit nguồn?                         | **plans.bots_limit của subscription chủ workspace** | Enterprise sau chỉ thêm row plan                                                |
| OQ-06 | Parse file ở đâu?                        | **Client-side (`xlsx` trong browser)**              | Bớt 1 route API, preview tức thì; server vẫn tự parse lại để validate (defense) |
| OQ-07 | Avatar trong phase này?                  | **Chỉ avatar_url remote**                           | Upload ảnh hàng loạt để phase sau                                               |
| OQ-08 | Website + knowledge cùng dòng?           | **Tạo page manual, không queue discover**           | Giữ đơn giản; crawl website = tính năng riêng sau                               |

---

## 📝 12. Appendix: Socratic Question Log

| Phase       | Question | Finding                                                              | Resolution                                              |
| ----------- | -------- | -------------------------------------------------------------------- | ------------------------------------------------------- |
| Quota       | Q1-Q3    | bots_limit theo user subscription; race có thể double-insert         | FOR UPDATE + re-check; quota theo owner                 |
| File        | Q4-Q8    | Chưa có lib parse; cột tùy ý; slug UNIQUE global                     | xlsx dep; column mapping; slug dedupe; validate per-row |
| Knowledge   | Q9-Q11   | 100 job OK qua queue; credit theo page; kẹt Indexing do retry có sẵn | Enqueue thẳng; dry-run check credits; report per-row    |
| Security    | Q12-Q14  | Role owner/admin; file parse rủi ro; workspaceId spoof               | Membership check; RAM parse; verify workspace trước     |
| Idempotency | Q15-Q16  | Import lại tạo trùng; request dài                                    | Re-import failed rows; slug-exists error; timeout UX    |

---

## 🛠️ 13. Implementation Task Breakdown (cho agy delegation)

| Task | Nội dung                                                                                                                                   | Verify              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| T1   | Dep `xlsx` + `lib/constants/bulk-import.ts` + `lib/services/bulk-bot.service.ts` (parse/validate/quota/slug/resolve template) + unit tests | vitest + lint       |
| T2   | `app/api/bots/bulk-create/route.ts` (dry-run + create, membership check, FOR UPDATE, credit, enqueue) + integration tests                  | vitest + lint       |
| T3   | Frontend: `useBulkImport.ts` + `/dashboard/bots/import` wizard (upload→mapping→template+preview→confirm/report) + nút entry                | lint + build        |
| T4   | File mẫu CSV + README + test regression toàn bộ (lint → format → build)                                                                    | lint + build + test |

Mỗi task: delegate agy → `npm run lint && npm run build` → conventional commit (`feat(workspace): bulk bot creation — task N`).

---

**End of Specification**

> **Next Steps**: Review with stakeholder → Approve → T1 via agy → verify → T2 → T3 → T4.
