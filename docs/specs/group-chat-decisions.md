# Vielora Group Chat — Locked Scope & Decisions (MVP)

**Status:** LOCKED — 2026-08-10, agreed by Boss (Nguyễn Hoài Tưởng)
**Plan gate:** Pro & Enterprise only. Companion feature to the existing standalone public chat + PWA — runs in parallel, never replaces it.
**Repository:** Tmh3101/vielora — branch `develop`

---

## 1. Product Scope

- 1 bot = 1 private group chat (max 5 human members, **excluding** the bot), running in parallel with the existing standalone public chat page.
- Group chat is **private**: authentication required to view or send.
- Feature gated to **Pro & Enterprise** plans.
- MVP excludes: file/image/emoji attachments, message editing, threads (only flat reply).

## 2. Members & Invitation

- Invite by **email**; invited person joins **immediately** (no acceptance step); system sends a notification email.
- **Anyone** can be invited — not limited to workspace members.
- Invite flow (identity model — locked):
  - System checks whether the email already has a Supabase Auth account.
  - **Existing account** (e.g. workspace member) → linked directly into the group.
  - **No account** → system **auto-creates** the Supabase Auth user (`email_confirmed_at = null`); invite email carries an OTP / magic link.
  - First login: OTP / magic link (no password required). Optional password setup afterwards; subsequent logins: email + password **or** OTP.
  - No custom password storage anywhere — 100% Supabase Auth (session, RLS, reset) reused.
- Max **5 members** per group; inviting a 6th is **blocked in the UI**.
- Members can **leave** the group; owner/admin can **remove** members.
- Group configuration changes: **workspace members only**.
- Session: re-authentication required when the session expires (Supabase session with ~7-day refresh window).

## 3. Roles (MVP = labels only)

- Group roles are **fully separate** from workspace roles.
- Owner/Admin assign a free-form **role label** per member (e.g. "Chủ nhóm", "Chuyên gia") — a tag, nothing more.
- MVP exception: a `can_pin_knowledge` flag (grantable by owner/admin) controls who may pin chat messages into bot knowledge.
- Permission system (actions, guards) is **deferred post-MVP**.

## 4. Chat Flow

- **Bot auto-reply ON by default**; each message has a per-message toggle to disable the bot reply. **Credits are deducted ONLY when the bot actually replies.**
- **Reply:** any member can reply to any message (`reply_to_id`). The bot's auto-reply sets `reply_to_id` = the triggering user message, so the UI always shows which message the bot is answering.
- **Mentions:** `@member` autocomplete (from the ≤5 members); mentions stored as `user_id[]` on the message; mentioned messages get a priority badge / notification.
- **Timestamps:** every message carries its send time; the UI renders time separators/markers between groups of messages.
- **Unread:** per-member `last_read_at`; unread badge count; opening the group auto-scrolls to the first unread message.
- **Notifications (MVP):** in-app badge + unread state. **Web Push (VAPID)** = Phase 2, reusing the existing service worker.
- **Realtime:** Supabase Realtime channel per group for message delivery.

## 5. Bot Context Window (group)

- `GROUP_MAX_HISTORY_MESSAGES = 25` (configurable constant) — standalone chat keeps its current `MAX_HISTORY_MESSAGES = 3`.
- When the bot replies to a specific message: context = **reply chain** (root message + its replies) + recent messages before it (up to the window).

## 6. Knowledge Learning from Chat

Two complementary layers — not all chat content becomes knowledge:

- **Layer A — Manual pin (high precision):**
  - Member with `can_pin_knowledge` taps a message → "Ghi nhớ vào kiến thức".
  - Stores the pair: user message + (if present) the bot's reply → row in `chat_knowledge` (`bot_id`, `message_id`, `question`, `answer`, `pinned_by`, `created_at`).
  - No approval chain (knowledge is not attributed to anyone). Owner/Admin can **view & delete** pinned entries from the dashboard (anti-noise).
  - MVP: stored verbatim (no editing before save); pin survives message deletion (snapshot kept).
- **Layer B — Daily cron summary (high recall):**
  - Cron at **02:00** daily: for groups with messages the previous day, LLM summarizes the conversation into "noteworthy knowledge" (decisions, repeated facts, confirmed instructions) → merged into `group_chat_insights`: **1 row per bot**, continuously updated (rolling ~30-day window).
  - Auto-generated → flagged as "Tự động tổng hợp" in the dashboard; owner can delete or disable.
- **Storage & RAG integration (verified against code):**
  - Both layers are ingested into the existing **`documents`** table with `metadata.source = 'group_chat' | 'group_summary'`.
  - The existing `hybrid_search` RPC (`lib/rag/retrieval.ts`) works **unchanged** — embedding + FTS + similarity all reused. Embedding regenerated whenever a row updates.
  - Pins: one document row per pin. Summary: one document row per bot.
- **Scope of learned knowledge (locked default):** knowledge is general-purpose ("nội dung tổng quan mà bot sử dụng để trả lời") — the bot uses it in **ALL contexts**, including the public standalone chat.
- Bot does **not** distinguish source when answering (per decision #14).

## 7. UI / PWA / Routing

- **Same origin** `{slug}.vielora.vn` (scope `/public-bot/{slug}/`) — **no second origin**:
  - `/` → public standalone chat (anonymous, unchanged).
  - `/group` → private group chat (auth-gated; unauthenticated users see the login view **on the same origin**, not a redirect away).
- **One PWA** for both views; a tab switcher "Chat" ⇄ "Nhóm" lets users move freely.
- **State persistence (NEW — locked):**
  - **Last visited tab** is stored (localStorage, per bot origin). On revisit, the app loads the tab the user last used.
  - If the last tab was `group` and the user is not authenticated → show the **group login view** (never silently drop to the standalone tab).
  - **Login state persists** across visits (Supabase session in localStorage by default) — the user stays logged in until session expiry; no re-login on every open.
- **Security rule:** group pages must **never** be served from the SW offline cache (private data). SW: exclude `/group` from caching; offline group view shows a reconnect/login state, never cached content.

## 8. Monetization

- Pro & Enterprise only.
- Credits deducted **only when the bot replies**; sending a group message costs nothing.

## 9. Assumptions locked by default (vetoable at any time)

1. Chat-learned knowledge applies to **all contexts** (incl. standalone public chat) — per "nội dung tổng quan mà bot sử dụng để làm kiến thức trả lời".
2. Message deletion (MVP): owner/admin can delete any message; a member can delete their own. (Flat delete, no edit.)
3. Web Push = Phase 2 (post-MVP); MVP ships in-app badge + unread only.
4. History retained indefinitely (`GROUP_HISTORY_RETENTION_DAYS = null`); a retention cron can be added later with a one-line config change.

## 10. Out of Scope (MVP)

- File / image / emoji attachments
- Message editing, threads, polls, reactions
- Permission matrix for group roles (labels only)
- Web Push notifications
- Multiple groups per bot

## 11. Next Steps (after this lock)

1. Write the full English spec (`docs/specs/group-chat.md`): DB schema (group_chats, group_members, group_messages, chat_knowledge, group_chat_insights), migration, API endpoints, Realtime channels, cron worker, dashboard UI, PWA route + SW rules.
2. Test matrix (happy path + edge + exception) per established workflow.
3. Implementation planning (phases, delegate to agy, verify lint/build, commit per task).
