# Feature Specification: Multilingual Support (i18n) — Toàn hệ thống

**Feature Name**: Multilingual Support (Full Coverage)  
**Status**: Approved  
**Author**: BA / Product Manager  
**Version**: 2.0  
**Target Release**: Phase 0 (PoC) → Phase 1 (Public) → Phase 2 (Dashboard) → Phase 3 (Widget)  
**Supersedes**: v1.0 (thêm widget locale + mở rộng ngôn ngữ)

---

## 1. Executive Summary & Problem Statement

### 1.1. Background & Problem

Vielora currently operates with a Vietnamese-only interface. As Vielora expands internationally and serves multi-tenant businesses with global teams and customers, offering full English UI support is essential. **Bao gồm cả widget chat** (StandaloneChatUI, GroupChatView, widget.js) — nơi khách hàng cuối tương tác trực tiếp.

### 1.2. High-Level Goal

Enable a full multilingual user interface across **toàn bộ Vielora** — từ public pages, dashboard, đến widget chat — **không phá vỡ** multi-tenant architecture, workspace routing, hoặc bot widget embedding.

### 1.3. Kiến trúc 4 Lớp (Full Coverage)

| Lớp    | Khu vực                                                  | Cơ chế                                              | Ưu tiên      |
| ------ | -------------------------------------------------------- | --------------------------------------------------- | ------------ |
| **L1** | Public Pages (landing, pricing, legal)                   | **URL Prefix** (`/en/...`, `/vi/...`)               | P0           |
| **L2** | Dashboard + Auth                                         | **Cookie + DB** (`NEXT_LOCALE` + `profiles.locale`) | P1           |
| **L3** | Widget Chat (widget.js, StandaloneChatUI, GroupChatView) | **Bot-level JSONB** (`widget_settings.ui_language`) | P1           |
| **L4** | Chat routes, API, Shopify                                | **Không áp dụng i18n**                              | Out of scope |

---

## 2. Target Persona & User Stories

### Persona 1: International Workspace Member

_As an English-speaking team member, I want the dashboard to render in English._

- **AC**: Selecting "English" updates dashboard text immediately. Preference persists (cookie + DB).

### Persona 2: Global Visitor / Prospect

_As an international prospective customer, I want marketing pages in English via SEO-friendly URLs._

- **AC**: `/en/pricing` renders English. First-time visitors auto-directed via `Accept-Language`.

### Persona 3: Workspace Admin

_As a Workspace Admin, I want to configure bot widget language for my customers._

- **AC**: SettingsTab has language selector. Each bot can have different widget language.

### Persona 4: End Customer (Bot User) ⭐ MỚI

_As a customer interacting with a chatbot, I want the widget interface (welcome message, buttons, placeholders) in my language._

- **AC**: Widget renders in language set by bot owner. Welcome message, input placeholder, send button all localized.

### Persona 5: Bot Owner ⭐ MỚI

_As a bot owner serving international customers, I want to set widget language per bot without changing my dashboard language._

- **AC**: Widget locale is independent from platform locale. Bot owner sets it in SettingsTab.

---

## 3. Scope Boundary

### 3.1. In Scope (Full Coverage)

#### L1: Public Marketing Routes (`app/[locale]/...`)

- `/`, `/pricing`, `/legal`, `/about`, `/contact`, `/terms`, `/privacy`
- SEO-optimized via URL locale prefix

#### L2: Dashboard & Auth

- User language toggle in topbar / profile settings
- Cookie (`NEXT_LOCALE`) + DB (`public.profiles.locale`) persistence
- No URL prefix change inside dashboard

#### L3: Widget Chat ⭐ MỚI

- **widget.js**: Welcome message, input placeholder, send button, error messages
- **StandaloneChatUI** (`components/chat/StandaloneChatUI.tsx`): Full chat UI strings
- **GroupChatView** (`components/chat/group/GroupChatView.tsx`): Group chat UI strings
- **SettingsTab** (`components/dashboard/bot-detail/tabs/SettingsTab.tsx`): Language selector UI
- **Database**: `widget_settings.ui_language` field (JSONB, sử dụng `ELanguage` enum)

#### L4: Out of Scope (không áp dụng i18n)

- `/chat/[slug]` — URL nhúng cứng
- `/public-bot/[slug]` — Subdomain routing
- `/api/*` — API routes
- `/shopify/*` — Shopify integration

