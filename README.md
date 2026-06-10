<div align="center">
  <img src="public/images/logo-footer.png" alt="Vielora Logo" width="250"/>

# Vielora - AI Chatbot Builder

**Empower your website with an intelligent AI chatbot in minutes**

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google-Gemini-orange)](https://ai.google.dev/)

</div>

---

Vielora is an AI chatbot platform for creating, training, customizing, and deploying website assistants. It combines website crawling, manual knowledge, file ingestion, and single-URL knowledge with a RAG pipeline so chatbots can answer from the owner's approved content.

## 🚀 Version 2.1.0 Highlights

- **Single URL Knowledge**: Add one article, blog post, or documentation page directly to a bot without re-crawling the root website.
- **Expanded Knowledge Base**: Manual text, uploaded files, and URL entries now share the same credit/refund and indexing workflow.
- **Improved Crawler Pipeline**: Separate discovery, page crawl, and indexer queue tracking with better failure handling for URL knowledge jobs.
- **Bot Detail Dashboard**: Refactored bot management UI with dedicated tabs for overview, knowledge, analytics, appearance, integration, and settings.
- **Widget & Chat Hardening**: Bot availability checks, bot-level rate limits, clearer exceeded-limit messages, and better standalone chat initialization.
- **Authentication Security**: Password login now uses a server route with failed-attempt tracking and cooldown responses.
- **Support Portal**: Dashboard users can submit and review support tickets from `/dashboard/support`.
- **Billing Updates**: PAYG pricing supports JSONB price data, upgrade flow includes payment history, and the dashboard shows subscription plus PAYG credit balances.
- **Embed Options**: Integration tab now supports standard script embedding and Google Tag Manager snippets.
- **Appearance Controls**: Live color previews, icon/background upload handling, hex color validation, and position persistence improvements.

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
- **Web Scraping**: Self-hosted async crawler
  - Static pages: Cheerio + Turndown
  - Dynamic/SPA pages: Puppeteer with stealth plugin
  - Queue: BullMQ + Redis for discovery, page crawl, and indexing jobs
- **Billing Cron**: Standalone BullMQ worker for subscription lifecycle jobs
- **Email**: Resend for transactional emails
- **Fingerprinting**: [FingerprintJS](https://fingerprint.com/) for visitor identification
- **Payment Gateways**: PayOS and VNPay

## ✨ Core Features

- 🤖 **AI Chatbot**: Website-aware answers powered by Google Gemini.
- 📚 **RAG Pipeline**: Semantic retrieval with vector embeddings and source-aware context.
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
- 🎫 **Support Portal**: Authenticated users can create and review support tickets.
- 🎨 **White-labeling**: Configure bot name, avatar, colors, chat background, icon, position, and suggested questions.
- 🔒 **Security Controls**: Origin verification, API rate limiting, bot rate limits, login cooldowns, and visitor tracking.

## 📂 Project Structure

- `app/`: Next.js App Router pages and API routes.
- `components/`: Feature-oriented UI components plus shared shadcn/ui primitives.
- `config/`: App-wide constants for credits, knowledge limits, pricing, RAG, scraper, storage, and widget behavior.
- `hooks/`: Dashboard, onboarding, and feature-specific React hooks.
- `lib/`: Core business logic and infrastructure:
  - `ai/` and `rag/`: Gemini integration, embeddings, retrieval, and generation.
  - `scraper/`: BullMQ queues, workers, extractors, and job processors.
  - `services/`: Domain service layer for bots, pages, credits, payments, analytics, email, and auth.
  - `security/`: Rate limiting, widget security, and login-attempt tracking.
  - `helpers/`: Shared formatting, URL, color, icon, embed, payment, and auth helpers.
- `scripts/`: Worker, cron, deployment, and maintenance scripts.
- `supabase/`: Database migrations, generated types, and storage-related schema.
- `types/`: Shared TypeScript types and enums.

## 🚦 Getting Started

### Prerequisites

- Node.js 18+
- Supabase project with `pgvector`
- Google AI Studio API key
- Redis instance through `REDIS_URL`, `UPSTASH_REDIS_URL`, or host/port/password variables
- PayOS credentials for PayOS payments
- VNPay credentials if VNPay payments are enabled
- Resend credentials if transactional emails are enabled

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

# Google Gemini
GOOGLE_API_KEY=your_google_api_key
EMBEDDING_MODEL=gemini-embedding-001
CHAT_MODEL=gemini-2.5-flash-lite
PDF_FALLBACK_MODEL=gemini-2.5-flash-lite

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
```

### Installation & Development

```bash
npm install
npm run dev
```

Useful scripts:

```bash
npm run dev:next     # Next.js only
npm run worker       # BullMQ crawler/indexer worker
npm run cron         # Subscription/billing cron worker
npm run build        # Production build
npm run test         # Vitest test suite
npm run check-format # Prettier check
```

## 🏗 Architecture

### Service Layer Pattern

Vielora uses dependency injection in `lib/services/`. Service functions accept a Supabase-compatible `ServiceClient` as the first argument.

- **Route handlers** pass user-scoped clients for RLS-aware operations.
- **Workers and crons** pass admin clients for background processing.
- **Client services** wrap API calls for dashboard and widget flows.

### Knowledge Pipeline

Knowledge can enter the system through manual text, uploaded files, single URLs, or website crawling.

1. The API validates ownership, plan access, source type, duplicate URLs, file path ownership, and available credits.
2. Credits are deducted before indexing work and refunded when supported failure paths occur.
3. URL and website jobs run through BullMQ queues.
4. Extracted content is chunked, embedded, and stored for retrieval.
5. The dashboard tracks queue status and indexed document counts.

### Multi-layer Security

Vielora implements layered protection for dashboard, auth, and widget traffic.

1. **Origin Verification**: Ensures widgets run only from authorized domains.
2. **API Rate Limiting**: Protects public widget endpoints from abuse.
3. **Bot Rate Limits**: Enforces bot-level daily and per-IP message caps.
4. **Visitor ID Tracking**: Uses FingerprintJS to reduce anonymous abuse.
5. **Login Cooldowns**: Tracks failed password attempts and returns cooldown metadata.

## 🐳 Deployment

Vielora is optimized for Docker deployment with support for headless browser rendering.

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

Production deployments should run the Next.js app, crawler worker, cron worker, Redis, Supabase, and required payment/email integrations with matching environment variables.

## 📜 License

This project is licensed under the MIT License.
