# Implementation Plan: Multilingual Support (Full Coverage)

**Spec Reference**: `docs/specs/i18n-multilingual/spec.md` (v2.0)  
**Status**: Ready for Review  
**Author**: Tech Lead / System Architect

---

## 1. Technical Approach & Architecture

### 1.1. Kiến trúc 4 Lớp (Hybrid + Widget)

- **L1 — Public Routes**: `next-intl` with URL locale prefix (`/en/...`, `/vi/...`) for SEO.
- **L2 — Dashboard / Auth**: Cookie (`NEXT_LOCALE`) + Supabase DB (`profiles.locale`) without URL prefix.
- **L3 — Widget Chat**: `widget_settings.ui_language` (JSONB) per bot, independent from platform locale.
- **L4 — Excluded Paths**: `/chat`, `/public-bot`, `/api`, `/shopify` untouched.

### 1.2. Platform Locale vs Widget Locale — Phân tách rõ ràng

```
┌─────────────────────────────────────────────┐
│  PLATFORM LOCALE (L1 + L2)                  │
│  - User preference (cookie + DB)             │
│  - Controls: dashboard, public pages         │
│  - Scope: toàn workspace                     │
│  - User action: toggle trong profile         │
├─────────────────────────────────────────────┤
│  WIDGET LOCALE (L3)                          │
│  - Bot owner setting (JSONB)                 │
│  - Controls: widget.js, StandaloneChatUI,    │
│              GroupChatView                    │
│  - Scope: per-bot                            │
│  - Owner action: SettingsTab in bot-detail   │
└─────────────────────────────────────────────┘
```

**Key insight**: Widget locale KHÔNG phụ thuộc platform locale. Mỗi bot có thể phục vụ khách hàng với ngôn ngữ khác nhau, hoàn toàn independent.

### 1.3. Widget Localization Architecture

```typescript
// 1. Database: bots.widget_settings JSONB
{
  "position": "bottom-right",
  "primaryColor": "#3B82F6",
  "ui_language": "en"  // ← ELanguage enum
}

// 2. API: /api/widget/init returns bot data with widget_settings
// 3. Client: widget.js reads ui_language from bot data
// 4. Client: StandaloneChatUI + GroupChatView reads bot.widget_settings.ui_language
```

### 1.4. Translation Strategy per Layer

| Layer          | Translation Source                      | Runtime                     | Bundle Impact   |
| -------------- | --------------------------------------- | --------------------------- | --------------- |
| L1 (Public)    | `messages/{locale}.json`                | Server + Client (next-intl) | ~3KB per locale |
| L2 (Dashboard) | `messages/{locale}.json`                | Client (next-intl)          | Shared with L1  |
| L3 (Widget)    | Inline translations object in widget.js | Client (plain JS)           | ~1KB per locale |

**Widget translations are NOT loaded from next-intl** — widget.js is plain JavaScript (not TypeScript, not in Next.js build pipeline). Uses simple key-value translation object.

---

## 2. Data Model & Database Changes

