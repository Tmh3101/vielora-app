# Task Breakdown: Multilingual Support (Full Coverage)

**Plan Reference**: `docs/specs/i18n-multilingual/plan.md` (v2.0)  
**Spec Reference**: `docs/specs/i18n-multilingual/spec.md` (v2.0)  
**Status**: Ready for Implementation  
**Author**: Engineering Manager

---

## Task List

### Phase 0: PoC — Foundation (1-2 days)

| #   | Task                                       | Description                                                                                                                                                                                              | Size | Role          | Skill Required                                   | Dependencies |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------- | ------------------------------------------------ | ------------ |
| 0.1 | Add reserved locale slugs to config        | Update `config/reserved-subdomains.ts` to add `"en"` and `"vi"` to `RESERVED_SUBDOMAINS` and `RESERVED_PATHS`. Add DB check constraint for `workspaces.slug`.                                            | XS   | Backend Dev   | `vielora-codebase`, `find-skills`                | None         |
| 0.2 | Install and configure next-intl            | `npm install next-intl`. Create `i18n.ts` config with locales `['vi', 'en']`, default `vi`. Create `messages/en.json` and `messages/vi.json` with base translations.                                     | S    | Fullstack Dev | `find-skills`                                    | None         |
| 0.3 | Refactor middleware for locale composition | Compose existing middleware with `next-intl`. Apply `next-intl` ONLY to public paths (`/, /pricing, /legal, /about, /contact, /terms, /privacy`).                                                        | M    | Tech Lead     | `vielora-codebase`, `find-skills`, `spec-review` | 0.2          |
| 0.4 | Move pricing page to locale route          | Restructure `app/(public)/pricing/page.tsx` → `app/[locale]/pricing/page.tsx`. Update imports and translations.                                                                                          | S    | Frontend Dev  | `vielora-agy-orchestration`, `find-skills`       | 0.3          |
| 0.5 | Verify 6 PoC test cases                    | Run manual tests: (1) workspace slug "en" not rewritten, (2) bot subdomain works, (3) /chat routes unchanged, (4) /dashboard redirect with cookie, (5) Shopify CSP intact, (6) Accept-Language redirect. | S    | QA Engineer   | `manual-testing-catalog`, `find-skills`          | 0.4          |

**Checkpoint: Phase 0 Complete**

- [ ] All 6 PoC test cases pass
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] No regression in workspace routing, bot subdomain, chat routes

---

### Phase 1: Public Routes Expansion (3-5 days)

| #   | Task                                          | Description                                                                                                                                     | Size | Role         | Skill Required                             | Dependencies |
| --- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------ | ------------------------------------------ | ------------ |
| 1.1 | Restructure all public pages to locale routes | Move `app/(public)/legal`, `/about`, `/contact`, `/terms`, `/privacy` → `app/[locale]/legal`, etc. Update layout to include `[locale]` segment. | M    | Frontend Dev | `vielora-agy-orchestration`, `find-skills` | Phase 0      |
| 1.2 | Create Language Switcher for public header    | Add locale toggle in public navigation. Uses `useRouter` from `next-intl/navigation` to switch locale preserving path.                          | S    | Frontend Dev | `vielora-agy-orchestration`, `find-skills` | 1.1          |
| 1.3 | Add hreflang alternates to metadata           | In `app/[locale]/layout.tsx`, generate `<link rel="alternate" hreflang="en" href="..." />` and `hreflang="vi"` for SEO. Include `x-default`.    | S    | Frontend Dev | `find-skills`                              | 1.1          |
| 1.4 | Expand translation files                      | Complete `messages/en.json` and `messages/vi.json` for all public page content.                                                                 | M    | Content/Dev  | `find-skills`                              | 1.1          |

**Checkpoint: Phase 1 Complete**

- [ ] All public pages accessible at `/en/...` and `/vi/...`
- [ ] Language switcher works and persists URL path
- [ ] SEO metadata (hreflang) present on all public pages
- [ ] `npm run build` && `npm run lint` pass

---

### Phase 2: Dashboard & Auth — Cookie + DB (5-7 days)

