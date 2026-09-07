# Quickstart & Validation Scenarios: Multilingual Support (Full Coverage)

**Spec Reference**: `docs/specs/i18n-multilingual/spec.md` (v2.0)  
**Plan Reference**: `docs/specs/i18n-multilingual/plan.md` (v2.0)  
**Status**: Ready for Execution  
**Author**: QA Engineer / Tech Lead

---

## 1. Quick Validation Guide (PoC Phase)

Follow these steps to validate Phase 0 (PoC) implementation:

### Step 1: Environment Setup

```bash
cd /home/hieutm/Work/Titops/Vielora/vielora
npm install
npm run dev
```

### Step 2: Run the 13 Mandatory Test Cases

#### Phase 0 — Platform (6 test cases)

| TC        | Scenario                       | Expected Result                                          | Verification                                                                                        |
| --------- | ------------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **TC-01** | Workspace Slug Collision       | Creating workspace with slug `"en"` or `"vi"` rejected   | DB insert throws constraint violation                                                               |
| **TC-02** | Bot Subdomain Routing          | `{slug}.vielora.vn` rewrites to `/public-bot/{slug}`     | Request `http://testbot.vielora.vn:3001`, expect bot view                                           |
| **TC-03** | Chat Routes Unaffected         | `/chat/my-chat-slug` renders directly                    | Visit `http://localhost:3001/chat/test-slug`, expect direct chat                                    |
| **TC-04** | Dashboard Redirect with Cookie | `/dashboard` with `NEXT_LOCALE=en` redirects correctly   | Set cookie, visit `/dashboard`, expect 308 redirect maintaining locale                              |
| **TC-05** | Shopify CSP Headers            | `/shopify` returns correct CSP header                    | `curl -I http://localhost:3001/shopify`, verify `frame-ancestors`                                   |
| **TC-06** | Accept-Language Header         | `/pricing` with `Accept-Language: en-US` → `/en/pricing` | `curl -H "Accept-Language: en-US" -I http://localhost:3001/pricing`, expect `Location: /en/pricing` |

#### Phase 3 — Widget (7 test cases) ⭐ MỚI

| TC        | Scenario                       | Expected Result                                          | Verification                                                                                 |
| --------- | ------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **TC-07** | Widget Vietnamese Localization | Bot with `ui_language: "vi"` → widget renders Vietnamese | Create bot with `widget_settings.ui_language = "vi"`, load widget, expect Vietnamese strings |
| **TC-08** | Widget English Localization    | Bot with `ui_language: "en"` → widget renders English    | Same with `"en"`, expect English strings                                                     |
| **TC-09** | StandaloneChatUI Localization  | `/chat/{slug}` renders in bot's configured language      | Visit `/chat/{slug}` for bot with `ui_language: "en"`, expect English UI                     |
| **TC-10** | GroupChatView Localization     | Group chat renders in bot's configured language          | Visit group chat for bot with `ui_language: "en"`, expect English UI                         |
| **TC-11** | SettingsTab Save               | Changing language in SettingsTab saves to DB             | Change dropdown, click Save, verify `widget_settings.ui_language` updated in DB              |
| **TC-12** | Platform/Widget Independence   | Dashboard locale change does NOT affect widget           | Change platform locale to `en`, verify widget still renders in bot's configured language     |
| **TC-13** | Default Fallback               | New bot without `ui_language` → Vietnamese               | Create bot, don't set `ui_language`, load widget, expect Vietnamese                          |

---

## 2. Automated Test Commands

```bash
# Lint check
npm run lint

# Build check (verifies TypeScript types and page compilation)
npm run build

# Type check
npx tsc --noEmit
```

---

## 3. Manual UI Checklist

### Platform (L1 + L2)

- [ ] Navigate to `http://localhost:3001/` → redirects to `/vi` (or `/en` based on browser header)
- [ ] Toggle language switcher on pricing page → URL updates from `/vi/pricing` to `/en/pricing`
- [ ] Log in to Dashboard → verify topbar and settings render in preferred language
- [ ] Change language preference in Dashboard → verify cookie `NEXT_LOCALE` updates + DB updates

### Widget (L3) ⭐ MỚI

- [ ] In bot-detail → SettingsTab, locate "Ngôn ngữ Widget" card
- [ ] Change language dropdown, click Save → verify success toast
- [ ] Load widget on customer's page → verify welcome message, placeholder, buttons in selected language
- [ ] Visit `/chat/{slug}` → verify StandaloneChatUI renders in bot's language
- [ ] Visit group chat → verify GroupChatView renders in bot's language
- [ ] Change dashboard language → verify widget language does NOT change

---

## 4. Language Extensibility Test

### Adding a New Language (e.g., French)

1. Add `Fr = 'fr'` to `ELanguage` enum in `types/enums.ts`
2. Create `messages/fr.json` for public pages (L1)
3. Add `fr` translations to `lib/i18n/widget-translations.ts` (L3)
4. Add `<SelectItem value="fr">Français</SelectItem>` to SettingsTab
5. Run `npm run gen:widget-i18n` to regenerate widget.js translations
6. Verify:
   - [ ] Public pages render in French at `/fr/pricing`
   - [ ] Widget renders in French when `ui_language: "fr"`
   - [ ] SettingsTab shows "Français" option
   - [ ] No DB migration needed
