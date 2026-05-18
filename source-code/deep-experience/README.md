# DeepExperience

訪日観光客向け即時ツアー予約サービス（Uberのツアー版）。
地図上で現在地周辺のツアーを探し、その場で予約できるモバイルアプリ + Web。

## Architecture

```
deep-experience/
├── apps/
│   ├── backend/     # Next.js App Router (API server)
│   └── mobile/      # React Native (Expo) — mobile & web
├── packages/
│   ├── shared-types/ # Shared TypeScript types
│   ├── api-client/   # API client library
│   └── i18n/         # Internationalization
└── docs/             # Design documents
```

**Monorepo**: pnpm workspaces + Turborepo

## Services

| Service | Port | Description |
|---------|------|-------------|
| **Backend** (Next.js) | 8001 | REST API + Guest web (Web is served by backend, no separate process) |
| **Mobile** (Expo Dev Server) | 8081 | Expo dev server for native (Expo Go) |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL 14+（ローカルにインストール済み。Postgres.app / Homebrew / Docker いずれでも可）

### Install

```bash
pnpm install
```

### Database Setup

```bash
# DB 作成（初回のみ）
createdb deep_experience_dev

# .env 作成
cp apps/backend/.env.example apps/backend/.env
# エディタで DATABASE_URL / DIRECT_URL をローカル PG 接続に書き換え
# 例: postgresql://<username>@localhost:5432/deep_experience_dev

# マイグレーション適用 + シード投入
pnpm --filter backend prisma:deploy
pnpm --filter backend prisma:seed
```

### Start Services

Use `service.sh` to manage all services:

```bash
# Start / stop / restart all services
./service.sh start
./service.sh stop
./service.sh restart

# Target a specific service: backend or mobile
./service.sh start backend
./service.sh stop backend
./service.sh restart mobile

# Check running status
./service.sh status

# Tail logs
./service.sh logs            # All services
./service.sh logs backend    # Backend only
```

Or start individually with pnpm:

```bash
pnpm dev:backend    # Backend on port 8001
pnpm dev:mobile     # Expo dev server on port 8081
```

### Open Prisma Studio

```bash
pnpm --filter backend prisma:studio
```

## Tech Stack

- **Backend**: Next.js (App Router), Prisma, PostgreSQL（ローカル / 本番ともに Postgres）
- **Mobile/Web**: React Native (Expo managed workflow)
- **Storage**: ローカルは filesystem (`public/uploads/`)、本番は Supabase Storage
- **Hosting**: Vercel + Supabase（顧客有料契約）
- **Auth**: JWT (Guide/Admin), Guest session (Traveler)
- **Language**: TypeScript across all layers

## Deployment

本番環境（Vercel + Supabase）への初回デプロイは **[docs/deployment.md](docs/deployment.md)** に Claude Code でも実行できる粒度で全手順をまとめている。

## Phase 0 Constraints

- No payment integration
- No auto-matching (admin assigns guides manually)
- English UI only
