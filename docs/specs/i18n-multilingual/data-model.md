# Database & Data Model: Multilingual Support (Full Coverage)

**Spec Reference**: `docs/specs/i18n-multilingual/spec.md` (v2.0)  
**Plan Reference**: `docs/specs/i18n-multilingual/plan.md` (v2.0)  
**Status**: Ready for Migration  
**Author**: System Architect / Database Lead

---

## 1. Schema Extensions

### 1.1. `public.profiles` Table (Platform Locale - L2)

Extend `public.profiles` to support user-level locale preferences for Dashboard and Auth:

```sql
-- Migration: 20260830_i18n_platform_locale.sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'vi';

-- Comment on column
COMMENT ON COLUMN public.profiles.locale IS 'User preferred language for platform UI (vi, en, ar). Default is vi.';
```

### 1.2. `public.bots` Table (Widget Locale - L3) ⭐ MỚI

**Không cần migration** — `widget_settings` đã tồn tại dưới dạng JSONB. Chỉ cần backfill và validate:

```sql
-- Backfill existing bots with default language (vi)
UPDATE public.bots
SET widget_settings = jsonb_set(
  COALESCE(widget_settings, '{}'::jsonb),
  '{ui_language}',
  '"vi"'
)
WHERE widget_settings->>'ui_language' IS NULL;

-- Optional: Add constraint to enforce valid ELanguage values
-- (Not recommended for JSONB; validate at application level instead)
```

### 1.3. `public.workspaces` Table (Workspace Slug Constraints)

To prevent collision with public locale prefixes (`/en`, `/vi`):

```sql
-- Add check constraint on workspaces.slug
ALTER TABLE public.workspaces
ADD CONSTRAINT check_reserved_locale_slugs
CHECK (slug NOT IN ('en', 'vi'));
```

---

## 2. Row Level Security (RLS) Policies

### 2.1. `public.profiles` RLS (L2)

Enable RLS and restrict users to only select and update their own profile:

```sql
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Users can only read their own profile
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- INSERT / UPDATE policy: Users can only insert or update their own profile
CREATE POLICY profiles_upsert_own ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);
```

### 2.2. `public.bots` RLS (L3)

Existing RLS should already cover bot updates. Verify that bot owners can update `widget_settings`:

```sql
-- Verify existing policy allows widget_settings update
-- Example existing policy (adjust as needed):
CREATE POLICY bots_update_own ON public.bots
  FOR UPDATE
  USING (auth.uid() = user_id);
```

---

## 3. TypeScript Definitions

### 3.1. Language Enums (`types/enums.ts`)

Reuses existing `ELanguage` — **không thay đổi**:

```typescript
// types/enums.ts (already exists in codebase)
export enum ELanguage {
  Vi = "vi",
  En = "en",
  Ar = "ar",
}

export { ELanguage as ESupportedLanguage };
```

**Extensibility**: Thêm ngôn ngữ mới (ví dụ: Tiếng Pháp):

```typescript
export enum ELanguage {
  Vi = "vi",
  En = "en",
  Ar = "ar",
  Fr = "fr", // ← Thêm mới
}
```

### 3.2. Bot Type Extension (`types/bots-api.ts`)

Update `Bot` interface to include `ui_language` in `widget_settings`:

```typescript
// types/bots-api.ts (line 187)
export interface Bot {
  id: string;
  user_id: string;
  workspace_id: string;
  // ... existing fields
  widget_settings: {
    position: string;
    primaryColor: string;
    welcomeMessage: string;
    suggestedQuestions: string[];
    ui_language: ELanguage; // ← Thêm field mới
  };
}
```

### 3.3. Profile Type Extension (`lib/supabase/types.ts`)

Update generated Supabase types:

```typescript
export interface Profile {
  id: string;
  updated_at?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  website?: string;
  locale: ELanguage; // Added for platform locale (L2)
}
```

---

## 4. Widget Translations Type (L3)

Create new type for widget translations:

