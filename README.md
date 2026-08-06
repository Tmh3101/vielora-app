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
  - Chat: `gemini-2.5-flash-lite`
  - Embeddings: `gemini-embedding-001`
  - PDF fallback extraction: configurable via `PDF_FALLBACK_MODEL`
- **Caching**: Redis read-through cache with stampede protection and TTL-based invalidation
- **Web Scraping**: Self-hosted async crawler
  - Static pages: Cheerio + Turndown
  - Dynamic/SPA pages: Puppeteer with stealth plugin
  - Queue: BullMQ + Redis for discovery, page crawl, indexing, and invoice jobs
- **Billing Cron**: Standalone BullMQ worker for subscription lifecycle jobs
- **Invoice Worker**: BullMQ worker for automated EasyInvoice e-invoicing with retry and idempotency
- **Email**: Resend for transactional emails
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

## 📂 Project Structure

- `app/`: Next.js App Router pages and API routes.
  - `(public)/`: Public pages (landing, about-us, posts).
  - `api/auth/`: Login with password, auth callback.
  - `api/bots/`: Bot CRUD, knowledge, analytics, leads, config, personalities, skills.
  - `api/invoices/`: Invoice download, PDF, and payment lookup.
  - `api/invitations/accept/`: Workspace invitation acceptance endpoint.
  - `api/payment/`: PayOS create, return, webhook, cancel, PAYG create.
  - `api/workspaces/`: Workspace CRUD, members, invitations, webhooks.
  - `api/widget/`: Widget init, chat, and lead APIs.
  - `auth/accept-invite/`: Workspace invitation acceptance page.
  - `auth/callback/`: OAuth callback handler.
  - `chat/[slug]/`: Standalone chat pages.
  - `dashboard/`: Dashboard pages (bots, overview, checkout, credits, upgrade, history, settings, support).
  - `dashboard/settings/members/`: Workspace member management with dynamic list and pending invitations.
  - `dashboard/upgrade/history/`: Workspace-scoped payment history.
  - `public-bot/[botSlug]/`: Public bot PWA pages.
  - `shopify/`: Shopify embedded app dashboard.
- `components/`: Feature-oriented UI components plus shared shadcn/ui primitives.
  - `chat/`: StandaloneChatUI, LeadForm, PWA install components.
  - `dashboard/overview/`: Dashboard overview with bots grid, bots section, bots table, and workspace-scoped data.
  - `dashboard/settings/`: Workspace member management, InviteMemberModal.
  - `dashboard/shared/`: WorkspaceSwitcher, DashboardSidebar, DashboardMobileHeader.
  - `dashboard/upgrade/`: Payment history client.
  - `landing/`: HeroSection, DataSourcesSection, ScrollDrivenFeatures, feature mockups.
  - `shared/`: AIConfigurator, InvoiceForm, EmailChipsInput, DemoChatbotWidget.
- `config/`: App-wide constants for credits, invoice, knowledge, pricing, RAG, scraper, storage, and widget behavior.
- `hooks/`: Dashboard, onboarding, and feature-specific React hooks.
  - `dashboard/main/`: Dashboard data fetching hooks (useDashboardData).
  - `dashboard/bots/`: Bot list with search and pagination (useBotsList).
  - `useWorkspace.tsx`: Workspace context hook with cookie persistence and path-based redirect.
- `lib/`: Core business logic and infrastructure.
  - `ai/` and `rag/`: Gemini integration, embeddings, retrieval, intent classification, and generation.
  - `cache/`: Redis bot cache with stampede protection.
  - `config/`: AI customization, cache, invoice, and Redis configuration.
  - `helpers/`: EasyInvoice XML builder, invoice token, number-to-words, payment, PWA, and URL helpers.
  - `scraper/`: BullMQ queues, workers, extractors, and job processors.
  - `security/`: Rate limiting, widget security, and login-attempt tracking.
  - `services/`: Domain services for bots, pages, credits, payments, invoices, analytics, email, AI config, leads, auth, **workspaces**, **subscriptions**, **wallets**, **webhooks**, **subscription-cron**, and **payment-history**.
  - `services/server/`: Invoice queue, invoice worker, and bot cache service.
- `scripts/`: Worker, cron, deployment, test, and maintenance scripts.
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
CHAT_MODEL=gemini-2.5-flash-lite

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

### Multi-layer Security

Vielora implements layered protection for dashboard, auth, and widget traffic.

1. **Origin Verification**: Ensures widgets run only from authorized domains.
2. **Allowed Domains**: Per-bot domain allowlisting with validation for granular access control.
3. **API Rate Limiting**: Protects public widget endpoints from abuse.
4. **Bot Rate Limits**: Enforces bot-level daily and per-IP message caps.
5. **Visitor ID Tracking**: Uses FingerprintJS to reduce anonymous abuse.
6. **Login Cooldowns**: Tracks failed password attempts and returns cooldown metadata.

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

| Service  | Description                                 |
| -------- | ------------------------------------------- |
| `web`    | Next.js application (monolith only)         |
| `worker` | BullMQ crawler, indexer, and invoice worker |
| `cron`   | Subscription lifecycle scheduled jobs       |
| `redis`  | Message broker and cache store              |

### Environment

Copy `.env.example` to `.env` and fill in credentials. Docker compose reads from `.env` automatically.

Production deployments should run the Next.js app, crawler worker, cron worker, Redis, Supabase, and required payment/email/e-invoice integrations with matching environment variables.

## 📜 License

This project is licensed under the MIT License.
