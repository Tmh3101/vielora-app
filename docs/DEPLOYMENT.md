# Vielora — Deployment Guide

> Docker-first. Zero PM2. Zero host-level Node.js.

---

## Architecture

| Component   | Monolith (`--profile monolith`) | Hybrid (`--profile hybrid`)  |
| ----------- | ------------------------------- | ---------------------------- |
| **Web**     | Server (Docker)                 | Serverless (Vercel)          |
| **Redis**   | Server — localhost only         | Server — exposed to internet |
| **Worker**  | Server (Docker)                 | Server (Docker)              |
| **Cron**    | Server (Docker)                 | Server (Docker)              |
| **DB**      | Supabase                        | Supabase                     |
| **Storage** | Supabase                        | Supabase                     |

---

## Prerequisites

Only **Docker** + **Docker Compose** required. No Node.js on host.

```bash
# Amazon Linux 2023
sudo dnf update -y && sudo dnf install -y docker git
sudo systemctl enable docker --now
sudo usermod -aG docker $USER

# Detect architecture
ARCH=$(uname -m)
case $ARCH in x86_64) ARCH=amd64 ;; aarch64) ARCH=arm64 ;; esac

# Docker Compose plugin
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${ARCH}" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Docker Buildx plugin (required for multi-stage builds)
sudo curl -SL "https://github.com/docker/buildx/releases/download/v0.21.1/buildx-v0.21.1.linux-${ARCH}" \
  -o /usr/local/lib/docker/cli-plugins/docker-buildx
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-buildx
```

Re-login, then verify:

```bash
docker --version && docker compose version && docker buildx version
```

---

## 1 — Configure `.env`

```bash
git clone <your-repo-url> vielora && cd vielora
cp .env.example .env && nano .env
```

```env
REDIS_PASSWORD=<STRONG_RANDOM_PASSWORD_32+_CHARS>
REDIS_IP=127.0.0.1
REDIS_PORT=6379

NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
GOOGLE_API_KEY=AIza...
NEXT_PUBLIC_APP_URL=https://your-domain.com
EMBEDDING_MODEL=gemini-embedding-001
CHAT_MODEL=gemini-2.5-flash-lite
```

---

## 2 — Deploy (Monolith - Full Project)

```bash
chmod +x scripts/deploy.sh

./scripts/deploy.sh                             # Interactive menu
./scripts/deploy.sh monolith                    # One-liner (uses .env)
./scripts/deploy.sh monolith .env.production    # With production env
```

`deploy.sh` handles: pre-flight checks → teardown other profile → build & start → prune images.

Starts 4 containers: `vielora-redis`, `vielora-worker`, `vielora-cron`, `vielora-web`. Put Nginx + Certbot in front of `127.0.0.1:3000`.

### Verify

```bash
docker compose --profile monolith ps
docker logs -f vielora-worker
docker logs -f vielora-web
docker exec vielora-redis redis-cli -a "$REDIS_PASSWORD" ping
```

### Common Operations

```bash
./scripts/deploy.sh monolith                        # Redeploy (git pull + rebuild)
docker compose --profile monolith restart worker    # Restart one service
docker compose --profile monolith logs -f           # All logs
docker compose --profile monolith down              # Stop all
docker compose --profile monolith down -v           # Stop + delete volumes ⚠️
```

---

## 3 — Hybrid (Web Serverless + Workers)

### 3.1 - Web Serverless (Vercel)

1. Import repo on [vercel.com](https://vercel.com/) → Framework: **Next.js**.
2. Set environment variables:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
GOOGLE_API_KEY=AIza...
EMBEDDING_MODEL=gemini-embedding-001
CHAT_MODEL=gemini-2.5-flash-lite
REDIS_URL=redis://:<REDIS_PASSWORD>@<EC2_PUBLIC_IP>:50379
```

3. **Deploy** → trigger a crawl → check `docker logs -f vielora-worker` on Server.

### 3.2 - Workers

Update `.env`:

```env
REDIS_IP=0.0.0.0
REDIS_PORT=50379
```

Deploy:

```bash
./scripts/deploy.sh hybrid
```

Starts 3 containers: `vielora-redis`, `vielora-worker`, `vielora-cron`. No `vielora-web` — Vercel handles the frontend.

> Security Group: allow inbound TCP `50379` from Vercel IP ranges.

---

## 4 — Split (Web on Server A + Workers/Cron on Server B)

This topology runs:

- **Server A (Web)**: `vielora-web` only
- **Server B (Workers)**: `vielora-redis`, `vielora-worker`, `vielora-cron`

### 4.1 - Server B (Redis + Worker + Cron)

1. Configure `.env` on **Server B**:

```env
# Redis (must be reachable from Server A)
REDIS_PASSWORD=<STRONG_RANDOM_PASSWORD_32+_CHARS>
REDIS_IP=0.0.0.0
REDIS_PORT=50379

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# AI
GOOGLE_API_KEY=AIza...
EMBEDDING_MODEL=gemini-embedding-001
CHAT_MODEL=gemini-2.5-flash-lite

# Public URL of Server A (used by build/runtime where needed)
NEXT_PUBLIC_APP_URL=https://your-web-domain.com
```

2. Deploy workers on **Server B**:

```bash
./scripts/deploy.sh hybrid
```

3. Security Group / Firewall (Server B):

- Allow inbound TCP `50379` **only from Server A public IP** (or your private VPC CIDR).

### 4.2 - Server A (Web only)

1. Configure `.env` on **Server A**:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-web-domain.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# AI
GOOGLE_API_KEY=AIza...
EMBEDDING_MODEL=gemini-embedding-001
CHAT_MODEL=gemini-2.5-flash-lite

# Point Web to Redis on Server B
REDIS_PASSWORD=<SAME_PASSWORD_AS_SERVER_B>
REDIS_URL=redis://:<REDIS_PASSWORD>@<SERVER_B_PUBLIC_IP>:50379
```

2. Deploy web on **Server A**:

```bash
./scripts/deploy.sh web
```

3. Put Nginx + TLS (Certbot) in front of `127.0.0.1:3000` on Server A (same as monolith).

### Verify

On **Server B**:

```bash
docker logs -f vielora-worker
docker logs -f vielora-cron
docker exec vielora-redis redis-cli -a "$REDIS_PASSWORD" ping
```

On **Server A**:

```bash
docker logs -f vielora-web
```

---

## Notes

- `vielora-worker` (crawler) and `vielora-cron` (subscriptions) are independent. Docker `restart: unless-stopped` auto-recovers them.
- Cron runs at `00:00 UTC` daily. Change in `lib/cron/index.ts`.
- Redis AOF enabled — data survives restarts. Only `down -v` destroys it.
