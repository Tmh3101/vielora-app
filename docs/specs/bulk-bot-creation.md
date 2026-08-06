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

Transform the single-bot creation flow (wizard → `POST /api/bots/create`) into a **generic bulk-creation feature**: upload one CSV/Excel file containing N rows, map columns, dry-run validate every row, then batch-create bots (status=pending) with personality/skills applied in bulk and optional per-bot knowledge content fed into the existing indexing pipeline. Designed for any workspace (not Logic-Hub-specific), gated by the workspace owner's plan `bots_limit`, with a per-row success/error report and idempotent "re-import failed rows only".

**Core Principle**: _Bulk creation is the single-bot creation flow applied N times inside one request, with all validation moved before any mutation._

**Scope (Track A only)**: File import (CSV/XLSX) → dry-run → batch create → knowledge content (text column) → report. **Out of scope**: per-bot knowledge files (Track B), student account provisioning, avatar file uploads, enterprise subscription gating (comes later — only affects plan data, not code).

---

## 🎯 1. Business Requirements (User Vision)

> **Original User Description** (verbatim, condensed):
>
> > "Logic Hub có hơn 100 học sinh, tạo bot đơn lẻ rất mất thời gian. Cần tạo bot hàng loạt, trước tiên chỉ cần trên file. Giới hạn số lượng bot dựa trên số bot còn lại của workspace. Thiết kế generic để bất kỳ ai cũng dùng được, không chỉ Logic Hub. Workspace quản lý toàn bộ tài khoản (không cần provisioning). Per-bot khác nhau: tên, avatar (nếu có), slug. Không cần per-bot: welcome message, màu sắc, câu hỏi gợi ý. Personality + skill phải thiết lập hàng loạt. Nguồn kiến thức: 1 cột text trong file import (Track A)."

### 1.1 Extracted Requirements (Structured)

| ID    | Requirement                                                                            | Priority | Source                  |
| ----- | -------------------------------------------------------------------------------------- | -------- | ----------------------- |
| BR-01 | Upload 1 file (CSV/Excel) chứa nhiều bot, tạo tất cả trong 1 lần                       | P0       | User vision             |
| BR-02 | Giới hạn số bot tạo theo quota còn lại của workspace (plan `bots_limit` − bot hiện có) | P0       | User vision             |
| BR-03 | Generic: bất kỳ workspace nào cũng dùng được; không hardcode Logic Hub                 | P0       | User vision             |
| BR-04 | Per-bot khác nhau: name, slug, avatar_url; phần còn lại dùng giá trị chung             | P0       | User vision             |
| BR-05 | Personality + skills set hàng loạt (1 lần chọn cho tất cả dòng)                        | P0       | User vision             |
| BR-06 | Knowledge per bot qua cột text (knowledge_title + knowledge_content)                   | P0       | User decision (Track A) |
| BR-07 | Dry-run trước: preview từng dòng OK/lỗi kèm lý do, không mutate DB                     | P0       | BA analysis             |
| BR-08 | Báo cáo N thành công / M lỗi; cho phép import lại chỉ các dòng lỗi                     | P1       | BA analysis             |
| BR-09 | Không cần tạo tài khoản cho từng học sinh (workspace quản lý tất cả)                   | P1       | User vision             |
| BR-10 | File mẫu (template download) để user điền đúng format                                  | P1       | BA analysis             |

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

| Question                                                                | Analysis                                                           | Resolution                                                                                                                               |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Q4**: Format file nào? Chưa có lib parse CSV/Excel trong package.json | `xlsx` (SheetJS) là 1 dependency duy nhất đọc được cả CSV lẫn XLSX | **[Resolution]**: Thêm dependency `xlsx`; parse server-side, validate size ≤ 5MB, ≤ 500 dòng (`BULK_IMPORT_MAX_ROWS`)                    |
| **Q5**: Cột lạ / thiếu cột / sai header?                                | File của user tùy ý → phải generic                                 | **[Resolution]**: Column-mapping UI (auto-detect header → cho chỉnh bằng dropdown); dòng thiếu `name` → error per-row                    |
| **Q6**: Slug trống / trùng?                                             | `slug UNIQUE` global                                               | **[Resolution]**: sinh từ name + dedupe batch-local + DB check; dòng có slug tay bị trùng → error per-row (không tự sửa slug người dùng) |
| **Q7**: `website_url` sai format / domain không cho phép?               | `validateAllowedDomains` có sẵn                                    | **[Resolution]**: validate từng dòng như bot đơn; dòng lỗi → error per-row, không chặn cả batch                                          |
| **Q8**: Personality/skill name không tồn tại?                           | ai_personalities/ai_skills có UNIQUE name                          | **[Resolution]**: resolve tại bước template (trước dry-run): name sai → template error chặn cả batch (vì áp cho tất cả dòng)             |

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

### 4.1 File Format Spec (CSV / XLSX)

Header row bắt buộc; cột không bắt buộc có thể bỏ. Ký tự phân tách CSV: `,` (BOM UTF-8 hỗ trợ).

