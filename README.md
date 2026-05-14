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

Vielora is a comprehensive AI chatbot platform that enables website owners to create, customize, and deploy intelligent assistants. Leveraging **RAG (Retrieval-Augmented Generation)**, Vielora chatbots provide accurate answers based directly on your website's content and uploaded documents.

## 🚀 Version Highlights

- **Real-time Pipeline**: Enhanced SSE (Server-Sent Events) tracking for website discovery and indexing.
- **Advanced Credits System**: Integrated wallet management with subscription-based and PAYG (Pay-As-You-Go) credits.
- **Enhanced Knowledge Base**: Support for manual text entries and file uploads (PDF, DOCX, TXT).
- **Pro Widget Customization**: Full control over colors, positioning, avatars, and suggested questions.
- **Robust Security**: Multi-layer protection including CORS origin verification, API rate limiting, and browser fingerprinting.

## 🛠 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) with App Router
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL + pgvector) — Integrated via `@supabase/ssr`
- **Storage**: Supabase Storage (bot avatars and knowledge files)
- **Authentication**: Supabase Auth
- **Server State**: [TanStack Query (React Query)](https://tanstack.com/query) — Fetched, cached, and synchronized server state
- **Client State**: [Zustand](https://zustand-demo.pmnd.rs/) — Managing transient UI states (e.g., Onboarding Wizard)
- **AI/LLM**: [Google Gemini](https://ai.google.dev/) (Free Tier supported)
  - Chat: `gemini-2.5-flash-lite`
  - Embeddings: `gemini-embedding-001`
- **Web Scraping**: Self-hosted async crawler
  - Static pages: Cheerio + Turndown
  - Dynamic/SPA pages: Puppeteer (Headless Chrome)
  - Queue: BullMQ + Redis for background processing
- **Billing Cron**: Standalone BullMQ worker for subscription lifecycles
- **Fingerprinting**: [FingerprintJS](https://fingerprint.com/) for unique visitor identification
- **Payment Gateways**: [PayOS](https://payos.vn/) (Vietnamese market)

## ✨ Core Features

- 🤖 **AI Chatbot**: Intelligent responses powered by Google Gemini.
- 📚 **RAG Pipeline**: Semantic search using high-dimensional vector embeddings.
- 🔍 **Hybrid Search**: Combining full-text search and semantic search (RRF) for maximum accuracy.
- 🌐 **Website Crawling**: Automatic discovery and indexing of website content.
- ⚡ **Async Processing**: Background job queue with real-time progress tracking.
- 📁 **File Support**: Upload PDFs, DOCX, or TXT files directly to the knowledge base.
- 💬 **Embeddable Widget**: Lightweight, responsive widget compatible with any web platform.
- 📊 **Analytics Dashboard**: Track questions, usage patterns, and conversation history.
- 💳 **Credit Management**: Wallet-based system with auto-refunds on processing failures.
- 🎨 **White-labeling**: Customize the bot's look and feel to match your brand identity.
- 🔒 **Enterprise-grade Security**: Origin verification, DDoS protection, and rate limiting.

## 📂 Project Structure

- `app/`: Next.js App Router (Pages & API endpoints).
- `components/`: Reusable UI components (Feature-based & shadcn/ui).
- `config/`: Application-wide constants (Pricing, RAG, Scraper limits).
- `hooks/`: Custom React hooks organized by feature (Dashboard, Onboarding).
- `lib/`: Core business logic and infrastructure:
  - `ai/` & `rag/`: Gemini integration, embedding, and retrieval logic.
  - `scraper/`: Async web crawler with BullMQ & Puppeteer.
  - `services/`: Domain service layer with Dependency Injection.
  - `security/`: Multi-layer protection (Rate limiting, CORS).
- `scripts/`: Standalone background workers and maintenance scripts.
- `supabase/`: Database schema, migrations, and storage configuration.
- `types/`: Global TypeScript definitions and API interfaces.

## 🚦 Getting Started

### Prerequisites

- Node.js 18+
- Supabase project (with `pgvector` extension enabled)
- Google AI Studio API key
- Redis instance (Local or [Upstash](https://upstash.com/))

### Environment Setup

1. Copy the example environment file:

```bash
cp .env.example .env.local
```

2. Fill in your credentials in `.env.local`:

```env
# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Gemini AI
GOOGLE_API_KEY=your_google_api_key

# Redis Queue
UPSTASH_REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379

# Payment (Optional)
PAYOS_CLIENT_ID=your_id
PAYOS_API_KEY=your_key
PAYOS_CHECKSUM_KEY=your_checksum
```

### Installation & Development

```bash
# Install dependencies
npm install

# Start all services (Next.js + Crawler Worker + Cron)
npm run dev
```

## 🏗 Architecture

### Service Layer Pattern

Vielora uses a **Dependency Injection** pattern in its service layer (`lib/services/`). Every service function accepts a `client: ServiceClient` as its first argument.

- **Route Handlers**: Pass a user-scoped client.
- **Workers/Crons**: Pass an admin-scoped client (`createAdminClient`) to bypass RLS for background tasks.

### Multi-layer Security

Vielora implements the **Security Sentinel** architecture:

1.  **Origin Verification**: Ensures the widget only runs on authorized domains.
2.  **API Rate Limiting**: Protects endpoints from DDoS and brute force.
3.  **Visitor ID Tracking**: Uses FingerprintJS to prevent credit exhaustion from bot-spam.
4.  **Message Rate Limiting**: Per-visitor and per-IP caps configurable by the bot owner.

## 🐳 Deployment

Vielora is optimized for Docker deployment with support for WebGL rendering in headless environments.

```bash
# Deploy using the interactive script
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

## 📜 License

This project is licensed under the MIT License.
