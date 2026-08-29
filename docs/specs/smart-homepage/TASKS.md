# TASKS: Smart Homepage (Intent‑Driven Navigation)

> **Source of truth**: `SPEC.md` (locked) + `PLAN.md` (architecture).  
> **Goal**: Each task below is small enough to be reviewed, tested, and merged independently.  
> **Estimated effort**: `S` = 1‑2 h, `M` = 3‑5 h, `L` = 6‑10 h, `XL` = 10+ h.

---

## Phase 1 – Data Model & Type Definitions (Foundation)

### T‑01: Extend `ChatResponseType` to include `NAVIGATE`

- **Files**: `types/widget-api.ts`
- **Steps**:
  - [ ] Add `"NAVIGATE"` to `ChatResponseType` union.
  - [ ] Add optional fields `url?: string`, `anchor?: string`, `explicit?: boolean` to `ChatData`.
  - [ ] Update JSDoc to explain when each type is returned.
- **Tests**: Type‑only; covered by `tsc --noEmit` in CI.
- **Effort**: `S`

### T‑02: Add `allowed_pages` schema to `widget_settings`

- **Files**: `types/widget-api.ts` (extend `WidgetSettings`)
- **Steps**:
  - [ ] Define `KeyActionPage` interface: `{path:string; anchor?:string|null; title:string; intent:string}`.
  - [ ] Add `allowed_pages?: KeyActionPage[]` to `WidgetSettings`.
  - [ ] Add runtime guard `MAX_ALLOWED_PAGES = 20` in `config/widget.ts`.
- **Effort**: `S`

### T‑03: Update `security_events` table (optional, P2 for V1)

- **Files**: `supabase/migrations/20260821_01_security_events.sql`
- **Steps**:
  - [ ] Create table `security_events(id, bot_id, visitor_id, url, reason, created_at)`.
  - [ ] Enable RLS (service‑role inserts only).
  - [ ] No client‑side reads in V1.
- **Note**: May be deferred if logging via console is acceptable for V1.
- **Effort**: `S`

---

## Phase 2 – Backend Implementation

### T‑04: Intent matcher utility

- **Files**: `lib/utils/intent-matcher.ts` (new)
- **Steps**:
  - [ ] Implement `matchKeyAction(userMessage:string, allowedPages:KeyActionPage[]): {url, anchor?, explicit} | null`.
  - [ ] Handle both explicit (exact `intent` match) and implicit (fuzzy title match) flows.
  - [ ] Case‑insensitive, trim whitespace.
  - [ ] Export `MAX_FUZZY_SCORE = 0.7` for future tuning.
- **Tests**: `__tests__/intent-matcher.test.ts` – 6 cases (explicit, implicit, no‑match, multi‑match, empty list, special chars).
- **Effort**: `M`

### T‑05: Security validator for navigation URLs

- **Files**: `lib/security/navigation-validator.ts` (new)
- **Steps**:
  - [ ] Re‑use `normalizeAllowedDomain` & `isOriginAllowedForWidget` from `lib/security/allowed-domains.ts`.
  - [ ] Add `validateNavigationTarget(url:string, bot:BotConfig): {ok:true} | {ok:false; reason:string}`.
  - [ ] Reject empty, malformed, or out‑of‑domain URLs.
- **Tests**: `__tests__/navigation-validator.test.ts` – 5 cases.
- **Effort**: `S`

### T‑06: Plan‑gating check in chat route

- **Files**: `app/api/widget/chat/route.ts`
- **Steps**:
  - [ ] Import `getBotActivePlanCode` and `SUGGESTED_QUESTIONS_ALLOWED_PLANS`.
  - [ ] After fetching `botData`, compute `planCode` (via `getBotActivePlanCode`).
  - [ ] Set `allowNavigation = SUGGESTED_QUESTIONS_ALLOWED_PLANS.includes(planCode as ESubscriptionPlan)`.
  - [ ] Skip navigation branch if `allowNavigation` is `false`.