```typescript
// lib/i18n/widget-translations.ts
export interface WidgetTranslations {
  welcome: string;
  typeMessage: string;
  send: string;
  sendVoice: string;
  error: string;
  loading: string;
  poweredBy: string;
  // Group chat specific
  groupTitle: string;
  groupDescription: string;
  joinGroup: string;
  leaveGroup: string;
  // Lead form specific
  leadFormTitle: string;
  leadFormName: string;
  leadFormEmail: string;
  leadFormPhone: string;
  leadFormMessage: string;
  leadFormSubmit: string;
  leadFormSuccess: string;
  // Note specific
  noteTitle: string;
  noteSave: string;
  noteDelete: string;
}

export type WidgetLocale = keyof typeof ELanguage;
```

---

## 5. Migration Execution Plan

### 5.1. Pre-checks

1. Run `mcp__supabase__execute_sql` to confirm `public.profiles` table exists and current columns.
2. Run `mcp__supabase__execute_sql` to confirm `public.bots.widget_settings` column exists and is JSONB.
3. Run `mcp__supabase__execute_sql` to confirm `public.workspaces.slug` column exists.

### 5.2. Apply Migrations

1. **Phase 2 (L2)**: Execute `20260830_i18n_platform_locale.sql` via Supabase CLI or `mcp__supabase__execute_sql`.
2. **Phase 3 (L3)**: Execute backfill for `widget_settings.ui_language` via `mcp__supabase__execute_sql`.
3. **Phase 0 (L1)**: Add constraint to `public.workspaces.slug` via `mcp__supabase__execute_sql`.

### 5.3. Verify RLS

1. Check active RLS policies on `public.profiles`.
2. Check active RLS policies on `public.bots`.
3. Test with authenticated user sessions.

### 5.4. Test Queries

```sql
-- Test profile locale read
SELECT locale FROM public.profiles WHERE id = 'user-uuid';

-- Test profile locale update
UPDATE public.profiles SET locale = 'en' WHERE id = 'user-uuid';

-- Test bot widget_settings read
SELECT widget_settings->>'ui_language' FROM public.bots WHERE id = 'bot-uuid';

-- Test bot widget_settings update
UPDATE public.bots SET widget_settings = jsonb_set(
  widget_settings,
  '{ui_language}',
  '"en"'
) WHERE id = 'bot-uuid';
```

---

## 6. Validation Rules

### 6.1. Platform Locale (L2)

- Must be one of `ELanguage` values (`vi`, `en`, `ar`)
- Default: `'vi'`
- Enforced by: TypeScript type + DB DEFAULT

### 6.2. Widget Locale (L3)

- Must be one of `ELanguage` values (`vi`, `en`, `ar`)
- Default: `'vi'` (backfill)
- Enforced by: Application-level validation (not DB constraint)
- Fallback: If missing or invalid, use `'vi'`

### 6.3. Validation Function

```typescript
// lib/i18n/validation.ts
import { ELanguage } from "@/types/enums";

export function isValidELanguage(value: string): value is ELanguage {
  return Object.values(ELanguage).includes(value as ELanguage);
}

export function getSafeELanguage(value: string | undefined): ELanguage {
  return isValidELanguage(value) ? value : ELanguage.Vi;
}
```

---

## 7. Extensibility: Adding New Language

### Step-by-step for adding French (fr)

1. **Enum Extension** (types/enums.ts):

   ```typescript
   export enum ELanguage {
     Vi = "vi",
     En = "en",
     Ar = "ar",
     Fr = "fr", // ← Add new
   }
   ```

2. **Public Translations** (L1):
   - Create: `messages/fr.json`
   - Add all required keys

3. **Widget Translations** (L3):

   ```typescript
   // lib/i18n/widget-translations.ts
   const WIDGET_TRANSLATIONS = {
     // ... existing
     [ELanguage.Fr]: {
       welcome: "Bonjour ! Comment puis-je vous aider ?",
       typeMessage: "Tapez un message...",
       send: "Envoyer",
       // ... all other keys
     },
   };
   ```

4. **UI Select Options** (SettingsTab.tsx):

   ```tsx
   <SelectItem value="fr">Français</SelectItem>
   ```

5. **No DB Migration Required**
   - JSONB accepts any string value
   - Enum ensures type safety at compile time
   - Validation function ensures runtime safety

**Time estimate**: < 1 hour for experienced developer
