<div align="center">
  <img src="public/images/logo-footer.png" alt="Vielora Logo" width="250"/>

# Vielora - SaaS platform creates AI assistants for everyone.

**Empower your website with an intelligent AI chatbot in minutes**

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google-Gemini-orange)](https://ai.google.dev/)

</div>

---

Vielora is an AI chatbot platform for creating, training, customizing, and deploying website assistants. It combines website crawling, manual knowledge, file ingestion, and single-URL knowledge with a RAG pipeline so chatbots can answer from the owner's approved content.

## 🚀 Version 3.0.0 Highlights

- **Smart Homepage Navigation (SH-001)**: Intent-driven widget navigation that redirects visitors to configured Key Action Pages via a NAVIGATE response type. LLM-first intent matching with substring fallback (`NAVIGATION_USE_LLM_MATCH`), pre-flight navigation context, client-side countdown banner with cancel, and 3-layer URL validation with blocked attempts logged server-side to a `security_events` audit table. See [Smart Homepage Spec](docs/specs/smart-homepage/SPEC.md) and [Feature Doc](docs/smart-homepage.md).
- **Report Export**: Report template management, workspace-level reports dashboard, and asynchronous PDF rendering through a dedicated Puppeteer BullMQ worker with HMAC-signed download links (`REPORT_TOKEN_SECRET`).
- **Voice-to-Report & Dashboard STT**: Speech-to-text transcription endpoint and voice-note formatting so users can dictate report content instead of typing.
- **Enterprise Plan**: Dedicated enterprise upgrade page with dynamic quote-price API and base pricing of 1.190.000 VND for a 20-bot minimum.
- **Workspace Branding**: Per-workspace branding customization page with logo/asset upload API.
- **Unified Workspace Knowledge**: Workspace-scoped knowledge management shared across all bots in a workspace.
- **Group Chat Additions**: In-group voice recording with STT, group insights API, and message-to-note conversion with pin/unpin and collapse.
- **PWA Enhancements**: Expanded PWA support and workspace management across dashboard and chat surfaces.
- **Checkout Refactor**: Unified checkout creation API with slimmed-down checkout and credits-checkout pages.

## 🚀 Version 3.1.0 Highlights — Multilingual Support (EN/VI)

- **Full-Coverage i18n (4 Layers)**: Public pages via URL prefix (`/vi`, `/en`) with `next-intl` + `hreflang` SEO (L1); Dashboard/Auth via cookie `NEXT_LOCALE` + `user_metadata.locale` fallback `vi` (L2); Widget chat per-bot via `widget_settings.ui_language` (`ESystemLanguage`) independent from platform locale (L3). See [i18n Spec](docs/specs/i18n-multilingual/spec.md) and [Quickstart](docs/specs/i18n-multilingual/quickstart.md).
- **Widget Language Independence**: Each bot can serve different widget language; "Ngôn ngữ Widget" card in `SettingsTab` saves per-bot setting.
- **Reserved Locale Slugs**: Workspace creation rejects `en`/`vi` as slugs (`config/reserved-subdomains.ts`).

## 🚀 Version 2.7.0 Highlights

- **Group Chat Feature**: Multi-user private group chat for Pro/Enterprise bots (up to 5 members per group), real-time message broadcasting, unread receipts, knowledge pinning to bot RAG, daily LLM conversation summaries, inline PWA auth, offline queueing, and plan-gate downgrade management.

## 🚀 Version 2.6.0 Highlights

- **Multi-tenant Workspace System**: Workspace-based architecture with path-based routing (`vielora.vn/{slug}`), member roles (Owner/Admin/Member/Viewer), and email invitation flow with token-based acceptance.
- **Subscription Expiry Reminders**: Automated email notifications sent to all workspace members 3 days before subscription expiry with upgrade CTA.
- **Subscription Lifecycle Automation**: Daily cron job handles downgrade, credit reset, bot stop, and sends downgrade notification to workspace members.
- **Webhook System**: Workspace-level webhooks with 10 event types, HMAC-SHA256 signing, and max 10 per workspace enforcement.
- **Voice Chat**: Real-time voice recording with MediaRecorder API, Whisper STT transcription, and soundwave visualizer in widget chat.
- **Bot Pagination & Search**: Paginated bot retrieval with search and sorting functionality for large bot inventories.
- **Copy Message**: One-click message copy with toast notification in chat UI.
- **Upgrade History**: Workspace-scoped payment history view showing all payments made for a workspace.
- **Redis Caching**: Read-through cache with stampede protection, cooldown mechanism, and automatic invalidation on bot mutations.
- **AI Customization**: Bot-level personality and skill selection with plan-based access control, detail views, and onboarding integration.
- **Authentication Security**: Password login with failed-attempt tracking and cooldown responses.
- **EasyInvoice E-Invoicing**: Automated VAT invoice generation with BullMQ worker, double-layer idempotency, signed PDF tokens, and invoice history.
- **Lead Form & Management**: Widget lead capture form with validation, dashboard LeadsTab, intent classification with negative keywords, and bot-level lead API.
- **Checkout Enhancement**: Editable quantity input with validation (1–100), hover-styled +/- buttons, and PAYG invoice trigger fix.
- **Landing Page Redesign**: New DataSourcesSection with AI core visualization, ScrollDrivenFeatures with scroll-driven mockups, 3D logo hero, and WebP optimization.
- **PWA Enhancements**: Android installation instructions, Opera support, reusable sheet shell, SW versioning, and offline message queue.
- **Shopify Integration**: Full embedded app with OAuth, SSO, webhooks (customer/shop redaction), and native App Bridge dashboard embedding.
- **Blog Engine**: Public blog pages with categories, posts, SEO metadata, category filtering, and dynamic routing (`/posts/`).
- **Admin Portal**: Support ticket management, banned users, discounts, bot lifecycle oversight, and dashboard lock for blocked users.
- **Standalone Chat Sharing**: Shareable chat pages with custom slugs, visibility toggles, QR code generation, and PWA install prompts.
- **Allowed Domains**: Per-bot domain allowlisting with validation and UI management in bot settings.
- **Onboarding Enhancements**: Multi-step wizard with file upload step, knowledge mode selection (manual/URL/website), exit confirmation dialog, and improved state persistence.
- **RAG Pipeline Enhancements**: Hybrid search with FTS + cosine similarity, improved null handling, list formatting, and hallucination reduction.
- **Widget & Chat Hardening**: Bot availability checks, bot-level rate limits, bot suspension handling, and better standalone chat initialization.
- **Authentication Security**: Password login with failed-attempt tracking and cooldown responses.
- **Support Portal**: Dashboard users can submit and review support tickets from `/dashboard/support`.
- **Billing Updates**: PAYG pricing with JSONB price data, payment history, and subscription + PAYG credit balances.

## 🛠 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) with App Router
- **Language**: TypeScript 5.7
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) and Radix UI
- **Database**: [Supabase](https://supabase.com/) PostgreSQL with pgvector
- **Storage**: Supabase Storage for bot avatars, widget assets, and knowledge files
- **Authentication**: Supabase Auth with server-side login cooldown protection
- **Server State**: [TanStack Query](https://tanstack.com/query)
- **Client State**: [Zustand](https://zustand-demo.pmnd.rs/)
- **AI/LLM**: [Google Gemini](https://ai.google.dev/)
  - Chat: `gemini-3.1-flash-lite` (configurable via `CHAT_MODEL`)
  - Embeddings: `gemini-embedding-001`
  - STT & navigation intent: `gemini-3.1-flash-lite` (`STT_MODEL`, `NAVIGATION_INTENT_MODEL`)
  - PDF fallback extraction: configurable via `PDF_FALLBACK_MODEL`
- **Caching**: Redis read-through cache with stampede protection and TTL-based invalidation
- **Web Scraping**: Self-hosted async crawler
  - Static pages: Cheerio + Turndown
  - Dynamic/SPA pages: Puppeteer with stealth plugin
  - Queue: BullMQ + Redis for discovery, page crawl, indexing, and invoice jobs
- **Billing Cron**: Standalone BullMQ worker for subscription lifecycle jobs
- **Invoice Worker**: BullMQ worker for automated EasyInvoice e-invoicing with retry and idempotency
- **Report Export Worker**: BullMQ worker rendering report templates to PDF via Puppeteer with HMAC-signed download tokens
- **Email**: Resend for transactional emails
- **i18n**: [next-intl 4.x](https://next-intl.dev/) with URL prefix (`/vi`, `/en`) + cookie persistence + `hreflang` SEO
- **Fingerprinting**: [FingerprintJS](https://fingerprint.com/) for visitor identification
- **PWA**: Service Worker, Web App Manifest, dynamic apple-touch-icon
- **Offline Detection**: `navigator.onLine` + event listeners with UI banner
- **Payment Gateways**: PayOS
- **E-Invoicing**: EasyInvoice (VAT e-invoice with HSM signing)
- **Shopify Integration**: Shopify App Bridge, OAuth, webhooks, embedded admin dashboard

## ✨ Core Features

- 👥 **Workspace System**: Multi-tenant workspace with member roles, email invitations, and path-based routing (`vielora.vn/{slug}`).
- 🤖 **AI Chatbot**: Website-aware answers powered by Google Gemini.
- 📚 **RAG Pipeline**: Semantic retrieval with vector embeddings and source-aware context, including workspace-level shared knowledge.
- 🔍 **Hybrid Search**: Full-text and semantic ranking with reciprocal rank fusion.
- 🌐 **Website Crawling**: Discover, curate, crawl, and index website pages asynchronously.
- 🔗 **Single URL Knowledge**: Add an external article or document URL as one knowledge source.
- 📁 **File Knowledge**: Upload PDF, DOCX, TXT, CSV, or Markdown files to the knowledge base.
- ✍️ **Manual Knowledge**: Create and edit custom text entries with credit accounting.
- ⚡ **Real-time Progress**: SSE-based progress tracking for discovery, crawler, and indexer jobs.
- 💬 **Embeddable Widget**: Lightweight widget with standard script and GTM installation modes.
- 📊 **Analytics Dashboard**: Track conversations, recent questions, usage, and indexed content.
- 💳 **Credit Management**: Subscription and PAYG wallets with refunds on processing failures.
- 🧾 **Payment History**: Upgrade area includes purchase history and formatted payment records.
- 🧾 **Automated Invoicing**: VAT e-invoice generation via EasyInvoice with signed PDF access and download.
- 🎫 **Support Portal**: Authenticated users can create and review support tickets.
- 📱 **PWA Ready**: Installable as a standalone app with offline page and service worker caching.
- 📶 **Offline Detection**: Real-time network status monitoring with animated connection-loss and recovery banners.
- 🎨 **White-labeling**: Configure bot name, avatar, colors, chat background, icon, position, and suggested questions.
- 🧠 **AI Personality**: Bot-level personality selection with plan-based access control.
- 🛠️ **AI Skills**: Bot-level skill configuration with uniqueness validation.
- 📝 **Lead Capture**: Widget lead form with validation, dashboard LeadsTab, and intent classification.
- 🔒 **Security Controls**: Origin verification, API rate limiting, bot rate limits, login cooldowns, and visitor tracking.
- 🛍️ **Shopify Embedded App**: Native Shopify integration with SSO, OAuth, App Bridge, and webhook handling.
- 📝 **Blog Engine**: Public blog with categories, SEO metadata, and dynamic post routing.
- 🔐 **Admin Dashboard**: Support tickets, user management, bot oversight, and ban controls.
- 🔗 **Standalone Chat Sharing**: Shareable chat pages with custom slugs, visibility settings, and QR codes.
- 🌐 **Allowed Domains Restriction**: Per-bot domain allowlisting with validation.
- ⚡ **Redis Caching**: Read-through cache with stampede protection and automatic invalidation.
- 🎤 **Voice Chat**: Real-time voice recording with MediaRecorder API, Whisper STT, and soundwave visualizer.
- 🔔 **Webhook System**: Workspace-level webhooks with 10 event types and HMAC-SHA256 signing.
- 📧 **Subscription Reminders**: Automated expiry email notifications sent to all workspace members.
- 🧭 **Smart Homepage Navigation**: Intent-driven widget redirects to Key Action Pages with LLM intent matching and server-side security audit logging.
- 📄 **Report Export**: Report templates, workspace reports dashboard, and signed PDF downloads via Puppeteer worker.
- 🗣️ **Voice-to-Report**: Dashboard speech-to-text transcription and voice-note formatting for hands-free report authoring.
- 💼 **Enterprise Plan**: Quote-based enterprise tier with dedicated upgrade page and 20-bot minimum.
- 🏷️ **Workspace Branding**: Per-workspace branding customization with asset uploads.
- 👥 **Group Chat**: Private multi-user group chat for Pro/Enterprise bots with realtime messaging, knowledge pinning, notes, insights, and PWA access.
- 🌐 **Multilingual UI (EN/VI)**: Localized public pages (`/en`, `/vi` with `hreflang`), dashboard (cookie + DB persistence, no URL prefix), and per-bot widget chat (`StandaloneChatUI`, `GroupChatView`, `widget.js`) with platform/widget locale independence.

## 📂 Project Structure

- `app/`: Next.js App Router pages and API routes.
  - `[locale]/`: Localized public pages (`/`, `about-us`, `posts`, `privacy`, `terms`) with URL prefix (`/vi`, `/en`) and `hreflang` alternates — replaces legacy `(public)/`.
  - `api/auth/`: Login with password, auth callback.
  - `api/bots/`: Bot CRUD, knowledge, analytics, leads, config, personalities, skills, and group chat management (members, messages, notes, insights).
  - `api/dashboard/`: STT transcription and voice-note formatting for report authoring.
  - `api/enterprise/`: Enterprise plan quote-price calculation.
  - `api/invoices/`: Invoice download, PDF, and payment lookup.
  - `api/invitations/accept/`: Workspace invitation acceptance endpoint.
  - `api/payment/`: PayOS create, return, webhook, cancel, PAYG create.
  - `api/reports/`: Signed report export downloads.
  - `api/workspaces/`: Workspace CRUD, members, invitations, webhooks, branding, templates, knowledge, credits, subscription, and reports.
  - `api/widget/`: Widget init, chat (with NAVIGATE navigation responses), and lead APIs.
  - `auth/accept-invite/`: Workspace invitation acceptance page.
  - `auth/callback/`: OAuth callback handler.
  - `chat/[slug]/`: Standalone chat pages, including PWA group chat (`chat/[slug]/group/`).
  - `dashboard/`: Dashboard pages (bots, overview, checkout, credits, upgrade, history, reports, settings, support).
  - `dashboard/bots/[botId]/group/`: Group chat management for managers.
  - `dashboard/reports/`: Workspace report exports dashboard.
  - `dashboard/settings/members/`: Workspace member management with dynamic list and pending invitations.
  - `dashboard/settings/branding/` and `dashboard/settings/templates/`: Workspace branding and report template management.
  - `dashboard/upgrade/enterprise/`: Enterprise plan upgrade page.
  - `dashboard/upgrade/history/`: Workspace-scoped payment history.
  - `dashboard/workspace-knowledge/`: Unified workspace-level knowledge management.
  - `public-bot/[botSlug]/`: Public bot PWA pages.
  - `shopify/`: Shopify embedded app dashboard.
- `components/`: Feature-oriented UI components plus shared shadcn/ui primitives.
  - `chat/`: StandaloneChatUI, LeadForm, PWA install components, and group chat UI (GroupChatView, GroupDrawer, notes modals).
  - `dashboard/overview/`: Dashboard overview with bots grid, bots section, bots table, and workspace-scoped data.
  - `dashboard/settings/`: Workspace member management, InviteMemberModal.
  - `dashboard/shared/`: WorkspaceSwitcher, DashboardSidebar, DashboardMobileHeader.
  - `dashboard/upgrade/`: Payment history client.
  - `landing/`: HeroSection, DataSourcesSection, FeaturesSection, AccessMethodsSection, feature mockups (MockupSmartHomepage, MockupGroupChat, MockupIntegration, etc.).
  - `shared/`: AIConfigurator, InvoiceForm, EmailChipsInput, DemoChatbotWidget.
- `config/`: App-wide constants for credits, invoice, knowledge, pricing, RAG, scraper, storage, and widget behavior.
- `i18n/`: `routing.ts` (`locales: ["vi","en"]`, `defaultLocale: "vi"`), `request.ts`, `navigation.ts` (typed `Link`/`useRouter` from `next-intl`).
- `messages/`: `en.json`, `vi.json` (2552 lines each, parity-checked) for L1/L2 translations.
- `hooks/`: Dashboard, onboarding, and feature-specific React hooks.
  - `dashboard/main/`: Dashboard data fetching hooks (useDashboardData).
  - `dashboard/bots/`: Bot list with search and pagination (useBotsList).
  - `useWorkspace.tsx`: Workspace context hook with cookie persistence and path-based redirect.
- `lib/`: Core business logic and infrastructure.
  - `ai/` and `rag/`: Gemini integration, embeddings, retrieval, intent classification, and generation.
  - `cache/`: Redis bot cache with stampede protection.
  - `config/`: AI customization, cache, invoice, and Redis configuration.
  - `helpers/`: EasyInvoice XML builder, invoice token, number-to-words, payment, PWA, URL helpers, and `seo-schema.helper.ts` (localized Schema.org JSON-LD for Home/About/Blog).
  - `i18n/`: `dashboard-locale.ts` (cookie + `user_metadata` fallback), `update-locale.ts`, `widget-translations.ts` (per-bot widget strings, fallback `vi`).
  - `scraper/`: BullMQ queues, workers, extractors, and job processors.
  - `security/`: Rate limiting, widget security, and login-attempt tracking.
  - `services/`: Domain services for bots, pages, credits, payments, invoices, analytics, email, AI config, leads, auth, **workspaces**, **subscriptions**, **wallets**, **webhooks**, **subscription-cron**, **payment-history**, **group-chat**, and **security-events**.
  - `services/server/`: Invoice queue, invoice worker, and bot cache service.
- `scripts/`: Worker, cron, deployment, test, maintenance, and `build-widget.ts`/`sync-widget-i18n.ts` (build `widget/widget.src.js` → `public/widget.js`).
- `plugins/`: Third-party platform extensions (Shopify app, WordPress plugin).
- `supabase/`: Database migrations, generated types, and hybrid search functions.
- `store/`: Zustand stores (AI config, appearance, auth, bot detail, dashboard, onboarding).
- `types/`: Shared TypeScript types and enums.

## 🚦 Getting Started

### Prerequisites

- Node.js 18+
- Supabase project with `pgvector`
- Google AI Studio API key
- Redis instance through `REDIS_URL`, `UPSTASH_REDIS_URL`, or host/port/password variables
- PayOS credentials for payments
- Resend credentials if transactional emails are enabled
- EasyInvoice credentials if VAT e-invoicing is enabled
- Shopify API credentials if Shopify integration is enabled (client ID, client secret, app URL)

### Environment Setup

1. Copy the example environment file:

```bash
cp .env.example .env.local
```

2. Fill in your credentials in `.env.local`:

```env
# App
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEMO_BOT_ID=vielora_demo_bot_id

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_postgresql_connection_string

# Google Gemini
GOOGLE_API_KEY=your_google_api_key
EMBEDDING_MODEL=gemini-embedding-001
CHAT_MODEL=gemini-3.1-flash-lite
STT_MODEL=gemini-3.1-flash-lite

# Smart Homepage navigation (optional)
NAVIGATION_USE_LLM_MATCH=true
NAVIGATION_INTENT_MODEL=gemini-3.1-flash-lite

# Redis queue
REDIS_URL=redis://default:password@localhost:6379
# or
UPSTASH_REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379
# or
REDIS_PASSWORD=your_redis_password
REDIS_IP=0.0.0.0
REDIS_PORT=50379

# PayOS
PAYOS_CLIENT_ID=your_payos_client_id
PAYOS_API_KEY=your_payos_api_key
PAYOS_CHECKSUM_KEY=your_payos_checksum_key
PAYOS_TEST_MODE=true

# Email
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=no-reply@your-domain.com

# EasyInvoice (VAT E-Invoicing)
EASYINVOICE_API_BASE_URL=https://api.easyinvoice.vn
EASYINVOICE_USERNAME=your_easyinvoice_username
EASYINVOICE_PASSWORD=your_easyinvoice_password
EASYINVOICE_TAX_CODE=0109xxxxxxxx
EASYINVOICE_PATTERN=1/001
EASYINVOICE_SERIAL=C26TAA
INVOICE_TOKEN_SECRET=your_invoice_token_secret_here

# Report Export (must be distinct from INVOICE_TOKEN_SECRET)
REPORT_TOKEN_SECRET=your_report_token_secret_here

# Shopify (optional)
NEXT_PUBLIC_SHOPIFY_CLIENT_ID=your_shopify_client_id
SHOPIFY_CLIENT_SECRET=your_shopify_client_secret
```

### Installation & Development

```bash
npm install
npm run dev
```

Useful scripts:

```bash
npm run dev          # Start Next.js + worker + cron concurrently
npm run dev:next     # Next.js only
npm run dev:worker   # BullMQ crawler/indexer worker (watch mode)
npm run dev:cron     # Subscription/billing cron worker (watch mode)
npm run worker       # BullMQ crawler/indexer worker
npm run cron         # Subscription/billing cron worker
npm run build        # Production build
npm run start        # Production start
npm run lint         # ESLint
npm run format       # Prettier format
npm run check-format # Prettier check
```

## 🏗 Architecture

### Routing Architecture

Vielora uses a hybrid routing strategy:

- **Path-based workspace routing**: `vielora.vn/{workspace-slug}` → middleware rewrites to `/dashboard` for authenticated workspace access.
- **Bot PWA subdomain**: `{bot-slug}.vielora.vn` → middleware rewrites to `/public-bot/{bot-slug}` for embedded chatbot widgets with full PWA isolation (service worker, manifest, iOS A2HS).
- **Reserved paths** (`auth`, `dashboard`, `api`, `posts`, `admin`, etc.) bypass workspace detection.
- `/dashboard` redirects to `/{workspace-slug}` via 308 when a workspace cookie is present.

### Multilingual Architecture (Hybrid + Widget)

Vielora implements 4-layer i18n per `docs/specs/i18n-multilingual/spec.md`:

| Layer  | Area                                                        | Mechanism                                                                    | URL Example                     |
| ------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------- |
| **L1** | Public (landing, posts, legal)                              | `next-intl` URL prefix + `hreflang` alternates                               | `/en/pricing`, `/vi/about-us`   |
| **L2** | Dashboard & Auth                                            | Cookie `NEXT_LOCALE` + `user_metadata.locale` (fallback `vi`), no URL prefix | `/dashboard` renders per cookie |
| **L3** | Widget (`widget.js`, `StandaloneChatUI`, `GroupChatView`)   | `bots.widget_settings.ui_language` (JSONB, `ESystemLanguage`) per-bot        | Independent from L2             |
| **L4** | `chat/[slug]`, `public-bot/[botSlug]`, `api/*`, `shopify/*` | No i18n (out of scope)                                                       | —                               |

Middleware (`middleware.ts`) composes `createIntlMiddleware(routing)` only for `PUBLIC_I18N_PATHS` (`/`, `/about-us`, `/posts`, `/privacy`, `/terms`); locale prefix on non-public paths is stripped and redirected. `getDashboardLocale()` prioritizes cookie → `user_metadata` → `vi`. Adding a new language requires enum + `messages/{locale}.json` + widget translations — no DB migration (see `docs/specs/i18n-multilingual/quickstart.md`).

### Service Layer Pattern

Vielora uses dependency injection in `lib/services/`. Service functions accept a Supabase-compatible `ServiceClient` as the first argument.

- **Route handlers** pass user-scoped clients for RLS-aware operations.
- **Workers and crons** pass admin clients for background processing.
- **Client services** wrap API calls for dashboard and widget flows.

### Redis Caching

Bot widget data is cached in Redis with read-through strategy:

- **Stampede protection**: Concurrent requests share a single cache fill.
- **Cooldown**: Redis connection failures trigger a cooldown period before retry.
- **Invalidation**: Cache is automatically invalidated on bot mutations and subscription changes.

### Knowledge Pipeline

Knowledge can enter the system through manual text, uploaded files, single URLs, or website crawling.

1. The API validates ownership, plan access, source type, duplicate URLs, file path ownership, and available credits.
2. Credits are deducted before indexing work and refunded when supported failure paths occur.
3. URL and website jobs run through BullMQ queues.
4. Extracted content is chunked, embedded, and stored for retrieval.
5. The dashboard tracks queue status and indexed document counts.

### Invoice Pipeline

E-invoices are generated asynchronously via BullMQ:

1. Payment success triggers invoice row creation with `pending` status.
2. Invoice worker picks up the job with atomic lock (`UPDATE ... WHERE status=pending`).
3. Worker builds XML, calls EasyInvoice API, and updates invoice with provider details.
4. Signed PDF tokens are generated for secure public access.
5. Failed jobs retry with exponential backoff; orphaned invoices are scanned on worker start.

### Report Export Pipeline

Report exports render asynchronously via BullMQ:

1. Dashboard requests an export from a report template; the API validates workspace access and creates the export record.
2. The report export worker picks up the job and signs an internal render token.
3. Puppeteer renders each language variant of the report to PDF and uploads results to Supabase Storage.
4. Download links are HMAC-signed with `REPORT_TOKEN_SECRET` (7-day validity) and verified by the download route.

### Multi-layer Security

Vielora implements layered protection for dashboard, auth, and widget traffic.

1. **Origin Verification**: Ensures widgets run only from authorized domains.
2. **Allowed Domains**: Per-bot domain allowlisting with validation for granular access control.
3. **API Rate Limiting**: Protects public widget endpoints from abuse.
4. **Bot Rate Limits**: Enforces bot-level daily and per-IP message caps.
5. **Visitor ID Tracking**: Uses FingerprintJS to reduce anonymous abuse.
6. **Login Cooldowns**: Tracks failed password attempts and returns cooldown metadata.
7. **Navigation Security Audit**: Widget NAVIGATE requests are validated in 3 layers server-side; blocked or cancelled attempts are recorded in the `security_events` table.

## 🐳 Deployment

Vielora supports two Docker deployment profiles:

### Monolith (all-in-one)

Runs web, worker, cron, and Redis on a single server:

```bash
docker compose --profile monolith up -d --build
```

### Hybrid (split)

Web on Vercel, worker/cron/Redis on EC2:

```bash
docker compose --profile hybrid up -d --build
```

### Services

| Service  | Description                                                |
| -------- | ---------------------------------------------------------- |
| `web`    | Next.js application (monolith only)                        |
| `worker` | BullMQ crawler, indexer, invoice, and report export worker |
| `cron`   | Subscription lifecycle scheduled jobs                      |
| `redis`  | Message broker and cache store                             |

### Environment

Copy `.env.example` to `.env` and fill in credentials. Docker compose reads from `.env` automatically.

Production deployments should run the Next.js app, crawler worker, cron worker, Redis, Supabase, and required payment/email/e-invoice integrations with matching environment variables.

## 📜 License

This project is licensed under the MIT License.
