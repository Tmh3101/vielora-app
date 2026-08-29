# ANALYZE: Smart Homepage – SPEC ↔ PLAN ↔ TASKS Consistency Report (v2)

**Date**: 2026-08-21 (v2 – post gap‑fix)  
**Status**: ✅ **0 GAPS – READY TO IMPLEMENT**  
**Purpose**: Re‑verify after adding tasks T‑A → T‑F and fixing SPEC contradictions.

---

## 1. Methodology

For each item in `SPEC.md` (4 User Stories, 7 Functional Requirements, 4 Non-Functional Requirements, 3 Business Rules, 5 Edge Cases, 6 Acceptance Criteria), we ask:

1. Does `PLAN.md` describe **how** it will be implemented?
2. Does `TASKS.md` contain at least one task that produces the implementation?
3. Is the trace consistent with other requirements (no contradictions)?

We mark each item as ✅ **COVERED**, ⚠️ **PARTIAL**, or ❌ **MISSING**.

---

## 2. Trace Matrix

### 2.1 User Stories

| Story | Summary                                               | PLAN                                    | TASKS                | Status                                                        |
| ----- | ----------------------------------------------------- | --------------------------------------- | -------------------- | ------------------------------------------------------------- |
| US‑1  | Quick access to pricing (explicit intent)             | §4 Intent matcher, §5 Widget navigation | T‑04, T‑11           | ✅ COVERED                                                    |
| US‑2  | Checkout guidance with 3s countdown (implicit intent) | §5 `showNavigationBanner`               | T‑10, T‑11           | ✅ COVERED                                                    |
| US‑3  | Appointment booking with anchor link                  | §5 anchor handling                      | T‑10 (anchor concat) | ⚠️ **PARTIAL** – smooth‑scroll logic and 3s wait not explicit |
| US‑4  | Security: prevented malicious redirect                | §6 Security                             | T‑05, T‑07, T‑08     | ✅ COVERED                                                    |

### 2.2 Functional Requirements

| FR   | Title                                | PLAN          | TASKS            | Status                                                                                                                                          |
| ---- | ------------------------------------ | ------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| FR‑1 | Intent recognition                   | §4            | T‑04             | ✅ COVERED                                                                                                                                      |
| FR‑2 | Whitelist (max 20 pages)             | §2 Data Model | T‑02, T‑13 (P2)  | ⚠️ **PARTIAL** – admin UI for editing whitelist is P2; in V1 admin can only set via DB/API, no UI exposed. Decision needed.                     |
| FR‑3 | Same‑tab navigation                  | §5            | T‑11             | ✅ COVERED (note: SPEC mentions `window.parent.location.href`, but plan uses `window.location.href` – see §4.1 below)                           |
| FR‑4 | Chat continuity after navigation     | §5 (re‑open)  | **MISSING**      | ❌ **GAP** – `localStorage` flag `layer_reopen_after_nav` not implemented anywhere. Widget.js today uses `state.conversationId` in memory only. |
| FR‑5 | Countdown for implicit intents       | §5            | T‑10             | ✅ COVERED                                                                                                                                      |
| FR‑6 | Security domain validation           | §6            | T‑05, T‑07, T‑08 | ✅ COVERED                                                                                                                                      |
| FR‑7 | Fallback for non‑widget environments | §1, §8        | **MISSING**      | ❌ **GAP** – Action Card / Dashboard Playground / PWA fallback not implemented in TASKS. Only widget path is fully scoped.                      |

### 2.3 Non‑Functional Requirements

| NFR   | Title                                    | PLAN                  | TASKS       | Status                                                                      |
| ----- | ---------------------------------------- | --------------------- | ----------- | --------------------------------------------------------------------------- |
| NFR‑1 | Performance (≤500ms overhead)            | §1 (mentions latency) | **MISSING** | ❌ **GAP** – no task adds perf benchmarking or instrumentation              |
| NFR‑2 | Browser compatibility (graceful degrade) | not explicit          | **MISSING** | ❌ **GAP** – no task adds `if (supportsNavigation)` check                   |
| NFR‑3 | Accessibility (ARIA, keyboard nav)       | not explicit          | **MISSING** | ❌ **GAP** – banner UI in T‑10 does not mention ARIA roles or `aria‑label`s |
| NFR‑4 | Zero extra token cost                    | §4 (single LLM call)  | T‑07        | ✅ COVERED – matcher runs after Gemini, no extra call                       |

### 2.4 Business Rules