### 2.1. `public.profiles` Table Extension

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'vi';
```

### 2.2. `public.bots` Table — widget_settings JSONB

No migration needed — `widget_settings` already exists as JSONB. Add `ui_language` field:

```sql
-- Optional: Backfill existing bots with default language
UPDATE public.bots
SET widget_settings = jsonb_set(
  COALESCE(widget_settings, '{}'::jsonb),
  '{ui_language}',
  '"vi"'
)
WHERE widget_settings->>'ui_language' IS NULL;
```

### 2.3. RLS Policies

```sql
-- profiles: User can read/update own profile
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- bots: Owner can update widget_settings (existing RLS should cover this)
```

### 2.4. Workspace Slug Reservation

```typescript
// config/reserved-subdomains.ts — add "en", "vi"
export const RESERVED_SUBDOMAINS = [
  "admin", "api", "dashboard", ..., "en", "vi"
];
```

---

## 3. Step-by-Step Implementation Plan

### Phase 0: PoC — Foundation (1-2 days)

| Task | Description                                                                                      | Layer |
| ---- | ------------------------------------------------------------------------------------------------ | ----- |
| 0.1  | Add `"en"`, `"vi"` to `config/reserved-subdomains.ts` + DB constraint                            | L1    |
| 0.2  | Install `next-intl`, create `i18n.ts` config + `messages/{en,vi}.json`                           | L1    |
| 0.3  | Refactor middleware for locale composition (public paths only)                                   | L1    |
| 0.4  | Move `/pricing` to `app/[locale]/pricing/page.tsx`                                               | L1    |
| 0.5  | Verify PoC test cases (workspace slug, bot subdomain, chat, dashboard, Shopify, Accept-Language) | All   |

### Phase 1: Public Routes (3-5 days)

| Task | Description                                          | Layer |
| ---- | ---------------------------------------------------- | ----- |
| 1.1  | Restructure all public pages to `app/[locale]/...`   | L1    |
| 1.2  | Create Language Switcher for public header           | L1    |
| 1.3  | Add `hreflang` alternates to metadata                | L1    |
| 1.4  | Complete translation files (`messages/{en,vi}.json`) | L1    |

### Phase 2: Dashboard & Auth (5-7 days)

| Task | Description                                       | Layer |
| ---- | ------------------------------------------------- | ----- |
| 2.1  | Migration: Add `locale` column to `profiles`      | L2    |
| 2.2  | RLS policies for `profiles`                       | L2    |
| 2.3  | Update Supabase server client to read cookie      | L2    |
| 2.4  | Implement Language Toggle in Dashboard            | L2    |
| 2.5  | Apply translations to Dashboard layout/components | L2    |

### Phase 3: Widget Chat Localization (5-7 days) ⭐ MỚI

| Task | Description                                                           | Layer |
| ---- | --------------------------------------------------------------------- | ----- |
| 3.1  | Backfill `widget_settings.ui_language` for existing bots              | L3    |
| 3.2  | Add language selector to SettingsTab (bot-detail)                     | L3    |
| 3.3  | Update `useBotSettings` hook to handle `ui_language`                  | L3    |
| 3.4  | Create widget translations object (`lib/i18n/widget-translations.ts`) | L3    |
| 3.5  | Update `widget.js` to read `ui_language` + render localized strings   | L3    |
| 3.6  | Update `StandaloneChatUI` to use widget translations                  | L3    |
| 3.7  | Update `GroupChatView` to use widget translations                     | L3    |
| 3.8  | Update `MessageComposer`, `GroupDrawer`, `NoteDetailModal` etc.       | L3    |
| 3.9  | Update `LEAD_FORM_*` strings in LeadForm component                    | L3    |
| 3.10 | Widget locale test cases                                              | L3    |

---

## 4. Widget SettingsTab — UI Design

### 4.1. Location

Add **"Ngôn ngữ Widget"** card in `SettingsTab.tsx`, **sau section "Tính năng Chatbot"** (voice toggle) và **trước section "Trang chat độc lập"**.

### 4.2. UI Mockup

```
┌─────────────────────────────────────────────┐
│ 🌐 Ngôn ngữ Widget                          │
│ Chọn ngôn ngữ hiển thị cho widget chat       │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │ 🇻🇳  Tiếng Việt                    ▼    │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ Ngôn ngữ này áp dụng cho:                    │
│ • Widget nhúng (Embed)                       │
│ • Trang chat độc lập (Standalone)            │
│ • Trang chat nhóm (Group)                    │
│                                              │
│ Lưu ý: Không ảnh hưởng đến ngôn ngữ          │
│ Dashboard của workspace.                     │
│                                              │
│                    [Lưu cài đặt]             │
└─────────────────────────────────────────────┘
```

### 4.3. Props & State

```typescript
// SettingsTabProps — thêm ui_language
interface SettingsTabProps {
  bot: BotType;
  onStartBot: () => Promise<void>;
  onSaveRateLimit: () => Promise<void>;
  onSaveAllowedDomains: () => Promise<void>;
  onSaveSlugSettings: () => Promise<void>;
  onSaveAppearance?: (overrides?: {
    isVoiceEnabled?: boolean;
    navigation_enabled?: boolean;
    ui_language?: ELanguage; // ← Thêm
  }) => Promise<void>;
}

