# PLAN: Smart Homepage (Intent‑Driven Navigation)

## 1. Architecture Overview

- **Client side**: `public/widget.js` (modified to add `navigateToPage(url, anchor?)` helper). The widget sends a `ChatRequest` to `/api/widget/chat` as before, receives `ChatResponse` with optional `type: "SHOW_LEAD_FORM"`. For navigation, we add a new response type `type: "NAVIGATE"` with payload `{url:string, anchor?:string, explicit:boolean}`.
- **Backend API**: Extend `app/api/widget/chat/route.ts` to detect intents that map to a _Key Action Page_ (from the whitelist stored in `bot.settings.allowed_pages`). When such an intent is recognised, the route returns a `ChatResponse` with `type: "NAVIGATE"` and the target URL.
- **Plan‑gating**: Use `getBotActivePlanCode` (see `lib/services/subscription.service.ts`) + `SUGGESTED_QUESTIONS_ALLOWED_PLANS` to guard the feature. Only `standard`, `pro`, `enterprise` plans may receive navigation responses; lower plans get a generic message.
- **Security**: Validate the target URL against the bot’s `allowed_domains` using `isOriginAllowedForWidget` (see `lib/security/allowed-domains.ts`). If validation fails, we log a security event and return a normal chat message without navigation.
- **RLS / DB**: No new tables are required. The whitelist of Key Action Pages lives in the `widget_settings` JSON column of the `bots` table. No changes to RLS policies.

## 2. Data Model

```sql
-- Added field to bots table (JSONB) – already exists as widget_settings
-- Example structure stored in widget_settings:
-- {
--   "allowed_pages": [
--     {"path":"/pricing","anchor":null,"title":"Pricing","intent":"show_pricing"},
--     {"path":"/checkout","anchor":null,"title":"Checkout","intent":"checkout"},
--     {"path":"/services#booking-form","anchor":"booking-form","title":"Book a Service","intent":"book_service"}
--   ]
-- }
```

- The **Key Action Page** entries are static for V1 (manual admin UI entry – see `components/dashboard/bot-detail/KeyActionPages.tsx` – not created yet, but the schema is defined).
- `allowed_domains` remains a separate array in `widget_settings` used by `isOriginAllowedForWidget`.
- **Master toggle** `navigation_enabled` (boolean, default `false`) added to `widget_settings` (FR-8). No DB migration (jsonb field).

## 3. API Changes

### 3.1 Request / Response Types (`types/widget-api.ts`)

```ts
export type ChatResponseType = "MESSAGE" | "SHOW_LEAD_FORM" | "NAVIGATE";

export type ChatData = {
  conversationId: string;
  message: string;
  noAnswer: boolean;
  type?: ChatResponseType; // new optional field
  originalQuestion?: string;
  // New fields for navigation
  url?: string; // absolute or relative URL to navigate to
  anchor?: string; // optional fragment identifier
  explicit?: boolean; // true when intent is explicit (no countdown)
};
```

- Backend will set `type: "NAVIGATE"` and include `url`, `anchor`, `explicit`.

### 3.2 Bot Settings (`widget_settings` JSON)

```json
{
  "navigation_enabled": true,
  "allowed_pages": [
    { "path": "/pricing", "anchor": null, "title": "Pricing", "intent": "show_pricing" },
    { "path": "/checkout", "anchor": null, "title": "Checkout", "intent": "checkout" },
    {
      "path": "/services#booking-form",
      "anchor": "booking-form",
      "title": "Book Service",
      "intent": "book_service"
    }
  ]
}
```

- Admin UI will later expose an editor for this array (out of scope for V1).
- `navigation_enabled` is the master switch; persisted via `/api/bots/[botId]/appearance` POST merge (same pattern as `isVoiceEnabled`).

## 4. Intent Detection (Backend)

- In `app/api/widget/chat/route.ts`, after generating the Gemini response text, we run a **simple pattern matcher** against the whitelist:

```ts
function matchKeyAction(
  intentText: string,
  allowedPages: any[]
): { url: string; anchor?: string; explicit: boolean } | null {
  const lowered = intentText.toLowerCase();
  for (const page of allowedPages) {
    const intent = page.intent.toLowerCase();
    if (lowered.includes(intent)) {
      return { url: page.path, anchor: page.anchor, explicit: true };
    }
  }
  // fallback: fuzzy match on common verbs ("show", "go to", "open")
  const fuzzy = allowedPages.find((p) => lowered.includes(p.title.toLowerCase()));
  if (fuzzy) return { url: fuzzy.path, anchor: fuzzy.anchor, explicit: false };
  return null;
}
```

- Only executed when `planCode` is in `SUGGESTED_QUESTIONS_ALLOWED_PLANS`.
- If a match is found, **validate** the URL against `allowed_domains` (using `isOriginAllowedForWidget`). If validation fails, log security event (`logSecurityViolation`) and fall back to normal chat message.

## 5. Front‑end Widget Enhancements (`public/widget.js`)

- Add a new handler in `handleChatResponse(data)`:

```js
if (data.type === "NAVIGATE") {
  const target = data.url + (data.anchor ? "#" + data.anchor : "");
  if (data.explicit) {
    // Immediate navigation (no countdown)
    window.location.href = target;
  } else {
    // Show 3‑second banner with cancel button
    showNavigationBanner(target, data.title || target);
  }
  // Re‑open chat after navigation – the script already does this because the widget stays on the page.
  return;
}
```