- **Tests**: Integration test using a mock bot with `planCode = "free"` – response should not contain `type:"NAVIGATE"`.
- **Effort**: `S`

### T‑07: Wire intent matcher + security into chat route

- **Files**: `app/api/widget/chat/route.ts`
- **Steps**:
  - [ ] After generating Gemini response, call `matchKeyAction`.
  - [ ] If a match is found and plan allows it, call `validateNavigationTarget`.
  - [ ] On validation success, return `ChatResponse` with `type:"NAVIGATE"` and payload.
  - [ ] On validation failure, log to `console.warn` (or `security_events` table if T‑03 done) and fall back to `MESSAGE` response.
  - [ ] Preserve existing Gemini text in the `message` field for chat history.
- **Tests**: Integration tests – 4 scenarios (navigation ok, plan blocked, security blocked, no match).
- **Effort**: `M`

### T‑08: Server‑side security logging helper

- **Files**: `lib/security/security-logger.ts` (new)
- **Steps**:
  - [ ] Implement `logSecurityViolation({botId, visitorId, url, reason})`.
  - [ ] Insert into `security_events` table (if T‑03 done) OR `console.warn` for V1.
  - [ ] Make the function non‑blocking (fire‑and‑forget).
- **Tests**: Manual – verify console output or DB row.
- **Effort**: `S`

---

## Phase 3 – Front‑end Widget (`public/widget.js`)

### T‑09: Extend `state` object for navigation tracking

- **Files**: `public/widget.js`
- **Steps**:
  - [ ] Add `state.pendingNavigation = null` (holds `{url, timerId, countdownEl}` or `null`).
  - [ ] Add `state.navigationCancelled = false` flag.
- **Effort**: `S`

### T‑10: Implement `showNavigationBanner(url, title)` function

- **Files**: `public/widget.js`
- **Steps**:
  - [ ] Cancel any existing pending navigation.
  - [ ] Create overlay element with: page title, 3‑second countdown, **Cancel** button.
  - [ ] Use `setInterval` to update countdown text (3 → 0).
  - [ ] On timer end, call `window.location.href = url` and pass anchor if present.
  - [ ] On cancel click, clear timer, remove overlay, log cancellation to console.
- **Tests**: Manual in browser dev tools; Cypress E2E test (T‑17).
- **Effort**: `M`

### T‑11: Wire `NAVIGATE` response handler in `handleChatResponse`

- **Files**: `public/widget.js`
- **Steps**:
  - [ ] After existing `if (data.type === 'SHOW_LEAD_FORM')` block, add `if (data.type === 'NAVIGATE')`.
  - [ ] Branch on `data.explicit`: if `true`, immediate `window.location.href = url + '#' + anchor`; else call `showNavigationBanner`.
  - [ ] Update chat state (`state.conversationId`, append any text from `data.message`).
- **Effort**: `S`

### T‑12: Handle `state.pendingNavigation` reset on new chat messages

- **Files**: `public/widget.js`
- **Steps**:
  - [ ] In `sendMessage` (line ~1180), if `state.pendingNavigation` is not `null`, clear its timer and remove overlay **before** sending.
  - [ ] Set `state.pendingNavigation = null` after cancellation.
- **Effort**: `S`

### T‑A: Chat continuity via localStorage (FR‑4)

- **Files**: `public/widget.js`
- **Steps**:
  - [ ] Before `window.location.href = url`, call `localStorage.setItem('vielora_reopen_after_nav', '1')`.
  - [ ] On widget init, after fetching history via `/api/widget/init`, check flag; if set, auto‑open widget, scroll chat to last message, then `localStorage.removeItem('vielora_reopen_after_nav')`.
  - [ ] Edge: flag present but no history (cleared conversation) → still reopen, show empty state, clear flag.
- **Tests**: Manual – navigate from page A → page B; chat should auto‑open with previous messages.
- **Effort**: `M`

