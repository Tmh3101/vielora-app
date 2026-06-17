# STAGE 1: BASE (Thiết lập OS & Puppeteer)
# Sử dụng bản slim để giảm dung lượng, nhưng vẫn đủ thư viện nền tảng (Debian)
FROM node:20-bullseye-slim AS base

# Cài đặt Chromium và các thư viện cần thiết cho Puppeteer (Bắt buộc cho dynamic.ts)
RUN apt-get update && apt-get install -y \
    chromium \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    libegl1 \
    libgles2 \
    libxshmfence1 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Báo cho Puppeteer biết hãy dùng Chromium của hệ điều hành, đừng tải mới!
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# STAGE 2: DEPENDENCIES (Cài đặt thư viện)
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Cài đặt toàn bộ thư viện (bao gồm cả devDependencies để build)
RUN npm ci

# STAGE 3: BUILDER (Biên dịch mã nguồn)
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Các biến NEXT_PUBLIC_* được Next.js nhúng thẳng vào JS bundle lúc build,
# nên phải truyền vào qua ARG — không thể dùng environment: của docker-compose.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_DEMO_BOT_ID
ARG NEXT_PUBLIC_SHOPIFY_CLIENT_ID
ARG SHOPIFY_CLIENT_SECRET
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_DEMO_BOT_ID=$NEXT_PUBLIC_DEMO_BOT_ID
ENV NEXT_PUBLIC_SHOPIFY_CLIENT_ID=$NEXT_PUBLIC_SHOPIFY_CLIENT_ID
ENV SHOPIFY_CLIENT_SECRET=$SHOPIFY_CLIENT_SECRET
ARG SHOPIFY_SESSION_STORAGE=memory
ENV SHOPIFY_SESSION_STORAGE=$SHOPIFY_SESSION_STORAGE

# Build dự án Next.js
# (Lưu ý: Nếu worker của bạn cần build riêng bằng tsc, hãy thêm lệnh build worker ở đây)
RUN npm run build

# STAGE 4: RUNNER (Môi trường Chạy Thực tế)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Tạo user không có quyền root để bảo mật (Security Best Practice)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy artifacts from Builder into the lean Runner image
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Source directories required by tsx at runtime (worker & cron use tsx, not tsc)
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/config ./config
COPY --from=builder /app/types ./types

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Lệnh mặc định khi container chạy sẽ là bật Web Server Next.js
# Lệnh này sẽ được ghi đè (override) trong file docker-compose.yml đối với container Worker
CMD ["npm", "run", "start"]