- Implement `showNavigationBanner(url, title)` that creates a temporary overlay with a 3‑second timer and a **Cancel** button.
- Ensure the banner respects `state.isLoading` and resets after navigation or cancel.

## 6. Security Checks (Backend)

- Use existing `normalizeAllowedDomain` & `isOriginAllowedForWidget` utilities.
- New helper `logSecurityViolation({botId, visitorId, url, reason})` writes a row to `security_events` table (create if not exists – lightweight, only insert).
- The response for a blocked navigation is the same as a normal chat message (`type: "MESSAGE"`). No hint is sent to the client.

## 7. Plan‑Gating Logic (Backend)

- In `app/api/widget/chat/route.ts` after fetching bot data:

```ts
const planCode = await getBotActivePlanCode(supabase, botData);
const allowNavigation = SUGGESTED_QUESTIONS_ALLOWED_PLANS.includes(planCode as ESubscriptionPlan);
```

- If `allowNavigation` is false, navigation logic is skipped and Gemini text is returned unchanged.

## 8. Dashboard / Admin UI (Future Work – P2)

- Add a **Key Action Pages** tab under Bot Detail (`components/dashboard/bot-detail/KeyActionPages.tsx`).
- UI will let admins add/remove entries, respecting the max 20 limit.
- Validation: path must start with `/`, optional `#anchor`, title non‑empty, intent unique.

## 9. Edge‑Case Handling (Matches SPEC)

| Edge case              | Implementation                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **404 target**         | No pre‑flight HEAD. Browser shows the 404 page; chat re‑opens automatically.                                                 |
| **Missing anchor**     | After navigation, `if (anchor && !document.getElementById(anchor)) console.warn('Anchor not found');` – no jump, chat stays. |
| **Rate‑limit / quota** | Existing `state.quotaExceeded` logic remains unchanged.                                                                      |
| **Security block**     | `logSecurityViolation` + normal `MESSAGE` response, silent to user.                                                          |
| **Rapid requests**     | Front‑end tracks `state.pendingNavigation`; new request cancels previous timer/overlay before processing.                    |
| **Slow network**       | Navigation occurs after the page loads; the 3‑second banner is shown **after** load to avoid dead‑timer during loading.      |

## 10. Testing Strategy

1. **Unit tests** (`__tests__/navigation.test.ts`):
   - matchKeyAction returns correct mapping for explicit & implicit intents.
   - URL validation rejects out‑of‑domain URLs.
   - Security logging inserts a row.
2. **Integration tests** (using `supertest` against the API):
   - POST `/api/widget/chat` with a message that triggers navigation → response contains `type: "NAVIGATE"` and correct payload.
   - Same request with a plan not in `SUGGESTED_QUESTIONS_ALLOWED_PLANS` → response type is `MESSAGE` only.
3. **E2E tests** (Cypress on a dev site with widget):
   - Verify 3‑second banner appears for implicit intents and is cancelable.
   - Verify immediate navigation for explicit intents.
   - Verify blocked URL does not navigate and logs event.

## 12. Master Toggle Implementation (FR-8)

- **Backend type** (`types/widget-api.ts`): add `navigation_enabled?: boolean` to `WidgetSettings`.
- **Backend gate** (`app/api/widget/chat/route.ts`): after reading `settings`, add:
  ```ts
  if (!settings.navigation_enabled) return; // master off → normal MESSAGE
  const pages: KeyActionPage[] = settings.allowed_pages ?? [];
  ```
  Placed BEFORE plan-gating + whitelist check (cheapest gate first).
- **API persistence** (`app/api/bots/[botId]/appearance/route.ts`): add merge:
  ```ts
  ...(widgetSettings?.navigation_enabled !== undefined && {
    navigation_enabled: Boolean(widgetSettings.navigation_enabled),
  }),
  ```
- **Store** (`store/useAppearanceStore.ts`): add `navigationEnabled` + `setNavigationEnabled` (copy `isVoiceEnabled` pattern).
- **UI** (`components/dashboard/bot-detail/tabs/SettingsTab.tsx`): add a new `Card` "Chuyển hướng thông minh (Smart Homepage)" with a `Switch` (copy `isVoiceEnabled` block at lines 250-275). `onSaveAppearance({ navigation_enabled: checked })`.
- **Disabled on Free**: switch `disabled` when `!isProOrEnterprise` (already computed at line 58).
- **No DB migration**: `navigation_enabled` is a jsonb field inside `widget_settings`.

## 13. Impact Analysis (GitNexus)

- **Modified files**: `app/api/widget/chat/route.ts`, `public/widget.js`, `types/widget-api.ts`, `lib/security/allowed-domains.ts` (read‑only), `lib/services/subscription.service.ts` (plan check), `lib/rag/generative.ts` (no change), `config/knowledge.ts` (new constant).
- **Blast radius**: Only the widget flow and chat API are touched; other bot routes remain untouched. No changes to database schema except the optional `security_events` insert (new table, safe).
- **Risk level**: **LOW** – changes are additive, guarded by plan gating, and have extensive test coverage.

---

_All decisions respect the locked SPEC. The next step will be to break this plan into concrete tasks (`TASKS.md`)._