### T‑B: Anchor element wait + fallback (EC‑2)

- **Files**: `public/widget.js`
- **Steps**:
  - [ ] After navigation to `url#anchor`, on page load start a 3‑second `setInterval` polling `document.getElementById(anchor)`.
  - [ ] When element appears: `scrollIntoView({behavior:'smooth'})` and stop polling.
  - [ ] On timeout (3s): show non‑blocking message inside widget "Form not found on this page." and stop polling.
- **Tests**: Cypress – page without anchor; message appears after 3s.
- **Effort**: `S`

### T‑C: Cancellation event logging (AC‑3, BR‑3)

- **Files**: `app/api/widget/track-cancel/route.ts` (new), `public/widget.js`
- **Steps**:
  - [ ] Backend: new `POST /api/widget/track-cancel` accepting `{botId, visitorId, url, conversationId?}`; uses admin client to insert into `security_events` (or a new `navigation_events` table) with `action_type='CANCELLED_BY_USER'`.
  - [ ] Widget: on Cancel click, send the payload via `fetch` (fire‑and‑forget, no need to await).
  - [ ] Verify endpoint in `security/widget-security.ts` (origin + rate limit checks).
- **Tests**: Integration test – POST returns 200, row exists.
- **Effort**: `S`

### T‑D: Accessibility (ARIA) on countdown banner (NFR‑3)

- **Files**: `public/widget.js` (extend T‑10)
- **Steps**:
  - [ ] Banner wrapper: `role="alertdialog"`, `aria-labelledby="nav-banner-title"`, `aria-describedby="nav-banner-desc"`.
  - [ ] Countdown text: `aria-live="polite"`, `aria-atomic="true"`.
  - [ ] Cancel button: must be focusable (`tabindex="0"`), keyboard‑activatable (`onkeydown` for Enter/Space), have visible focus ring.
  - [ ] When banner appears, move focus to Cancel button; when cancelled/navigated, return focus to chat input.
- **Tests**: Manual – screen reader test (VoiceOver / NVDA).
- **Effort**: `S`

### T‑E: Client‑side domain re‑validation (FR‑6 Layer 3)

- **Files**: `public/widget.js` (extend T‑11)
- **Steps**:
  - [ ] Before executing `window.location.href`, parse target URL.
  - [ ] Compare its hostname (after `www.` strip) to `state.botDomain` and `state.allowedDomains` (already loaded in init response).
  - [ ] If mismatch: `console.warn('Blocked client-side domain mismatch')`, send cancellation log (T‑C), do **not** navigate.
  - [ ] Uses the same `normalizeAllowedDomain` logic (replicated in JS since widget is vanilla).
- **Tests**: Cypress – malicious URL injected; widget stays on page, no navigation.
- **Effort**: `S`

### T‑F: Slow‑network handling (EC‑5)

- **Files**: `public/widget.js`
- **Steps**:
  - [ ] On widget init (post‑navigation case), start a `setTimeout(15000)` after navigation fires.
  - [ ] If 15s elapse without `DOMContentLoaded` reaching `interactive` state (or `window.load`), show a loading indicator inside widget: "Page is loading slowly…" with a **Retry** button.
  - [ ] Retry: re‑attempt `window.location.href = url` (no‑op if already navigated).
  - [ ] Cleanup listeners on success.
- **Tests**: Manual – Chrome DevTools 3G throttling.
- **Effort**: `M`

---

## Phase 4 – Admin UI (P2 – optional for V1)

### T‑13: Create `KeyActionPages` component (admin)

- **Files**: `components/dashboard/bot-detail/KeyActionPages.tsx` (new)
- **Steps**:
  - [ ] Fetch `widget_settings.allowed_pages` via existing `useBotSettings` hook.
  - [ ] Render editable list with **Add** / **Edit** / **Delete** buttons.
  - [ ] Validate inputs (path starts with `/`, title non‑empty, intent unique, max 20).
  - [ ] Persist via PATCH `/api/bots/[botId]/appearance`.