| #   | Task                                              | Description                                                                                                                      | Size | Role          | Skill Required                                           | Dependencies |
| --- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------- | -------------------------------------------------------- | ------------ |
| 2.1 | Add locale column migration                       | Create Supabase migration: `ALTER TABLE public.profiles ADD COLUMN locale TEXT NOT NULL DEFAULT 'vi';`. Run via Supabase MCP.    | XS   | Backend Dev   | `supabase-mcp-config`, `vielora-codebase`, `find-skills` | Phase 1      |
| 2.2 | Create RLS policies for profiles                  | Add `profiles_select_own` and `profiles_update_own` policies. Verify via Supabase MCP.                                           | XS   | Backend Dev   | `supabase-mcp-config`, `find-skills`                     | 2.1          |
| 2.3 | Update Supabase server client to read cookie      | Modify server components to read `NEXT_LOCALE` cookie and use as fallback for `profiles.locale`.                                 | S    | Backend Dev   | `vielora-codebase`, `find-skills`                        | 2.2          |
| 2.4 | Implement Language Toggle in Dashboard            | Add dropdown in user menu to switch locale. On change: call API to update `profiles.locale` + set `NEXT_LOCALE` cookie.          | M    | Fullstack Dev | `vielora-agy-orchestration`, `find-skills`               | 2.3          |
| 2.5 | Apply translations to Dashboard layout/components | Wrap dashboard layout with `next-intl` provider. Update key components (sidebar, settings, onboarding) to use `useTranslations`. | M    | Frontend Dev  | `vielora-agy-orchestration`, `find-skills`               | 2.4          |

**Checkpoint: Phase 2 Complete**

- [ ] Dashboard renders in selected locale via cookie/DB (no URL prefix)
- [ ] Language preference persists across sessions
- [ ] RLS policies enforce user can only read/update own locale
- [ ] Plan gating respected (Free plan → only Vietnamese option)
- [ ] `npm run build` && `npm run lint` pass

---

### Phase 3: Widget Chat Localization (5-7 days) ⭐ MỚI

| #    | Task                                 | Description                                                                                                                                                                          | Size | Role         | Skill Required                             | Dependencies |
| ---- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ------------ | ------------------------------------------ | ------------ |
| 3.1  | Create widget translations library   | Create `lib/i18n/widget-translations.ts` with translations for all widget UI strings (welcome, placeholder, send, errors, etc.) in Vi/En/Ar. Export `getWidgetTranslations(locale)`. | M    | Backend Dev  | `vielora-codebase`, `find-skills`          | Phase 2      |
| 3.2  | Add language selector to SettingsTab | Add "Ngôn ngữ Widget" Card in `SettingsTab.tsx` with Select component for ELanguage. Wire to `onSaveAppearance({ ui_language })`.                                                    | S    | Frontend Dev | `vielora-agy-orchestration`, `find-skills` | 3.1          |
| 3.3  | Update useBotSettings hook           | Add `uiLanguage` state + handler in `hooks/dashboard/bot-detail/useBotSettings.ts`. Persist to `widget_settings.ui_language`.                                                        | S    | Backend Dev  | `vielora-codebase`, `find-skills`          | 3.2          |
| 3.4  | Backfill existing bots               | Run UPDATE to add `ui_language: "vi"` to existing bots' `widget_settings` JSONB.                                                                                                     | XS   | Backend Dev  | `supabase-mcp-config`, `find-skills`       | 3.3          |
| 3.5  | Update widget.js for locale          | Modify `public/widget.js` to read `botData.widget_settings.ui_language` and apply translations for welcome message, placeholder, etc.                                                | M    | Frontend Dev | `vielora-agy-orchestration`, `find-skills` | 3.1          |
| 3.6  | Update StandaloneChatUI              | Add locale-aware rendering in `components/chat/StandaloneChatUI.tsx`. Read `bot.widget_settings.ui_language`, use `getWidgetTranslations()`.                                         | M    | Frontend Dev | `vielora-agy-orchestration`, `find-skills` | 3.1          |
| 3.7  | Update GroupChatView                 | Add locale-aware rendering in `components/chat/group/GroupChatView.tsx`. Read `bot.widget_settings.ui_language`, use `getWidgetTranslations()`.                                      | M    | Frontend Dev | `vielora-agy-orchestration`, `find-skills` | 3.1          |
| 3.8  | Update GroupChat sub-components      | Update `MessageComposer`, `GroupDrawer`, `GroupInvitePrompt`, `GroupDisabledView`, `NoteDetailModal`, `NoteEditorModal`, `NoteBanner` to use widget translations.                    | M    | Frontend Dev | `vielora-agy-orchestration`, `find-skills` | 3.6, 3.7     |
| 3.9  | Update LeadForm                      | Update `components/chat/LeadForm.tsx` to use widget translations for form labels, placeholders, button text.                                                                         | S    | Frontend Dev | `vielora-agy-orchestration`, `find-skills` | 3.1          |
| 3.10 | Widget locale test cases             | Verify 7 widget test cases: widget renders correct language, StandaloneChatUI, GroupChatView, SettingsTab saves, independence from dashboard locale, default fallback.               | S    | QA Engineer  | `manual-testing-catalog`, `find-skills`    | 3.5-3.9      |