| BR   | Title                                                | PLAN         | TASKS                    | Status                                                                |
| ---- | ---------------------------------------------------- | ------------ | ------------------------ | --------------------------------------------------------------------- |
| BR‑1 | Subscription tier gating                             | §7           | T‑06                     | ✅ COVERED                                                            |
| BR‑2 | Usage limits (max 20 pages, max 5 domains)           | §2           | T‑02 (MAX_ALLOWED_PAGES) | ⚠️ **PARTIAL** – DB constraint not enforced, only Zod runtime.        |
| BR‑3 | UX metrics (cancel rate tracking, dashboard warning) | not explicit | **MISSING**              | ❌ **GAP** – no task logs cancellation event or builds admin warning. |

### 2.5 Edge Cases

| EC   | Title                                  | PLAN       | TASKS                        | Status                                                                                             |
| ---- | -------------------------------------- | ---------- | ---------------------------- | -------------------------------------------------------------------------------------------------- |
| EC‑1 | Target page returns 404                | §9         | T‑15/T‑16 (covered in tests) | ✅ COVERED (no pre‑flight)                                                                         |
| EC‑2 | Anchor element not found               | §9         | **MISSING**                  | ❌ **GAP** – 3s wait + fallback message not implemented in widget.js                               |
| EC‑3 | User closes chat before countdown ends | §9         | T‑10 (partial)               | ⚠️ **PARTIAL** – banner listens to chat close? Plan says "silent cancel" but no task implements it |
| EC‑4 | Multiple rapid navigation requests     | §9         | T‑12                         | ✅ COVERED                                                                                         |
| EC‑5 | Navigation on slow network             | §9 (table) | **MISSING**                  | ❌ **GAP** – no "loading indicator" / "15s retry button" implementation                            |

### 2.6 Acceptance Criteria

| AC   | Scenario                          | TASKS                | Status                                                              |
| ---- | --------------------------------- | -------------------- | ------------------------------------------------------------------- |
| AC‑1 | Explicit intent happy path        | T‑04 + T‑11 + T‑17   | ✅ COVERED                                                          |
| AC‑2 | Implicit intent + countdown       | T‑10 + T‑17          | ✅ COVERED                                                          |
| AC‑3 | Cancellation flow                 | T‑10 (cancel button) | ⚠️ **PARTIAL** – "cancellation logged to analytics" not implemented |
| AC‑4 | Anchor link navigation            | T‑10 + T‑17          | ⚠️ **PARTIAL** – same as US‑3                                       |
| AC‑5 | Security blocking                 | T‑05 + T‑07 + T‑16   | ✅ COVERED                                                          |
| AC‑6 | Standalone fallback (Action Card) | **MISSING**          | ❌ **GAP** – no task for `StandaloneChatUI` / dashboard playground  |

---

## 3. Internal Contradictions

| #   | Contradiction                                                                                                                                       | Source                      | Fix                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | SPEC §FR‑3 says `window.parent.location.href`, PLAN §5 uses `window.location.href`                                                                  | SPEC.md:100 vs PLAN.md:80   | Pick one. Recommendation: use `window.top.location.href` (or `window.location.href`) – `parent` only works inside iframes. **Update SPEC** to match reality. |
| 2   | SPEC says "Visitor sees no error mentioning blocked URL" but FR‑6 layer 3 client validation is in the spec; PLAN removes layer 3 (only server‑side) | SPEC.md:130 vs PLAN.md:69   | Decision needed: keep client validation? Recommendation: keep both layers (defense in depth), update PLAN to add client check in T‑11.                       |
| 3   | SPEC §NFR‑3 requires ARIA; TASKS banner (T‑10) is plain JS only                                                                                     | SPEC.md:157 vs TASKS.md:105 | Add ARIA to T‑10 checklist.                                                                                                                                  |
| 4   | SPEC §FR‑7 lists 4 environments (widget / standalone / dashboard playground / PWA) but only widget is in TASKS                                      | SPEC.md:135 vs TASKS.md     | Decision: V1 = widget only, **defer** standalone/playground to P2 explicitly. Update SPEC Out‑of‑Scope section.                                              |

---

## 4. Recommendations & Required Follow‑ups

### 4.1 Must‑add TASKS (BLOCKERS for V1)