- **Effort**: `M`

### T‑14: Extend appearance API to accept `allowed_pages`

- **Files**: `app/api/bots/[botId]/appearance/route.ts`
- **Steps**:
  - [ ] Add Zod schema for `KeyActionPage[]`.
  - [ ] Merge into `widget_settings` JSON.
  - [ ] Return updated settings.
- **Effort**: `S`

---

## Phase 5 – Testing & QA

### T‑15: Unit tests for matcher & validator

- **Files**: `__tests__/intent-matcher.test.ts`, `__tests__/navigation-validator.test.ts`
- **Steps**:
  - [ ] Cover happy paths, edge cases, error states.
  - [ ] Mock external services.
- **Effort**: `M`

### T‑16: Integration tests for chat route

- **Files**: `__tests__/api/widget-chat.test.ts`
- **Steps**:
  - [ ] Spin up Next.js test server.
  - [ ] Mock Gemini, plan code, and security validator.
  - [ ] Verify response shape for each scenario (navigation, plan‑block, security‑block, no‑match).
- **Effort**: `M`

### T‑17: E2E Cypress tests for widget

- **Files**: `cypress/e2e/widget-navigation.cy.ts`
- **Steps**:
  - [ ] Load a test page with widget embedded.
  - [ ] Send message that triggers explicit intent → verify immediate navigation.
  - [ ] Send message that triggers implicit intent → verify banner appears, cancel works.
  - [ ] Send message with out‑of‑domain URL → verify no navigation, no error UI.
- **Effort**: `L`

### T‑18: Manual QA checklist

- **Steps**:
  - [ ] Test on Chrome, Firefox, Safari (desktop + mobile).
  - [ ] Test on 3G throttling (Chrome DevTools).
  - [ ] Test with visitor using VPN (different IP).
  - [ ] Verify analytics events (if applicable).
- **Effort**: `M`

---

## Phase 4 – Admin UI (P2) — PARTIAL for V1

### T‑21: Master Toggle for Smart Homepage (FR‑8) ← ADDED (V1)

- **Files**:
  - `types/widget-api.ts` (add `navigation_enabled?: boolean` to `WidgetSettings`)
  - `app/api/widget/chat/route.ts` (gate: `if (!settings.navigation_enabled) return;` before plan/whitelist)
  - `app/api/bots/[botId]/appearance/route.ts` (merge `navigation_enabled` into `widget_settings`)
  - `store/useAppearanceStore.ts` (add `navigationEnabled` + `setNavigationEnabled`)
  - `components/dashboard/bot-detail/tabs/SettingsTab.tsx` (new Card + Switch, copy `isVoiceEnabled` pattern)
- **Steps**:
  - [ ] Add `navigation_enabled?: boolean` to `WidgetSettings` type.
  - [ ] In chat route, short-circuit to normal MESSAGE when `!settings.navigation_enabled`.
  - [ ] In appearance route, merge `navigation_enabled` (Boolean cast) into updated settings.
  - [ ] In store, add state + setter (mirror `isVoiceEnabled`).
  - [ ] In SettingsTab, add Card "Chuyển hướng thông minh (Smart Homepage)" with Switch; `disabled` on Free plan; `onSaveAppearance({ navigation_enabled: checked })`.
- **Tests**: Extend `__tests__/app/api/widget/chat/navigation.test.ts` with a case: `navigation_enabled: false` → response type is MESSAGE even with valid whitelist + paid plan.
- **Effort**: `M`
- **Note**: No DB migration (jsonb field). Persisted via existing appearance API.

### T‑13 / T‑14: Key Action Pages editor (DEFERRED to V2)

- Out of scope for V1 (whitelist edited via DB/jsonb directly). See FR-8 note.

---

## Phase 7 – Auto‑Populate from Website Discover (FR‑9) — V2

### T‑22: Migration — `pages.anchors` column

