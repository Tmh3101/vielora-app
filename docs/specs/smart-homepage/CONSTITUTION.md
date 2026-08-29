# CONSTITUTION: Smart Homepage Feature (Intent-Driven Navigation)

**Project**: Vielora  
**Feature**: Smart Homepage - Intent-Driven Navigation  
**Date**: 2026-08-21  
**Status**: ACTIVE

---

## Article I: Technology Stack Constraints

### Approved Technologies (MUST USE)

- **Frontend**: Next.js 14 (App Router), TypeScript 5.7, React 18
- **Database**: Supabase PostgreSQL with Row-Level Security (RLS)
- **AI Engine**: Google Gemini API (existing integration)
- **Client Runtime**: `public/widget.js` (vanilla JavaScript, no frameworks)
- **Caching**: Redis (existing setup for read-through cache)
- **Background Jobs**: BullMQ workers (if async processing needed)

### Prohibited Technologies (MUST NOT USE)

- ❌ No additional frontend frameworks in widget.js (React, Vue, etc.)
- ❌ No external navigation libraries (keep widget.js lean)
- ❌ No new LLM providers (stick to Gemini)
- ❌ No third-party analytics without explicit approval

---

## Article II: Architecture Principles

### Multi-Tenant Workspace Architecture

- All new tables MUST include `workspace_id` foreign key
- All new tables MUST have RLS policies with workspace member checks
- Use existing `workspace_members` table for authorization
- Follow pattern: `workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active')`

### Security-First Design

- **3-Layer Defense**: Prompt constraint → Server validation → Client sandbox
- Domain whitelist MUST use existing `bots.allowed_domains` column
- Never trust client-provided URLs without server-side validation
- Log security violations to `bot_navigation_analytics` for audit

### No Hardcoded Business Logic

- Plan gating MUST use `getWorkspaceSubscriptionPlan(client, workspaceId)` service
- Never hardcode plan names or limits in code
- Read subscription tier from database, not from constants

---

## Article III: Code Quality Standards

### Testing Requirements

- Every new API route MUST have integration tests
- Client-side navigation logic MUST have unit tests (Jest/Vitest)
- Security validation (domain check) MUST have dedicated test suite
- E2E test for happy path (navigate → reload → widget reopens)

### Documentation Requirements

- All RLS policies MUST have inline comments explaining the access control
- Migration files MUST include rollback instructions in comments
- Widget.js changes MUST update `public/widget.js` JSDoc comments

### Linting & Type Safety

- Zero TypeScript `any` types in new code
- Strict mode enabled for all new TypeScript files
- ESLint warnings MUST be fixed before PR merge

---

## Article IV: Data Model Standards

### Naming Conventions

- Table names: `snake_case` (e.g., `bot_navigation_rules`)
- Column names: `snake_case` (e.g., `target_url`, `intent_description`)
- TypeScript interfaces: `PascalCase` (e.g., `NavigationRule`)
- API routes: RESTful pattern `/api/workspaces/[id]/bots/[botId]/resource`

### Migration Standards

- File naming: `YYYYMMDD_HH_descriptive_name.sql`
- MUST include `IF NOT EXISTS` / `IF EXISTS` checks
- MUST define indexes for foreign keys
- MUST include RLS policies in same migration file

---

## Article V: Plan Gating (Subscription Tiers)

### Tier Access Rules

- **Free**: Feature completely disabled (no UI, no API execution)
- **Standard, Pro, Enterprise**: Full access

### Enforcement Points (3 Layers)

1. **UI Layer**: Hide/disable Smart Homepage settings tab for Free workspaces
2. **API Layer**: Return 403 Forbidden if workspace plan is Free
3. **Chat Engine**: Skip navigation payload generation for Free bots

### Implementation Pattern

```typescript
const wsPlan = await getWorkspaceSubscriptionPlan(supabase, workspaceId);
if (wsPlan.plan_code === "free") {
  return res.status(403).json({ error: "Feature requires Standard plan or higher" });
}
```

---

## Article VI: Widget.js Execution Constraints

### Runtime Environment Rules

- Navigation MUST only auto-execute inside embedded `widget.js` on client website
- Standalone page (`bot.vielora.vn/b/[slug]`) MUST render as Action Card (no auto-redirect)
- Dashboard Playground MUST show simulation badge (no actual navigation)

### Browser Compatibility

- MUST support: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- MUST gracefully degrade on older browsers (show fallback message)
- MUST handle iframe sandbox restrictions

---

## Article VII: Performance Requirements

### Response Time Targets

- Navigation payload generation: ≤ 2 seconds (same as normal chat response)
- Domain validation check: ≤ 50ms
- Widget reopen after page load: ≤ 500ms

### Resource Limits

- Max navigation rules per bot: 20 (enforce via CHECK constraint)
- Max target URL length: 2000 characters (practical browser limit)
- Telemetry analytics retention: 90 days (auto-cleanup via cron)

---

## Article VIII: Simplicity & Anti-Over-Engineering Gates

### Simplicity Gate

- ✅ No new external dependencies for core navigation logic
- ✅ Reuse existing Gemini prompt structure (add navigation section, don't rebuild)
- ✅ Reuse existing `allowed_domains` column (don't create new security table)

### Anti-Abstraction Gate

- ✅ Use direct Supabase client queries (no ORM layer)
- ✅ Single navigation payload format (no "strategy pattern" for different nav types)
- ✅ Inline domain validation in widget.js (no separate validation library)

### Complexity Tracking

If any gate fails, document rationale here:

- (None at constitution time—to be updated if implementation requires deviation)

---

## Article IX: Operational Constraints

### Deployment Strategy

- Feature MUST be behind feature flag initially (`ENABLE_SMART_HOMEPAGE` env var)
- Rollout: Internal testing (1 week) → Beta users (2 weeks) → General availability
- Rollback plan: Disable feature flag + hide UI (data remains intact)

### Monitoring & Alerting

- Track navigation trigger rate per bot (alert if >100/min, possible abuse)
- Track security block rate (alert if >5% of total triggers)
- Track cancel rate per URL (alert if >20%, poor UX signal)

---

## Article X: Git & Review Workflow

### Branch Strategy

- Feature branch: `feat/smart-homepage-navigation`
- All changes MUST go through PR review
- Minimum 1 approval from Tech Lead before merge
- No direct commits to `develop` or `main`

### Commit Conventions

- Use Conventional Commits: `feat(smart-homepage): add navigation rules API`
- Reference issue number if applicable: `feat(smart-homepage): #123 add telemetry`
- Granular commits per task (not one giant commit)

### AI Agent Integration

- Use `agy` for implementation tasks (as per `vielora-agy-orchestration` skill)
- Run GitNexus `detect_changes` before each merge
- Manual review required for RLS policy changes (security-sensitive)

---

**END OF CONSTITUTION**

This constitution is the governing document for Smart Homepage feature development. All specifications, plans, and implementations MUST align with these principles. Deviations require explicit justification and Tech Lead approval.
