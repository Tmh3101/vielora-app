<div align="center">
  <img src="public/images/logo-footer.png" alt="Vielora Logo" width="250"/>
  
  # Vielora - AI Chatbot Builder
  
  **Ứng dụng xây dựng chatbot AI thông minh cho website của bạn**
  
  [![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
  [![Google Gemini](https://img.shields.io/badge/Google-Gemini-orange)](https://ai.google.dev/)
  
</div>

---

Ứng dụng xây dựng chatbot AI cho phép người dùng tạo chatbot thông minh cho website của họ. Sử dụng RAG (Retrieval-Augmented Generation) để trả lời câu hỏi dựa trên nội dung website.

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) với App Router
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL + pgvector) — tích hợp qua `@supabase/ssr` để đảm bảo xác thực cookie an toàn trên Next.js App Router (server/client boundary)
- **Storage**: Supabase Storage (bot avatars)
- **Authentication**: Supabase Auth
- **Server State**: [TanStack Query (React Query)](https://tanstack.com/query) — quản lý toàn bộ server state (fetching, caching, invalidation)
- **Client State**: [Zustand](https://zustand-demo.pmnd.rs/) — quản lý transient global client state (ví dụ: trạng thái bước của Multi-step Onboarding Wizard)
- **AI/LLM**: [Google Gemini](https://ai.google.dev/) (Free Tier)
  - Chat: `gemini-2.5-flash-lite`
  - Embeddings: `gemini-embedding-001` (768 dimensions)
- **Web Scraping**: Self-hosted async crawler
  - Static pages: Cheerio + Turndown
  - Dynamic/SPA pages: Puppeteer (headless Chrome)
  - Queue: BullMQ + Redis for background processing
  - Concurrent crawling: Discover worker (`concurrency: 5`), Indexer worker (`concurrency: 2`)
- **Billing Cron**: Standalone BullMQ worker (`scripts/start-cron.ts`)
  - Daily subscription lifecycle: auto-downgrade expired subs, monthly credit reset
  - Completely separate process from the crawler worker
- **Fingerprinting**: [FingerprintJS](https://fingerprint.com/) (visitor identification)
- **Payment Gateways**: [PayOS](https://payos.vn/) (Vietnamese market)
- **Package Manager**: npm
- **Code Quality**: ESLint + Prettier + Husky + lint-staged

## Features

- 🤖 **AI Chatbot**: Chatbot thông minh sử dụng Google Gemini
- 📚 **RAG Pipeline**: Tìm kiếm ngữ nghĩa (semantic search) với vector embeddings
- 🔍 **Hybrid Search**: Kết hợp full-text search và semantic search
- 🌐 **Website Crawling**: Tự động crawl và index nội dung website (self-hosted, không cần API key)
- ⚡ **Async Processing**: Background job queue với BullMQ + Redis, real-time progress tracking
- 🔄 **Content Hash**: Phát hiện thay đổi nội dung, chỉ xử lý trang đã thay đổi
- 💬 **Embeddable Widget**: Widget chat có thể nhúng vào bất kỳ website nào
- 📊 **Dashboard**: Quản lý bot, xem analytics và conversations
- 💳 **Credits Billing**: Quản lý credit theo ví (`wallets`), lịch sử giao dịch và thanh toán
- 🎨 **Customizable**: Tùy chỉnh avatar, màu sắc, vị trí và tin nhắn chào mừng
- 📝 **Manual Knowledge**: Thêm nội dung text trực tiếp vào knowledge base mà không cần crawl
- ⏸️ **Bot Control**: Tắt/bật bot thủ công để tạm dừng phản hồi chat
- 🏦 **Vietnamese Payments**: Tích hợp PayOS cho thị trường Việt Nam
- 🔒 **Security**: Origin verification, Rate limiting, DDoS protection

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project (với pgvector extension)
- Google AI API key
- Redis (local) hoặc [Upstash Redis](https://upstash.com/) (recommended, free tier)

### Environment Setup

1. Copy file environment mẫu:

```bash
cp .env.example .env.local
```

2. Điền thông tin vào `.env.local`:

```env
# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Gemini AI (Free Tier)
# Lấy API key tại: https://aistudio.google.com/app/apikey
# Free Tier includes: 15 RPM for embedding, 15 RPM for chat
GOOGLE_API_KEY=your_google_api_key

# Model configurations (recommended defaults)
EMBEDDING_MODEL=gemini-embedding-001
CHAT_MODEL=gemini-2.5-flash-lite

# Redis Queue (Upstash recommended)
# Free tier: https://upstash.com/
UPSTASH_REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379

# Payment Gateways (optional — required only for billing features)
PAYOS_CLIENT_ID=your_payos_client_id
PAYOS_API_KEY=your_payos_api_key
PAYOS_CHECKSUM_KEY=your_payos_checksum_key
```

### Installation

```bash
# Cài đặt dependencies
npm install

# Chạy development server (Next.js + Worker + Cron cùng lúc)
npm run dev

# Hoặc chạy riêng từng service
npm run dev:next   # Terminal 1: Next.js only
npm run worker     # Terminal 2: Crawler worker only
npm run cron       # Terminal 3: Cron worker only
```

> **Note**: `npm run dev` sẽ tự động khởi động Next.js, Crawler worker, và Cron worker với `concurrently`.
>
> **Note**: Husky hooks được cài tự động qua script `prepare` sau khi chạy `npm install`.

Mở [http://localhost:3000](http://localhost:3000) trong trình duyệt.

### Build for Production

```bash
npm run build

# Chạy production (Next.js + Worker)
npm run start:all

# Hoặc chỉ Next.js
npm run start
```

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing page
│   ├── not-found.tsx       # 404 page
│   ├── providers.tsx       # Client-side providers (React Query, Theme)
│   ├── globals.css         # Global styles
│   ├── auth/               # Authentication pages
│   │   ├── page.tsx
│   │   ├── callback/       # Supabase OAuth callback
│   │   └── reset-password/
│   ├── dashboard/          # Dashboard pages
│   │   ├── page.tsx        # Bot list (main overview)
│   │   ├── bots/[botId]/   # Dynamic bot routes
│   │   │   └── page.tsx    # Bot detail page
│   │   ├── checkout/       # Checkout page
│   │   ├── payment/result/ # Payment result page
│   │   └── upgrade/        # Upgrade plan page
│   ├── onboarding/         # Multi-step Onboarding Wizard (state via Zustand)
│   │   └── page.tsx        # Wizard host page
│   └── api/                # API Routes
│       ├── bots/
│       │   ├── crawl-website/   # Discover/Selection/Status pipeline
│       │   │   ├── discover/
│       │   │   ├── selection/
│       │   │   └── status/
│       │   └── knowledge/       # Manual knowledge base CRUD
│       │       └── [pageId]/
│       ├── payment/        # Payment gateway routes
│       │   ├── payos-create/
│       │   ├── payos-return/
│       │   ├── payos-webhook/
│       │   ├── payos-cancel/
│       │   └── payos-cancel-order/
│       └── widget/
│           ├── init/       # Widget initialization
│           └── chat/       # Chat endpoint với RAG
├── components/             # React components
│   ├── ui/                 # shadcn/ui base components
│   ├── landing/            # Landing page sections
│   ├── bot/
│   │   └── DomainVerification.tsx
│   ├── bot-detail/         # Bot detail page components
│   │   ├── modals/         # Add/Edit/Delete knowledge modals, ReindexModal, etc.
│   │   └── tabs/           # OverviewTab, KnowledgeBaseTab, AppearanceTab, etc.
│   ├── dashboard/
│   │   ├── bots/
│   │   │   └── BotPlayground.tsx
│   │   ├── overview/       # Dashboard main page components
│   │   │   ├── BotsGrid.tsx
│   │   │   ├── DashboardClient.tsx
│   │   │   ├── StatsGrid.tsx
│   │   │   └── SubscriptionBanner.tsx
│   │   ├── shared/         # Shared dashboard layout components
│   │   │   ├── DashboardSidebar.tsx
│   │   │   ├── DashboardMobileHeader.tsx
│   │   │   ├── BotLimitDialog.tsx
│   │   │   └── BotSelectorDialog.tsx
│   │   └── upgrade/
│   │       └── UpgradeClient.tsx
│   ├── onboarding/         # Multi-step Onboarding Wizard UI
│   │   ├── OnboardingWizard.tsx
│   │   ├── steps/          # Step1CreateBot → Step2CuratePages → Step3Indexing → Step4Success
│   │   └── views/          # DiscoveringView, FailedPipelineView
│   ├── shared/
│   │   └── pricing/        # Reusable pricing components (PricingCard, PricingToggle, etc.)
│   ├── AvatarUpload.tsx
│   └── UpgradeModal.tsx
├── config/                 # App-wide configuration constants
│   ├── credit.ts           # Credit costs per operation
│   ├── knowledge.ts        # Manual knowledge limits
│   ├── pricing.ts          # Pricing plan definitions
│   ├── rag.ts              # RAG/chunking/retrieval parameters
│   ├── scraper.ts          # Scraper timeouts and browser args
│   └── storage.ts          # Storage bucket names
├── hooks/                  # Custom React hooks (organized by feature)
│   ├── dashboard/
│   │   ├── main/           # Main dashboard page hooks
│   │   │   ├── useBotSelectionAlert.ts
│   │   │   └── useDashboardData.ts
│   │   └── bot-detail/     # Bot detail page hooks
│   │       ├── useBotData.ts
│   │       ├── useBotSettings.ts
│   │       ├── useChatHistory.ts
│   │       └── useKnowledgeBase.ts
│   ├── onboarding/         # Onboarding wizard hooks
│   │   ├── useBotCreation.ts
│   │   ├── useDiscoverPipeline.ts
│   │   └── useIndexingPipeline.ts
│   ├── useAuth.ts
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── lib/                    # Utility functions and business logic
│   ├── utils.ts            # General utilities
│   ├── payos.ts            # PayOS client
│   ├── vnpay.ts            # VNPay client
│   ├── rag-processor.ts    # RAG pipeline (chunking, embedding)
│   ├── ai/
│   │   └── prompt.ts       # System prompt templates
│   ├── config/
│   │   └── redis.ts        # Redis/Upstash connection
│   ├── constants/          # App-wide constants
│   │   ├── api-rate-limit.ts
│   │   ├── cors-header.ts
│   │   ├── framework.ts
│   │   ├── job.ts          # Queue names, worker concurrency constants
│   │   └── rag.ts
│   ├── cron/
│   │   └── index.ts        # Cron job definitions
│   ├── helper/             # Route & business logic helpers
│   │   ├── auth.ts
│   │   ├── crawl-website-helpers.ts
│   │   └── get-embed-script.ts
│   ├── rag/                # RAG core modules
│   │   ├── generative.ts   # Gemini embedding & chat generation
│   │   └── retrieval.ts    # Hybrid search retrieval (RRF)
│   ├── scraper/            # Async web scraper with BullMQ
│   │   ├── index.ts        # Main exports
│   │   ├── core/
│   │   │   ├── queue.ts    # BullMQ queue setup (discover/indexer)
│   │   │   ├── worker.ts   # Job processors (concurrent discover + indexer workers)
│   │   │   └── link-processor.ts  # URL discovery
│   │   ├── extractors/
│   │   │   ├── static.ts   # Cheerio extractor
│   │   │   └── dynamic.ts  # Puppeteer extractor
│   │   └── utils/
│   │       └── user-agents.ts
│   ├── security/           # Security middleware
│   │   ├── index.ts        # Main exports
│   │   ├── widget-security.ts   # Origin verification & security validation
│   │   ├── rate-limiter.ts      # Message rate limiting (per visitor/IP)
│   │   └── api-rate-limiter.ts  # API rate limiting (DDoS protection)
│   ├── services/           # Business logic service layer (DI pattern)
│   │   ├── analytics.service.ts
│   │   ├── bot.service.ts
│   │   ├── conversations.service.ts
│   │   ├── credit.service.ts
│   │   ├── job.service.ts
│   │   ├── page.service.ts
│   │   ├── payment.service.ts
│   │   ├── plan.service.ts
│   │   ├── subscription-cron.service.ts
│   │   ├── subscription.service.ts
│   │   ├── wallet.service.ts
│   │   └── types.ts        # ServiceClient type alias
│   └── supabase/           # Supabase client setup (@supabase/ssr)
│       ├── client.ts       # Browser client (createBrowserClient)
│       ├── server.ts       # Server client (createServerClient) + Admin client
│       ├── types.ts        # Generated database types
│       └── upload.ts       # Storage upload utilities
├── store/                  # Zustand global client state
│   └── useOnboardingStore.ts  # Multi-step wizard state (step, botId)
├── scripts/                # Standalone worker scripts
│   ├── start-worker.ts     # Crawler worker entry point
│   └── start-cron.ts       # Cron worker entry point
├── supabase/               # Database schema & migrations
│   ├── db-schema.sql
│   ├── hybrid-search-function.sql
│   ├── init-storage.sql
│   └── migrations/
├── docs/                   # Extended documentation
│   └── DEPLOYMENT.md       # Full Docker deployment guide
├── types/                  # Global TypeScript types
│   ├── index.ts
│   ├── enums.ts
│   ├── bots-api.ts
│   ├── widget-api.ts
│   └── scrape.ts
└── public/                 # Static assets
    ├── widget.js           # Embeddable chat widget
    └── images/             # Logo and integration guide screenshots
```

## Architecture

### State Management Strategy

Dự án áp dụng phân tách rõ ràng giữa hai loại state:

| Layer            | Library                      | Scope               | Use Case                                |
| ---------------- | ---------------------------- | ------------------- | --------------------------------------- |
| **Server State** | TanStack Query (React Query) | Async, cached       | API data, database records, mutations   |
| **Client State** | Zustand                      | Synchronous, global | Transient UI state không gắn với server |

**Zustand** (`store/useOnboardingStore.ts`) được dùng chuyên biệt cho **Multi-step Onboarding Wizard**: lưu trữ `step` hiện tại và `botId` vừa tạo giữa các bước wizard, không cần round-trip server. React Query đảm nhiệm toàn bộ phần còn lại (dashboard data, bot settings, knowledge base, v.v.).

### Service Layer & Dependency Injection

Toàn bộ business logic được tổ chức trong `lib/services/`. Tất cả các hàm service đều nhận `client: ServiceClient` (alias của `SupabaseClient<Database>`) làm **tham số đầu tiên** — đây là pattern **Dependency Injection** giúp:

- **Server/Client boundary**: Route handlers và Server Components truyền vào `createServerClient()` (cookie-based, user-scoped); Background workers truyền vào `createAdminClient()` (service role key, bypasses RLS).
- **Ngăn state leak**: Mỗi request tạo client riêng — không có singleton shared giữa các request.
- **Admin bypass an toàn**: Webhooks và cron jobs dùng `createAdminClient()` để thao tác DB mà không cần session người dùng, không ảnh hưởng đến các service dùng chung.
- **Testability**: Dễ dàng inject mock client trong unit tests.

```typescript
// Pattern: client được inject từ bên ngoài
export async function getBotById(client: ServiceClient, botId: string) { ... }

// Route Handler (user-scoped)
const client = await createServerClient();
const bot = await getBotById(client, botId);

// Background Worker (admin, bypasses RLS)
const client = createAdminClient();
const bot = await getBotById(client, botId);
```

### Supabase Client Architecture (`@supabase/ssr`)

`lib/supabase/` cung cấp 3 loại client với phạm vi và quyền khác nhau:

| Factory                 | Env     | Auth Scope                              | Dùng khi                          |
| ----------------------- | ------- | --------------------------------------- | --------------------------------- |
| `createBrowserClient()` | Browser | Anon key + cookie                       | Client Components, React hooks    |
| `createServerClient()`  | Server  | Anon key + cookie (Next.js `cookies()`) | Server Components, Route Handlers |
| `createAdminClient()`   | Server  | Service Role key (bypasses RLS)         | Workers, webhooks, cron jobs      |

## API Routes

| Endpoint                                   | Method | Description                                                                |
| ------------------------------------------ | ------ | -------------------------------------------------------------------------- |
| `/api/bots/crawl-website/discover`         | POST   | Phase 1: enqueue discover job, set bot status `discovering`                |
| `/api/bots/crawl-website/selection`        | POST   | Phase 2: set selected pages `pending_index`, unselected `ignored`, enqueue |
| `/api/bots/crawl-website/status?botId=...` | GET    | Trạng thái pipeline theo bot + counts theo `pages.status`                  |
| `/api/bots/crawl-website`                  | POST   | Legacy endpoint (compatibility mode)                                       |
| `/api/bots/crawl-website/status?jobId=...` | GET    | Legacy session status (compatibility mode)                                 |
| `/api/widget/init`                         | POST   | Khởi tạo widget, load conversation cũ, kiểm tra quota credits              |
| `/api/widget/chat`                         | POST   | Xử lý chat với RAG (hybrid search + Gemini)                                |

## RAG Pipeline

```
Website URL → Self-hosted Scraper → Content Hash Check
                   │                       ↓
                   ├── sitemap.xml    Changed? → Chunking (1000 tokens)
                   └── Link discovery          ↓
                                      Gemini Embeddings (768D)
                                               ↓
                                      Supabase pgvector
                                               ↓
User Query → Query Embedding → Hybrid Search → Context
             (gemini-embedding-001)            ↓
                                      Gemini Chat → Response
                                      (gemini-2.5-flash-lite)
```

## Web Scraper

Dự án sử dụng **self-hosted async scraper** với BullMQ + Redis:

### Features

- 🔍 **URL Discovery**: Tự động tìm URLs qua sitemap.xml và link crawling
- ⚡ **Concurrent Crawling**: Discover worker xử lý song song (`concurrency: 5`); Indexer worker embed đồng thời (`concurrency: 2`) — tối đa throughput thay vì sequential
- 📄 **HTML to Markdown**: Chuyển đổi HTML sang Markdown sạch
- 🧹 **Smart Cleaning**: Tự động loại bỏ nav, footer, ads, scripts
- 🔗 **URL Resolution**: Chuyển relative URLs thành absolute
- 🎭 **Dual Extraction**: Static (Cheerio) + Dynamic (Puppeteer) modes
- 📊 **Progress Tracking**: Polling API với detailed status
- 🤖 **Custom User-Agent**: Identifies as `VieloraCrawler/2.0` to crawled sites
- 🚫 **Tracker Blocking**: Automatically blocks ads and analytics resources (Google Analytics, GTM, Facebook, DoubleClick) for faster crawls
- ⏱️ **Configurable Timeout**: 30s default scrape timeout per page; hard outer timeout (2×) guards against browser deadlocks
- 🛡️ **Soft 404 Detection**: HTTP 200 but content signals a "not found" page → skipped automatically

### Docker WebGL Support

Để crawl các Single Page Application phức tạp như **Mapbox** (dùng WebGL / Three.js), container Docker cài đặt các thư viện đồ họa cấp OS:

```
libegl1 + libgles2 + libxshmfence1 → Hardware/software OpenGL ES support
xvfb (X Virtual FrameBuffer)       → Virtual display, không cần màn hình vật lý
```

**Xvfb** cung cấp màn hình ảo (`DISPLAY=:99`) để Chromium khởi động bình thường. Kết hợp với **SwiftShader** (phần mềm GPU emulation của Chrome), Puppeteer có thể render WebGL bên trong container Linux headless mà không bị crash.

### Architecture

```
Frontend                            API                                  Worker (separate process)
   │                                 │                                            │
   │── POST /crawl-website/discover >│                                            │
   │<─ { discoverJobId, queued } ─── │── addDiscoverJob(discover-queue) ─────────>│
   │                                 │                                    [concurrency=5]
   │── GET /status?botId=... (poll) >│<── discover URLs + save raw_content/depth─ │
   │<─ { botStatus: discovered } ─── │                                            │
   │                                 │                                            │
   │── POST /crawl-website/selection>│── addIndexerJobs(indexer-queue) ────────>  │
   │<─ { queuedCount } ───────────── │                                    [concurrency=2]
   │                                 │                                            │
   │── GET /status?botId=... (poll) >│<── process pending_index -> completed/failed
   │<─ { botStatus: ready|failed } ─ │    (chunk + embed + store documents)       │
```

### Render Modes

| Mode      | Engine    | Use Case                            |
| --------- | --------- | ----------------------------------- |
| `static`  | Cheerio   | SSR/SSG sites, blogs, docs          |
| `dynamic` | Puppeteer | SPA, CSR, JS-heavy sites, WebGL     |
| `auto`    | Both      | Auto-detect (fallback to Puppeteer) |

## Deployment

> Xem hướng dẫn đầy đủ trong [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

### Multi-Profile Docker Architecture

`docker-compose.yml` định nghĩa **2 deployment topology** qua Docker Compose profiles:

| Profile    | Web                 | Redis                   | Worker          | Cron            | Mô tả                           |
| ---------- | ------------------- | ----------------------- | --------------- | --------------- | ------------------------------- |
| `hybrid`   | Vercel (serverless) | Server — exposed        | Server (Docker) | Server (Docker) | Web serverless + Workers on EC2 |
| `monolith` | Server (Docker)     | Server — localhost only | Server (Docker) | Server (Docker) | Toàn bộ chạy trên 1 server      |

### Deploy

```bash
chmod +x scripts/deploy.sh

# Interactive menu (chọn profile và env file)
./scripts/deploy.sh
```

## Widget Integration

Nhúng widget vào website — hỗ trợ React/HTML, Vue, PHP và WordPress.

**React / HTML** — dán trước thẻ `</body>`:

```html
<script
  src="https://your-app.example.com/widget.js"
  data-bot-id="YOUR_BOT_ID"
  data-base-url="https://your-app.example.com"
  id="vielora-script"
  defer
></script>
```

**Vue** — thêm động trong component chính, ví dụ `App.vue`:

```js
import { onMounted } from "vue";

onMounted(() => {
  const script = document.createElement("script");
  script.src = "https://your-app.example.com/widget.js";
  script.setAttribute("data-bot-id", "YOUR_BOT_ID");
  script.setAttribute("data-base-url", "https://your-app.example.com");
  script.id = "vielora-script";
  script.defer = true;
  document.body.appendChild(script);
});
```

**PHP** — thêm trước `</body>` trong file layout chính (ví dụ `footer.php`):

```php
<script
  src="https://your-app.example.com/widget.js"
  data-bot-id="<?php echo 'YOUR_BOT_ID'; ?>"
  data-base-url="https://your-app.example.com"
  id="vielora-script"
  defer
></script>
```

**WordPress** — thêm snippet PHP vào file `footer.php` của theme, hoặc dùng plugin **Code Snippets** / **Insert Headers and Footers** để dán đoạn mã PHP trên vào khu vực footer mà không cần chỉnh sửa trực tiếp theme. Xem hướng dẫn từng bước trong thư mục `public/images/guides/wordpress/`.

### Widget Features

- ✅ Markdown rendering (bold, links, lists)
- ✅ Conversation persistence (24h)
- ✅ Customizable appearance
- ✅ Mobile responsive
- ✅ Typing indicator
- ✅ Bot avatar display
- ✅ FingerprintJS visitor identification
- ✅ Rate limit handling with user feedback

## Security

### Vielora Security Sentinel

Hệ thống bảo mật đa lớp bảo vệ platform khỏi các cuộc tấn công và lạm dụng:

```
Request → API Rate Limit → Origin Verification → Visitor ID Check → Message Rate Limit → Process
           (DDoS)           (CORS)               (Identity)         (Quota)
```

### 1. Origin Verification (CORS)

Widget chỉ hoạt động trên domain đã đăng ký với bot:

| Check           | Mô tả                                              |
| --------------- | -------------------------------------------------- |
| **Exact Match** | `fashion-store.com` ✓                              |
| **Subdomain**   | `shop.fashion-store.com` cho `fashion-store.com` ✓ |
| **Mismatch**    | `fashion-store.vercel.app` ✗                       |
| **Localhost**   | Cho phép localhost trong development ✓             |
| **Mismatch**    | `hacker-site.net` cho `fashion-store.com` ✗ (403)  |

**Chống tấn công Referrer Spoofing:**

- Detect URLs trong query strings (Google search referrer attack)
- Normalize URLs: strip protocol, www, trailing slashes

### 2. API Rate Limiting (DDoS Protection)

In-memory sliding window counter:

| Endpoint    | Limit       | Window    |
| ----------- | ----------- | --------- |
| Widget Init | 30 requests | 1 phút/IP |
| Widget Chat | 20 requests | 1 phút/IP |
| Strict Mode | 5 requests  | 1 phút/IP |

### 3. Message Rate Limiting (Per Visitor)

Database-based tracking:

| Type        | Default Limit | Configurable |
| ----------- | ------------- | ------------ |
| Per Visitor | Unlimited     | ✓ (per bot)  |
| Per IP      | Unlimited     | ✓ (per bot)  |

### 4. Visitor Identification

- **FingerprintJS**: Định danh visitor chính xác (browser fingerprint)
- **Fallback UUID**: Nếu FingerprintJS bị chặn (AdBlock)
- **Validation**: Requests thiếu Visitor ID bị reject (403)

### Security Response Format

```json
{
  "success": false,
  "error": "CORS Policy: Origin hacker-site.net does not match registered domain fashion-store.com",
  "security": {
    "decision": "DENY",
    "risk_level": "HIGH"
  }
}
```

## Database Schema

### Main Tables

- `bots` - Thông tin chatbot (name, domain, avatar_url, status, settings, rate_limit_per_day, rate_limit_per_ip, last_crawl_at)
- `pages` - Trang crawl/index theo lifecycle (`pending`, `pending_index`, `processing`, `ignored`, `completed`, `failed`) + `raw_content`, `content_hash`, `depth`
- `documents` - Document chunks với vector embeddings
- `conversations` - Cuộc hội thoại
- `messages` - Tin nhắn trong conversation
- `usage_logs` - Log sử dụng (chat messages, IP tracking)
- `subscriptions` - Gói dịch vụ của user (`plan_id`, `billing_cycle`, `status`, `current_period_start`, `current_period_end`, `next_credit_reset_at`)
- `wallets` - Số dư credits (`subscription_credits`, `payg_credits`, `total_credits`, `is_payg_enabled`)
- `payments` - Lịch sử thanh toán (`payment_type`, `payment_status`, `plan_id`, provider, metadata)
- `credit_transactions` - Nhật ký cộng/trừ credits theo từng giao dịch (`payment_id` FK)
- `plans` - Gói dịch vụ (`code`, `bots_limit`, `monthly_credits`, `pricing` JSONB, `is_active`)
- `jobs` - Bảng theo dõi trạng thái BullMQ jobs trong DB (`progress`, `data`, `started_at`, `finished_at`)
- `profiles` - Thông tin hồ sơ người dùng (`full_name`, `avatar_url`)

### Billing Enums

- `pricing_plan`: `free`, `standard`, `pro`, `enterprise`
- `billing_cycle`: `monthly`, `yearly`, `none`
- `payment_status`: `pending`, `completed`, `failed`, `refunded`
- `payment_type`: `subscription`, `payg`
- `transaction_type`: `subscription_renewal`, `index_pages`, `index_pages_refund`, `chat_message`, `chat_message_refund`, `add_knowledge`, `add_knowledge_refund`, `update_knowledge`, `plan_downgrade`, `monthly_reset`
- `job_status`: `pending`, `active`, `completed`, `failed`

### Credit Costs

| Operation    | Credits | Notes                                               |
| ------------ | ------- | --------------------------------------------------- |
| Index a page | 5       | Deducted per page successfully chunked and embedded |
| Chat message | 1       | Deducted per message processed by the RAG pipeline  |

Credits are consumed from `subscription_credits` first, then from `payg_credits` (only if `is_payg_enabled = true` on the wallet). Failed operations automatically generate refund transactions (e.g., `chat_message_refund`, `index_pages_refund`). Deductions use optimistic locking with up to 3 retries to prevent race conditions under concurrent load.

### Auto Provisioning (Auth Trigger)

- Function: `public.handle_new_user_billing()`
- Trigger: `on_auth_user_created_billing` trên `auth.users`
- Khi user đăng ký mới:
  - Tạo `subscriptions` mặc định (gói Free, `current_period_start/end`, `next_credit_reset_at` tự động set)
  - Tạo `wallets` mặc định với `1000` subscription credits
  - Ghi bản ghi đầu tiên vào `credit_transactions`

### Subscription Lifecycle (Cron)

- Worker: `scripts/start-cron.ts` (`npm run cron`)
- Schedule: **00:00 UTC** mỗi ngày
- Scenario A: Sub hết hạn (`current_period_end <= now`) → downgrade về Free, reset credits
- Scenario B: Sub còn hạn nhưng đến ngày reset (`next_credit_reset_at <= now`) → cộng lại credits hàng tháng, advance `next_credit_reset_at` thêm 1 tháng

### Storage Buckets

- `bot-avatars` - Lưu trữ avatar của chatbot (public, max 2MB)

### Environment Variables for Production

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GOOGLE_API_KEY=...
UPSTASH_REDIS_URL=rediss://...
PAYOS_CLIENT_ID=...
PAYOS_API_KEY=...
PAYOS_CHECKSUM_KEY=...
```

## Scripts

| Command                | Description                                           |
| ---------------------- | ----------------------------------------------------- |
| `npm run dev`          | Development (Next.js + Worker + Cron)                 |
| `npm run dev:next`     | Development (Next.js only)                            |
| `npm run dev:worker`   | Development (Worker watch mode)                       |
| `npm run build`        | Build for production                                  |
| `npm run start`        | Production (Next.js only)                             |
| `npm run start:all`    | Production (Next.js + Worker + Cron)                  |
| `npm run worker`       | Run crawler worker only                               |
| `npm run cron`         | Run cron worker (subscription lifecycle)              |
| `npm run worker:build` | Build worker script to `dist/scripts`                 |
| `npm run lint`         | Run ESLint                                            |
| `npm run format`       | Format all files with Prettier                        |
| `npm run check-format` | Check formatting with Prettier (no write)             |
| `npm run prepare`      | Initialize Husky hooks (auto-run after `npm install`) |
| `npm run test`         | Run tests (vitest)                                    |
| `npm run test:watch`   | Run tests in watch mode                               |

## Code Quality & Git Hooks

### ESLint + Prettier

- ESLint config: `next/core-web-vitals` + `prettier`
- TypeScript unused vars: warning (`@typescript-eslint/no-unused-vars`)
- Prettier plugin: `prettier-plugin-tailwindcss` (auto-sort Tailwind classes)
- Ignore paths for lint/format: `.next/`, `node_modules/`, `dist/`, `public/`

### Husky + lint-staged (pre-commit)

- Hook file: `.husky/pre-commit`
- Pre-commit command: `npx lint-staged`
- Staged `*.{js,jsx,ts,tsx}`: `prettier --write` + `eslint --fix`
- Staged `*.{json,md,css,scss}`: `prettier --write`

Commit sẽ bị chặn nếu còn lỗi lint/format không thể tự sửa.

## License

MIT