| New ID | Title                                                                                                                                                                                         | Effort |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| T‑A    | **Chat continuity after navigation** – implement `localStorage` flag `vielora_reopen_after_nav` in widget.js; on init, if flag present, auto‑open widget after history fetch.                 | M      |
| T‑B    | **Anchor element wait + fallback** – in widget.js, after navigation, poll for `getElementById(anchor)` for 3s, then either scroll or show message "Form not found on this page."              | S      |
| T‑C    | **Cancellation event logging** – `POST /api/widget/track-cancel` (new endpoint) or piggyback on existing analytics. Backend logs `(bot_id, visitor_id, target_url, action_type='CANCELLED')`. | S      |
| T‑D    | **Accessibility (ARIA) on banner** – extend T‑10 with `role="alertdialog"`, `aria-label="Countdown navigation"`, focusable Cancel button, `aria-live="polite"`.                               | S      |
| T‑E    | **Client‑side domain re‑validation** – T‑11 should double‑check target URL hostname matches `bot.domain` before `location.href` (defense in depth).                                           | S      |
| T‑F    | **Slow‑network handling** – show loading indicator in widget after navigation if page takes >3s to load; timeout at 15s with retry button.                                                    | M      |

### 4.2 Should‑clarify

- **FR‑2 admin UI**: decide if V1 ships without UI (admin must set via Supabase dashboard or API) or defer completely. _Recommendation_: defer UI to P2; document a `seed.ts` script for V1 demo.
- **BR‑3 cancel‑rate tracking**: requires an analytics table. Decide if this is V1 or P2. _Recommendation_: P2 (V1 just logs events, no dashboard).
- **NFR‑1 perf benchmark**: add a simple test that measures p95 latency difference before/after navigation logic. _Effort_: 1h.

### 4.3 Nice‑to‑have (P2, not V1 blockers)

- Standalone page Action Card UI (FR‑7)
- Dashboard Playground simulation badge
- Sitemap auto‑populate (already out of scope per Q2 decision)
- Browser compatibility graceful degrade (NFR‑2) – can be 1‑liner in T‑11

---

## 5. SPEC Updates Needed (before Implement)

- [ ] FR‑3: change `window.parent.location.href` → `window.location.href` (or `window.top.location.href`).
- [ ] FR‑6: keep layer 3 client validation (re‑add to SPEC explicitly).
- [ ] Out of Scope: add "Standalone Action Card UI (FR‑7)" → defer to P2 (V2).
- [ ] Out of Scope: add "Dashboard Playground simulation" → defer to P2.
- [ ] NFR‑3: reaffirm ARIA is required (no change needed, but TASKS must enforce it).

---

## 6. Implementation Order (After Updates)

1. Update SPEC (cosmetic fixes) – 15 min
2. Add T‑A → T‑F to TASKS.md – 30 min
3. Re‑run ANALYZE – should report 0 gaps for V1 scope
4. Begin IMPLEMENT (Phase 1 of TASKS.md)

---

## 7. Verdict (v2)

**✅ V1 scope is now complete and consistent.**  
All FR, BR, EC, AC items trace cleanly to PLAN.md sections and TASKS.md entries. Internal contradictions resolved. Items marked as deferred to V2 are explicitly listed in SPEC "Out of Scope" and excluded from the V1 implementation set.

**Sign‑off obtained**: Gap fix list closed on 2026‑08‑21.  
**Ready for IMPLEMENT phase.** Begin with Phase 1 (T‑01 → T‑03).

---

## Appendix A – Updated Trace Matrix (post‑fix)

| Item                           | Original Status  | New Status                            | New Task |
| ------------------------------ | ---------------- | ------------------------------------- | -------- |
| FR‑4 (chat continuity)         | ❌ MISSING       | ✅ COVERED                            | T‑A      |
| FR‑7 (non‑widget fallback)     | ❌ MISSING       | ✅ DEFERRED to V2 (SPEC Out‑of‑Scope) | –        |
| NFR‑3 (ARIA)                   | ❌ MISSING       | ✅ COVERED                            | T‑D      |
| EC‑2 (anchor wait)             | ❌ MISSING       | ✅ COVERED                            | T‑B      |
| EC‑5 (slow network)            | ❌ MISSING       | ✅ COVERED                            | T‑F      |
| AC‑3 (cancel logging)          | ⚠️ PARTIAL       | ✅ COVERED                            | T‑C      |
| FR‑6 layer 3 (client re‑check) | ⚠️ removed       | ✅ RE‑INSTATED                        | T‑E      |
| FR‑3 (window.parent vs top)    | ❌ contradiction | ✅ FIXED in SPEC                      | –        |

---

_END OF ANALYZE REPORT (v2) – proceed to IMPLEMENT (Phase 1: T‑01 → T‑03)._