- **Files**: `supabase/migrations/20260822_01_pages_anchors.sql`
- **Steps**: `ALTER TABLE public.pages ADD COLUMN anchors jsonb NULL DEFAULT '[]'::jsonb;` + comment.
- **Effort**: S

### T‑23: Scraper — extract in‑page anchors

- **Files**: `lib/scraper/extractors/dynamic.ts` (and/or `static.ts`), `processPageCrawlerJob` (persist `anchors`)
- **Steps**: after content extraction, query all `h1`–`h6`, `section[id]`, `article[id]`, `[role=region][id]` → `[{id, text, tag}]` → store in `pages.anchors`.
- **Effort**: M

### T‑24: Remove 20‑page cap

- **Files**: `config/widget.ts` (delete `MAX_ALLOWED_PAGES`), `app/api/widget/chat/route.ts` (use `allowed_pages` + `auto_pages`).
- **Effort**: S

### T‑25: `auto_pages` builder service

- **Files**: `lib/services/navigation-autobuild.service.ts` (NEW)
- **Steps**: read `pages` for bot → build entries (page + per-anchor) → batch LLM (`NAVIGATION_INTENT_MODEL` || `CHAT_MODEL`) generates `intent` → write `widget_settings.auto_pages`.
- **Effort**: M

### T‑26: Triggers

- **Files**: `app/api/bots/[botId]/appearance/route.ts` (on `navigation_enabled` ON → enqueue), `lib/scraper/core/job-processors.ts` (after discover complete + navigation_enabled → enqueue).
- **Effort**: M

### T‑27: `matchKeyAction` reads `auto_pages`

- **Files**: `lib/utils/intent-matcher.ts`, `app/api/widget/chat/route.ts`
- **Steps**: merge `allowed_pages` + `auto_pages` before matching.
- **Tests**: extend `navigation.test.ts` with auto_pages case.
- **Effort**: S

---

## Phase 6 – Documentation & Cleanup

### T‑19: Update user‑facing docs

- **Files**: `docs/features/smart-homepage.md`
- **Steps**:
  - [ ] Explain how the feature works for bot admins.
  - [ ] Show how to add Key Action Pages.
  - [ ] List supported plans.
- **Effort**: `S`

### T‑20: Update CHANGELOG

- **Files**: `CHANGELOG.md`
- **Steps**:
  - [ ] Add entry under “Unreleased” → “Smart Homepage (Beta)”.
- **Effort**: `S`

---

## Summary

| Phase                   | Tasks                  | Effort                       |
| ----------------------- | ---------------------- | ---------------------------- |
| Phase 1 – Foundation    | T‑01 → T‑03            | 3 × S                        |
| Phase 2 – Backend       | T‑04 → T‑08            | 2 × S, 2 × M                 |
| Phase 3 – Frontend      | T‑09 → T‑12, T‑A → T‑F | 3 × S, 1 × M, +1 × M, +1 × M |
| Phase 4 – Admin UI (P2) | T‑13 → T‑14            | 1 × S, 1 × M                 |
| Phase 5 – Testing       | T‑15 → T‑18            | 2 × M, 1 × L                 |
| Phase 6 – Docs          | T‑19 → T‑20            | 2 × S                        |

**Total estimated effort** (V1, includes gap fixes T‑A → T‑F): ~35‑45 h.  
**Critical path**: T‑01 → T‑04 → T‑07 → T‑11 → T‑17 (must be done in order).  
**Can be parallelised**: T‑13/T‑14 (admin UI) after T‑02 is complete.  
**V1 deferred to V2** (out‑of‑scope per SPEC update 2026‑08‑21): FR‑7 standalone/dashboard fallback, sitemap auto‑populate, BR‑3 cancel‑rate dashboard warning.

---

_Next step: ANALYZE – run consistency check across SPEC ↔ PLAN ↔ TASKS to ensure no gaps or contradictions before starting implementation._