// useBotSettings hook — thêm ui_language state
const [uiLanguage, setUiLanguage] = useState<ELanguage>(
  bot.widget_settings?.ui_language || ELanguage.Vi
);
```

---

## 5. Widget Translations Architecture

### 5.1. Translation File Location

```typescript
// lib/i18n/widget-translations.ts
import { ELanguage } from "@/types/enums";

const WIDGET_TRANSLATIONS = {
  [ELanguage.Vi]: {
    welcome: "Xin chào! Tôi có thể giúp gì cho bạn?",
    typeMessage: "Nhập tin nhắn...",
    send: "Gửi",
    sendVoice: "Gửi tin nhắn thoại",
    error: "Đã xảy ra lỗi. Vui lòng thử lại.",
    // ... more strings
  },
  [ELanguage.En]: {
    welcome: "Hello! How can I help you?",
    typeMessage: "Type a message...",
    send: "Send",
    sendVoice: "Send voice message",
    error: "An error occurred. Please try again.",
    // ... more strings
  },
  [ELanguage.Ar]: {
    welcome: "مرحبا! كيف يمكنني مساعدتك؟",
    typeMessage: "اكتب رسالة...",
    send: "إرسال",
    sendVoice: "إرسال رسالة صوتية",
    error: "حدث خطأ. يرجى المحاولة مرة أخرى.",
    // ... more strings
  },
};

export function getWidgetTranslations(locale: ELanguage = ELanguage.Vi) {
  return WIDGET_TRANSLATIONS[locale] || WIDGET_TRANSLATIONS[ELanguage.Vi];
}
```

### 5.2. Usage in Components

```tsx
// components/chat/StandaloneChatUI.tsx
import { getWidgetTranslations } from '@/lib/i18n/widget-translations';

export function StandaloneChatUI({ bot, ... }: Props) {
  const uiLanguage = bot.widget_settings?.ui_language || ELanguage.Vi;
  const t = getWidgetTranslations(uiLanguage);

  return (
    <>
      <input placeholder={t.typeMessage} />
      <button>{t.send}</button>
    </>
  );
}
```

### 5.3. Usage in widget.js (Plain JS)

```javascript
// public/widget.js — embedded in customer's page
function getWidgetTranslations(locale) {
  const translations = {
    vi: { welcome: "Xin chào! Tôi có thể giúp gì cho bạn?" },
    en: { welcome: "Hello! How can I help you?" },
    ar: { welcome: "مرحبا! كيف يمكنني مساعدتك؟" },
  };
  return translations[locale] || translations.vi;
}

// Read from bot data
const t = getWidgetTranslations(botData.widget_settings?.ui_language || "vi");
```

---

## 6. Verification & Testing Plan

### PoC Test Cases (Phase 0)

1. Workspace slug `"en"` → rejected
2. Bot subdomain `{slug}.vielora.vn` → correct rewrite
3. `/chat/{slug}` → unchanged behavior
4. `/dashboard` redirect 308 with `NEXT_LOCALE` cookie → works
5. `/shopify` CSP headers → intact
6. `Accept-Language: en-US` → redirect to `/en/pricing`

### Widget Test Cases (Phase 3) ⭐ MỚI

7. Bot with `ui_language: "vi"` → widget renders Vietnamese
8. Bot with `ui_language: "en"` → widget renders English
9. StandaloneChatUI renders in bot's configured language
10. GroupChatView renders in bot's configured language
11. Changing widget language in SettingsTab → saves to DB → widget updates
12. Dashboard locale change does NOT affect widget language
13. New bot (no `ui_language` set) → defaults to Vietnamese
