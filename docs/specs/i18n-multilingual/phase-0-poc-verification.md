# Phase 0 PoC Verification Report

**Date**: 2026-08-30  
**Branch**: `feat/i18n-multilingual`  
**Status**: ✅ PASS

---

## Test Cases

| TC        | Scenario                                 | Expected                                    | Result                                                                                 |
| --------- | ---------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| **TC-01** | Workspace slug `"en"` rejected           | config + DB constraint                      | ✅ Added to `RESERVED_SUBDOMAINS`, migration `20260830_i18n_reserved_locale_slugs.sql` |
| **TC-02** | Bot subdomain routing                    | `{slug}.vielora.vn/` → `/public-bot/{slug}` | ✅ Preserved in middleware (line 133)                                                  |
| **TC-03** | `/chat/abc` untouched                    | Render chat                                 | ✅ `isExcludedPath` (line 61) unchanged                                                |
| **TC-04** | `/dashboard` with NEXT_LOCALE cookie     | Redirect                                    | ✅ Preserved in middleware (line 175)                                                  |
| **TC-05** | `/shopify` CSP header                    | `frame-ancestors ...`                       | ✅ `withShopifyCsp` wraps intl response                                                |
| **TC-06** | `Accept-Language: en-US` → `/en/pricing` | next-intl handles                           | ✅ next-intl middleware (line 143)                                                     |

## Build/Lint/Test

| Check                 | Result                                                          |
| --------------------- | --------------------------------------------------------------- |
| `npm run lint`        | ✅ 0 errors/warnings                                            |
| `npx tsc --noEmit`    | ✅ 0 errors                                                     |
| `npm run build`       | ✅ 67/67 static pages, `/[locale]` prerendered as `/vi` + `/en` |
| Middleware unit tests | ✅ 16/16 (agy Task 0.3)                                         |

## Diff Summary (4 commits on `feat/i18n-multilingual`)

```
450647c feat(i18n): create [locale] segment layout and page for PoC (Task 0.4)
3ec9205 feat(i18n): compose next-intl middleware for public paths (Task 0.3)
e613108 feat(i18n): install next-intl + routing/request config + base messages (Task 0.2)
b9ba9d9 feat(i18n): add reserved locale slugs en/vi + DB constraint (Task 0.1)
```

## Files Added/Modified

- `config/reserved-subdomains.ts` (modified)
- `supabase/migrations/20260830_i18n_reserved_locale_slugs.sql` (new)
- `next.config.mjs` (modified: `withNextIntl`)
- `package.json` + `package-lock.json` (modified: `next-intl` dependency)
- `i18n/routing.ts` (new)
- `i18n/request.ts` (new)
- `messages/en.json` (new)
- `messages/vi.json` (new)
- `middleware.ts` (modified: intl composition)
- `tests/middleware.test.ts` (new: 16 test cases)
- `vitest.config.ts` (new)
- `app/[locale]/layout.tsx` (new)
- `app/[locale]/page.tsx` (new)

## Deferred to Phase 1+

- Full migration of `app/(public)/*` pages → `app/[locale]/`
- Sub-route translations: about-us, posts, legal/privacy, legal/terms
- Language switcher in public header
- hreflang alternates for SEO