**Checkpoint: Phase 3 Complete**

- [ ] Widget renders in bot's configured language (vi/en/ar)
- [ ] StandaloneChatUI + GroupChatView localized
- [ ] SettingsTab language selector saves to DB
- [ ] Dashboard locale change does NOT affect widget
- [ ] Default fallback to Vietnamese works
- [ ] `npm run build` && `npm run lint` pass

---

## Parallelization Notes

| Safe to Parallelize                              | Must Be Sequential                           |
| ------------------------------------------------ | -------------------------------------------- |
| Tasks 0.1, 0.2 (independent)                     | 0.3 depends on 0.2                           |
| Tasks 1.1, 1.2, 1.3, 1.4 (all depend on Phase 0) | 2.2 depends on 2.1                           |
| Tasks 2.3, 2.4 can parallel after 2.2            | 2.4 depends on 2.3 for cookie logic          |
| Tasks 3.1, 3.2, 3.3 (after Phase 2)              | 3.5-3.9 depend on 3.1 (translations library) |
| Tasks 3.5, 3.6, 3.7, 3.9 (all depend on 3.1)     | 3.10 depends on all Phase 3 tasks            |

---

## Risk Register

| Risk                                          | Impact | Mitigation                                               |
| --------------------------------------------- | ------ | -------------------------------------------------------- |
| Middleware composition breaks existing routes | High   | PoC phase validates 6 critical paths; rollback if needed |
| Workspace slug collision with "en"/"vi"       | High   | Reserved in config + DB constraint (Task 0.1)            |
| Widget locale not applied (backward compat)   | Medium | Default to `vi` when `ui_language` missing in JSONB      |
| Translation key mismatch between en/vi        | Low    | CI check for key parity; automated tooling               |
| Widget.js bundle size increase                | Low    | Translations object ~1KB per locale; lazy load if needed |

---

## Verification Commands

```bash
# After each task
npm run lint && npm run build

# PoC verification (Phase 0)
# TC-1: Create workspace with slug "en" → should fail
# TC-2: Visit {slug}.vielora.vn → should load bot
# TC-3: Visit /chat/test-slug → should load chat
# TC-4: Visit /dashboard with NEXT_LOCALE=en cookie → should redirect correctly
# TC-5: Visit /shopify → should have CSP header
# TC-6: curl -H "Accept-Language: en-US" /pricing → should redirect to /en/pricing

# Widget verification (Phase 3)
# TC-7: Bot with ui_language:"vi" → widget renders Vietnamese
# TC-8: Bot with ui_language:"en" → widget renders English
# TC-9: StandaloneChatUI renders in bot's language
# TC-10: GroupChatView renders in bot's language
# TC-11: Change language in SettingsTab → saves to DB → widget updates
# TC-12: Change dashboard locale → widget language unchanged
# TC-13: New bot without ui_language → defaults to Vietnamese
```

---

## Next Steps

1. Human reviews and approves this task breakdown
2. Begin Phase 0 Task 0.1 (update reserved-subdomains.ts)
3. Execute sequentially with checkpoints

**Tasks tracked in:** `docs/specs/i18n-multilingual/tasks.md`