### 3.2. Out of Scope (Future Phases)

1. **Blog System**: Remains in Vietnamese, no translation in MVP.
2. **Transactional Emails**: Separate workstream.
3. **Dynamic User-Generated Content**: AI responses, custom workspace content.

---

## 4. Key Functional Requirements (FR)

| ID        | Requirement                               | Acceptance Criteria                                                                         | Layer | Priority |
| --------- | ----------------------------------------- | ------------------------------------------------------------------------------------------- | ----- | -------- |
| **FR-01** | Public Route Locale Prefix                | `/en/pricing` displays English. Default redirects via `Accept-Language`.                    | L1    | P0       |
| **FR-02** | Reserved Subdomains & Slugs               | Workspace creation rejects `"en"` and `"vi"` as slugs.                                      | L1+L2 | P0       |
| **FR-03** | Dashboard Language Persistence            | Toggle saves to cookie + `profiles.locale`.                                                 | L2    | P1       |
| **FR-04** | Middleware Coexistence                    | Workspace routing, subdomain bot, Shopify CSP unaffected.                                   | L1+L2 | P0       |
| **FR-05** | Plan Gating                               | Free = Vietnamese only. Standard/Pro/Enterprise = Full i18n.                                | All   | P2       |
| **FR-06** | Widget Language Setting ⭐                | SettingsTab shows language selector per bot. Saves to `widget_settings.ui_language`.        | L3    | P1       |
| **FR-07** | Widget UI Localization ⭐                 | widget.js renders welcome message, placeholder, buttons in configured language.             | L3    | P1       |
| **FR-08** | StandaloneChatUI Localization ⭐          | Chat page renders UI strings in bot's configured language.                                  | L3    | P1       |
| **FR-09** | GroupChatView Localization ⭐             | Group chat renders UI strings in bot's configured language.                                 | L3    | P1       |
| **FR-10** | Platform vs Widget Locale Independence ⭐ | Changing dashboard locale does NOT affect widget language. Each bot has independent locale. | L3    | P1       |
| **FR-11** | Language Extensibility ⭐                 | Adding new language requires: enum + translation file + UI option. No DB migration needed.  | All   | P2       |

---

## 5. Non-Functional Requirements (NFR)

| ID         | Requirement   | Acceptance Criteria                                                  |
| ---------- | ------------- | -------------------------------------------------------------------- |
| **NFR-01** | Performance   | Middleware latency < 15ms. Widget locale lookup < 5ms (JSONB read).  |
| **NFR-02** | SEO           | Public pages include `<link rel="alternate" hreflang="..." />`.      |
| **NFR-03** | Security      | RLS on `profiles` and `bots` restricts write to owner only.          |
| **NFR-04** | Type Safety   | All translations use strongly typed keys. `ELanguage` enum enforced. |
| **NFR-05** | Extensibility | Adding new language: 4 steps, no DB migration, < 1 hour.             |

---

## 6. Edge Cases & Failure Scenarios

| #   | Scenario                                                    | Handling                                                              |
| --- | ----------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | Workspace slug `"en"` collision                             | Rejected by config + DB constraint (FR-02)                            |
| 2   | First-time anonymous user, `Accept-Language: fr`            | Fallback to `vi` (default locale)                                     |
| 3   | Bot owner sets widget language, customer loads widget       | Widget reads `widget_settings.ui_language` → renders in that language |
| 4   | Dashboard locale = `en`, widget locale = `vi`               | **Independent**: Dashboard renders English, widget renders Vietnamese |
| 5   | Bot owner doesn't set widget language                       | Fallback to `vi` (default)                                            |
| 6   | Invalid `ui_language` in `widget_settings`                  | Validate against `ELanguage` enum, fallback to `vi`                   |
| 7   | Widget.js loads but `widget_settings` missing `ui_language` | Default to `vi` (backward compatible)                                 |
| 8   | Adding new language (e.g., French)                          | Add enum value + translation file + UI option. No migration.          |

---

## 7. Success Metrics

- 100% pass rate on PoC test cases (Phase 0)
- Zero broken routes for workspace routing, bot subdomain, chat
- Widget renders correct language in StandaloneChatUI + GroupChatView
- Language toggle in SettingsTab saves to DB correctly
- New language can be added in < 1 hour without DB migration
- Sub-50ms render overhead for translated pages