| Column              | Required | Type   | Rule                                                                                                                 |
| ------------------- | -------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| `name`              | ✅       | string | 1–100 chars, non-empty                                                                                               |
| `slug`              | ❌       | string | Pattern `^[a-z0-9]+(?:-[a-z0-9]+)*$`; trống → auto-generate từ name                                                  |
| `website_url`       | ❌       | string | http(s) hợp lệ + `validateAllowedDomains`; trống → file-mode (`manual-upload.local`)                                 |
| `avatar_url`        | ❌       | string | http(s) hợp lệ (không bắt buộc, không validate existence)                                                            |
| `personality`       | ❌       | string | Tên personality (resolve theo `ai_personalities.name`) — **giá trị chung từ template**, cột này là override tùy chọn |
| `skills`            | ❌       | string | Tên skills phân cách `,` — **giá trị chung từ template**, cột này là override tùy chọn                               |
| `knowledge_title`   | ❌       | string | ≤ 100 chars (`MAX_MANUAL_TITLE_LENGTH`); mặc định = bot name                                                         |
| `knowledge_content` | ❌       | string | ≤ 10.000 chars (`MAX_MANUAL_CONTENT_LENGTH`); nếu có → tạo 1 page manual_text                                        |

**Giới hạn**: ≤ 500 dòng/file, ≤ 5MB/file. File mẫu tải về: `docs/specs/templates/bulk-bot-import-template.csv` (header + 1 ví dụ).

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
    personalityName?: string; // resolve → personality_id, áp cho tất cả dòng
    skillNames?: string[]; // resolve → skill_ids, áp cho tất cả dòng
  };
  rows: Array<{
    name: string;
    slug?: string;
    websiteUrl?: string;
    avatarUrl?: string;
    personalityName?: string; // override per-row (tùy chọn)
    skillNames?: string[]; // override per-row (tùy chọn)
    knowledgeTitle?: string;
    knowledgeContent?: string;
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
export const BULK_IMPORT_MAX_ROWS = 500;
export const BULK_IMPORT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const BULK_IMPORT_ALLOWED_EXTENSIONS = [".csv", ".xlsx"];
```

### 4.5 API Route Tree

```
/api/bots
├── POST /create          # (hiện trạng, giữ nguyên)
└── POST /bulk-create     # (mới) dry-run | create
```

---

## 🔄 5. Migration Strategy

**Không có migration DB.** Không có thay đổi schema, RLS, hay trigger. Duy nhất một thay đổi dependency: `xlsx` (npm install). Triển khai feature flag không cần thiết (tính năng thêm mới, không đụng flow cũ).

| Phase | Action                                          | Rollback      |
| ----- | ----------------------------------------------- | ------------- |
| 1     | `npm i xlsx` + service layer + API route        | Revert commit |
| 2     | Frontend import page + column mapping + preview | Revert commit |
| 3     | Sample template + report/retry UI + docs        | Revert commit |

---

## 🎨 6. Frontend Spec

### 6.1 Entry Point

Nút **"Import nhiều bot"** (icon Upload) cạnh nút "Tạo bot" trên dashboard bots list → navigate `/dashboard/bots/import`. (Ẩn khi workspace hiện tại không có quyền owner/admin — check membership từ session.)

### 6.2 Page `/dashboard/bots/import` — 4 bước wizard

```
┌───────────────────────────────────────────────────────┐
│ Bước 1: Upload file                                    │
│  [Drop zone: CSV/XLSX, ≤5MB, ≤500 dòng]                │
│  [⬇ Tải file mẫu]        [Workspace: ▼ (mặc định hiện tại)] │
├───────────────────────────────────────────────────────┤
│ Bước 2: Ánh xạ cột (generic)                           │
│  Cột file → Field: name* [▼] slug [▼] website_url [▼]  │
│  avatar_url [▼] knowledge_content [▼] (auto-detect)    │
├───────────────────────────────────────────────────────┤
│ Bước 3: Template chung + Preview                       │
│  Tính cách: [▼]  Kỹ năng: [multi-select]               │
│  ┌─────────────────────────────────────────────┐      │
│  │ ✅ OK (98)  ⛔ Lỗi (2)   | Tên | Slug | ...  │      │
│  │ Quota: sẽ tạo 98 / còn 88 ⚠️ VƯỢT QUOTA      │      │
│  └─────────────────────────────────────────────┘      │
├───────────────────────────────────────────────────────┤
│ Bước 4: Xác nhận → Progress → Báo cáo                 │
│  ✅ 98 bot đã tạo  ⛔ 2 lỗi (kèm lý do từng dòng)       │
│  [Chỉ import lại các dòng lỗi]                         │
└───────────────────────────────────────────────────────┘
```

**Behavior**:

- Bước 1→2: file được gửi lên parse server-side (1 API call nhỏ `POST /api/bots/bulk-parse` trả header + rows gọn) — _hoặc_ parse client-side bằng `xlsx` (đơn giản hơn, không cần thêm route; **chọn parse client-side**, `xlsx` chạy được ở browser) → gửi rows JSON thẳng tới bulk-create.
- Bước 3: gọi `dry-run` (auto khi đủ mapping + template) → bảng preview + quota/credit summary; nút Xác nhận disabled khi `blocked: true`.
- Bước 4: gọi `create` → progress thanh (đếm theo response từng phần nếu stream; Phase 1: chờ response nguyên khối) → báo cáo + "re-import failed rows only".
- Quota/credit summary hiển thị cảnh báo rõ ràng trước confirm (không để user vượt quota mới biết).

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
| File > 500 dòng hoặc > 5MB                             | Reject ngay ở bước 1, message rõ                                                         |
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
| Memory                            | Không giữ file > 5MB trong RAM lâu hơn request    |

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
