# Deployment Guide — Vercel + Supabase

本書は **顧客側エンジニアが本リポジトリを Git で受け取り、Vercel + Supabase 環境に初回デプロイする** ための手順書である。

## 対象読者と読み方

- **人間のエンジニア**: 上から順に実行。各 Phase の最後にチェックリストがあるので消し込みながら進める
- **Claude Code 等の AI agent**: 各セクションは「目的 → コマンド → 期待出力 → 失敗時の対処」の構造になっている。コマンドは copy-paste 可能。判断が必要な箇所は **【判断ポイント】** タグ付き

## アーキテクチャ全体像

```
┌──────────┐  HTTPS   ┌─────────────────────────┐
│ Mobile   │─────────►│ Vercel (apps/backend)   │
│ (Expo)   │          │  - Next.js App Router   │
└──────────┘          │  - Vercel Cron (30 min) │
                      └────────┬────────────────┘
                               │ Postgres / Storage SDK
                               ▼
                      ┌─────────────────────────┐
                      │ Supabase                │
                      │  - Postgres (Pooler)    │
                      │  - Storage Bucket       │
                      └─────────────────────────┘
```

---

## 0. 前提条件

### 0-1. アカウント / 権限

- **Vercel** Pro 以上のプラン契約済みのチームまたは個人アカウント
- **Supabase** Pro 以上のプラン契約済みの Organization
- **GitHub**（または同等のリポジトリホスト）への push 権限
- ローカル: Node.js 20.x 以上、pnpm 10.x 以上、PostgreSQL クライアント (`psql`) インストール済み

### 0-2. 動作確認用ローカル環境（推奨）

本番デプロイ前にローカルで動作確認すると、設定漏れを早期に検出できる。本書 §1 で実施。

### 0-3. ハマりがちなポイント（先に読んでおく）

| 罠 | 対処 |
|----|------|
| Vercel Build で `prisma generate` が走らない | `apps/backend/package.json` の `postinstall` に既に組み込み済み。**消さない** |
| PgBouncer 経由で prepared statement エラー | `DATABASE_URL` に `?pgbouncer=true&connection_limit=1` 付与必須（理由: Pooler の transaction mode は prepared statement と非互換） |
| `prisma migrate` が失敗する | `DIRECT_URL`（5432 ポートの直接接続）が必要。Pooler の 6543 ポートでは migrate 不可 |
| Vercel Cron が 401 を返す | `CRON_SECRET` が未設定 / 値違い。Vercel Cron は `Authorization: Bearer <CRON_SECRET>` を自動付与する |
| 画像アップロード後に画像が消える | `STORAGE_PROVIDER=local` のままになっている。Vercel filesystem は ephemeral。`supabase` に切替必須 |
| マイグレーション衝突 | 本リポジトリの初期構築は `20260425000000_init` 1 本のみ。これ以前の DB 状態に対しては baseline 設定が必要（§9 参照） |

---

## 1. ローカル動作確認（推奨。30 分程度）

### 1-1. リポジトリ取得と依存インストール

```bash
git clone <repo-url> deep-experience
cd deep-experience
pnpm install
```

**期待出力**: 最終行に `Done` または `+XX` 表示。エラーで止まらないこと。

**失敗時**: pnpm のバージョンを確認 (`pnpm --version`)。10.x 未満なら `npm i -g pnpm@10` でアップグレード。

### 1-2. ローカル PostgreSQL 起動と DB 作成

```bash
# PostgreSQL が起動しているか確認
pg_isready
# → "/tmp:5432 - accepting connections" 等が出れば OK

# DB 作成
createdb deep_experience_dev
```

**【判断ポイント】** ローカル PG ユーザー名がデフォルトの自分のログイン名でない場合は `createdb -U <username> deep_experience_dev`。

### 1-3. ローカル `.env` を作成

```bash
cp apps/backend/.env.example apps/backend/.env
```

エディタで `apps/backend/.env` を開き、以下を設定（**ローカルの場合 Pooler 不要、両方同じ URL でOK**）:

```env
DATABASE_URL="postgresql://<username>@localhost:5432/deep_experience_dev"
DIRECT_URL="postgresql://<username>@localhost:5432/deep_experience_dev"
JWT_SECRET="dev-secret-do-not-commit"
STORAGE_PROVIDER="local"
```

`<username>` は `whoami` で取得した値、または PostgreSQL を `postgres` ユーザーで運用しているなら `postgres`。

### 1-4. マイグレーション + シード

```bash
pnpm --filter backend prisma:deploy
pnpm --filter backend prisma:seed
```

**期待出力**:
- `prisma:deploy` 末尾に `All migrations have been successfully applied.`
- `prisma:seed` 末尾に `Seeding complete!`

**失敗時**:
- `Error: P1001: Can't reach database server` → PG が起動してない、または接続文字列の `<username>` 違い
- `Error: P3009: migrate found failed migrations` → DB を一度 drop して再作成 (`dropdb deep_experience_dev && createdb deep_experience_dev`)

### 1-5. テスト実行

```bash
pnpm --filter backend test
```

**期待出力**: `Tests  147 passed (147)` (件数は前後する可能性あり)

### 1-6. ローカル起動とスモーク

```bash
./service.sh start backend
```

別ターミナルで:

```bash
# ヘルスチェック相当
curl -s http://localhost:8001/api/v1/tours/cmnpol94h0003qrfcdx64vcw9/schedules?dateFrom=2026-01-01\&dateTo=2027-12-31 | head -c 500
```

**期待出力**: JSON が返ること。`{"schedules":[...]}` の構造。

**失敗時**:
- 接続拒否 → backend が起動してない。`./service.sh status` で確認
- 404 → seed が走っていない。`pnpm --filter backend prisma:seed` 再実行

完了したら `./service.sh stop backend`。

### Phase 1 完了チェックリスト

- [ ] `pnpm install` 成功
- [ ] `pnpm prisma:deploy` 成功
- [ ] `pnpm prisma:seed` 成功
- [ ] `pnpm test` で 147 件パス
- [ ] curl で /schedules が JSON 返却

---

## 2. Supabase セットアップ

### 2-1. プロジェクト作成

1. https://supabase.com/dashboard → New Project
2. Region は **アジア圏推奨**（東京なら `Northeast Asia (Tokyo)` = `ap-northeast-1`）
3. パスワードを強固に設定し、控える（後で `DATABASE_URL` に使用）
4. プロジェクト作成後、Settings → Database で **Connection Pooler** が有効か確認（デフォルトで有効）

### 2-2. 接続文字列の取得

Settings → Database → Connection string で 2 種類控える:

**Pooler URL（runtime 用）**:
```
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
```
末尾に `?pgbouncer=true&connection_limit=1` を付与する（手動）。

**Direct URL（migrate 用）**:
```
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```
こちらにはオプション付与不要。

> **【判断ポイント】** `<project-ref>` と `<region>` は Supabase Dashboard の Settings → API および Settings → Database から取得。

### 2-3. Storage Bucket 作成

1. Supabase Dashboard → Storage → New bucket
2. Name: `tour-media`
3. **Public bucket** にチェック（Phase 0 は画像を直接 URL 配信する想定）
4. Save

### 2-4. Service Role Key の取得

Settings → API:
- **Project URL** → `SUPABASE_URL` に投入する値
- **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` に投入する値（**絶対に公開リポジトリへ commit しない**）

### Phase 2 完了チェックリスト

- [ ] Supabase プロジェクト作成済み
- [ ] Pooler URL 控え済み（`?pgbouncer=true&connection_limit=1` 付き）
- [ ] Direct URL 控え済み
- [ ] Storage Bucket `tour-media` 作成済み・Public 設定済み
- [ ] Project URL 控え済み
- [ ] service_role secret 控え済み

---

## 3. Vercel デプロイ

### 3-1. プロジェクトインポート

1. https://vercel.com/new
2. 本リポジトリを選択
3. **Configure Project**:
   - Framework Preset: **Next.js**
   - **Root Directory**: `apps/backend` （**最重要**。ここを忘れると monorepo の他パッケージが認識されない）
   - Build & Output Settings: デフォルトのまま（`vercel.json` で上書き済み）
   - Install Command: 自動検出された `pnpm install`（変更不要）
4. 環境変数は次の §3-2 で設定するので、ここでは **デプロイせず** に Environment Variables 画面へ進む

### 3-2. 環境変数投入

Vercel Project Settings → Environment Variables で以下を全て設定。**Production / Preview / Development の 3 環境すべてに同じ値**を投入する。

| Key | Value | 必須 |
|-----|-------|------|
| `DATABASE_URL` | Pooler URL (`?pgbouncer=true&connection_limit=1` 付) | ✅ |
| `DIRECT_URL` | Direct URL | ✅ |
| `JWT_SECRET` | `openssl rand -base64 32` で生成した値 | ✅ |
| `STORAGE_PROVIDER` | `supabase` | ✅ |
| `SUPABASE_URL` | Supabase Project URL | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role secret | ✅ |
| `SUPABASE_STORAGE_BUCKET` | `tour-media` | ✅ |
| `CRON_SECRET` | `openssl rand -base64 32` で生成した別の値 | ✅ |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API Key | 任意 |
| `NEXT_PUBLIC_SITE_URL` | 公開予定の URL（例 `https://deep-experience.vercel.app`） | 任意 |
| `FINALIZE_GUARD_ENABLED` | `true` または未設定 | 任意（緊急時のみ `false` で停止） |

> **【判断ポイント】** `JWT_SECRET` と `CRON_SECRET` は **別々の値** を生成すること。同じ値を流用しない。

### 3-3. 初回デプロイ

Deploy ボタンを押す。Build ログで以下を順に確認:

1. `Installing dependencies...` → 成功
2. `> postinstall` → `prisma generate` 実行（`Generated Prisma Client` が出る）
3. `> backend@0.1.0 build` → `pnpm prisma:deploy` 実行
4. `Applying migration 20260425000000_init` → 成功
5. `next build` → 成功

**期待結果**: `Deployment Ready` のグリーンマーク。

**失敗時の典型対処**:

| エラー | 原因 | 対処 |
|--------|------|------|
| `Can't reach database server` (Build 時) | DIRECT_URL が間違っている / Supabase Network Restrictions が有効 | URL を再確認。Network Restrictions は Supabase Settings → Database → Network Restrictions で `0.0.0.0/0` を許可（Vercel の IP は固定でないため） |
| `prepared statement "sX" does not exist` (runtime) | DATABASE_URL に `?pgbouncer=true` がない | URL に追加して redeploy |
| `Cannot find module '@prisma/client'` | postinstall が走っていない | `apps/backend/package.json` の `postinstall: prisma generate` が残っているか確認 |
| `EACCES` / 書き込みエラー | `STORAGE_PROVIDER=local` のまま画像アップロード API が呼ばれた | `supabase` に変更して redeploy |

### 3-4. デプロイ後の DB 確認

ローカルから本番 DB に接続して、テーブルが作成されているか確認:

```bash
psql "<DIRECT_URL>" -c "\dt"
```

**期待出力**: `Tour`, `Booking`, `_prisma_migrations` 等 20 テーブル。

### Phase 3 完了チェックリスト

- [ ] Vercel プロジェクト作成・Root Directory `apps/backend` 設定済み
- [ ] 環境変数 9 個すべて投入済み（Production/Preview/Development）
- [ ] 初回 Deploy 成功
- [ ] `\dt` で 20 テーブル確認
- [ ] `_prisma_migrations` に `20260425000000_init` が存在

---

## 4. 初回シード投入

### 4-1. ダミーデータ投入

ローカルから **Direct URL を使って** seed スクリプトを実行:

```bash
DATABASE_URL="<DIRECT_URL>" DIRECT_URL="<DIRECT_URL>" pnpm --filter backend prisma:seed
```

> **重要**: Pooler URL ではなく **Direct URL** を使う。seed は長時間トランザクションを張るため、PgBouncer transaction mode と非互換。

**期待出力**: `Seeding complete!`

### 4-2. データ投入の確認

```bash
psql "<DIRECT_URL>" -c "SELECT COUNT(*) FROM \"Tour\";"
```

**期待出力**: 20 件（または運用想定値）。

### Phase 4 完了チェックリスト

- [ ] `prisma:seed` 成功
- [ ] Tour テーブルにレコード存在

---

## 5. スモークテスト（E2E 動作確認）

Vercel デプロイ URL を `<APP_URL>` とする（例: `https://deep-experience.vercel.app`）。

### 5-1. API 疎通確認

```bash
# tours 取得（Tour ID は seed 済みのもの）
TOUR_ID=$(psql "<DIRECT_URL>" -t -c "SELECT id FROM \"Tour\" LIMIT 1;" | xargs)
echo "Tour ID: $TOUR_ID"

curl -s "<APP_URL>/api/v1/tours/$TOUR_ID/schedules?dateFrom=2026-01-01&dateTo=2027-12-31" | head -c 500
```

**期待**: `schedules` 配列を含む JSON。

### 5-2. 管理画面ログイン

ブラウザで `<APP_URL>/admin/login` にアクセス:
- Email: `admin@deepexperience.jp`（seed のデフォルト）
- Password: `admin123`（seed のデフォルト）

**【判断ポイント】**: 本番運用前に admin の **メールとパスワードを変更**（管理画面 → Administrators → Edit）。

### 5-3. 画像アップロード確認

管理画面 → Media → Upload で画像 1 枚アップロード。

**期待**:
- アップロード後、画像 URL が `https://<project-ref>.supabase.co/storage/v1/object/public/tour-media/originals/...` の形式
- 画像が画面に表示される

**失敗時**:
- 500 エラー → Vercel Function Logs で `STORAGE_PROVIDER=local` になっていないか確認
- URL は出るが 404 → Storage bucket が Public 設定されていない

### 5-4. Cron 動作確認

Vercel Dashboard → Project → Cron で `/api/v1/admin/jobs/finalize-bookings` の最終実行ログを確認。`*/30 * * * *` の頻度で動作する想定。

または手動で叩いて確認:

```bash
curl -X POST "<APP_URL>/api/v1/admin/jobs/finalize-bookings" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

**期待出力**: `{"logId":"...","status":"SUCCESS","durationMs":...,"processedCount":...,"warnCount":...}`

### Phase 5 完了チェックリスト

- [ ] `/api/v1/tours/:id/schedules` が JSON 返却
- [ ] `/admin/login` でログイン可
- [ ] 画像アップロード成功・URL が Supabase Storage
- [ ] Cron 手動起動で 200 OK

---

## 6. Mobile アプリの接続先切替

### 6-1. ローカル開発（Expo Go）

`apps/mobile/.env` を新規作成:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

エディタで開いて設定:

```env
EXPO_PUBLIC_API_BASE_URL="<APP_URL>/api/v1"
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY="<google-maps-key>"
```

`./service.sh start mobile` で起動し、Expo Go で QR コードを読み込めば本番 API に接続。

### 6-2. EAS Build（ネイティブビルド）

EAS CLI を使う場合は環境変数を **EAS Secrets** で管理:

```bash
cd apps/mobile
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value "<APP_URL>/api/v1"
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value "<google-maps-key>"
```

その後 `eas build --platform ios` または `eas build --platform android`。

### Phase 6 完了チェックリスト

- [ ] `apps/mobile/.env` に Vercel URL 設定
- [ ] Expo Go で本番 API 経由でツアー一覧表示

---

## 7. デプロイ後の運用

### 7-1. マイグレーション追加時のフロー

1. ローカルで `apps/backend/prisma/schema.prisma` を編集
2. ローカル DB に対して `pnpm --filter backend exec prisma migrate dev --name <変更内容>` で新マイグレーション生成
3. `apps/backend/prisma/migrations/` 配下に新規ディレクトリができることを確認
4. PR → main マージ
5. Vercel が自動でデプロイ → Build 中に `pnpm prisma:deploy` で本番 DB にも適用

### 7-2. シードデータの再投入禁止

`prisma:seed` は本番に対して通常 1 度だけ実行。**再実行すると `upsert` ロジックでデータが上書きされる可能性**があるので、運用後は控える。

### 7-3. JobExecutionLog の監視

```sql
-- 直近 24h で FAILED があるか
SELECT * FROM "JobExecutionLog"
WHERE "status" = 'FAILED' AND "startedAt" > NOW() - INTERVAL '24 hours'
ORDER BY "startedAt" DESC;
```

FAILED があれば `errorMessage` を確認し、必要に応じて手動再実行。

### 7-4. `freeCancellationDeadlineHours = null` の警告対応

FINALIZE バッチは `freeCancellationDeadlineHours=null` の Tour に紐づく予約を `warnBookingIds` に記録する。`JobExecutionLog.payload` を確認し、設定漏れの Tour に対して管理画面で値を入れる。

---

## 8. トラブルシューティング

### 症状: Vercel Build で `Error: P3009: migrate found failed migrations`

**原因**: 過去のデプロイで途中失敗した migration が残っている。

**対処**:
```bash
psql "<DIRECT_URL>" -c "DELETE FROM \"_prisma_migrations\" WHERE \"finished_at\" IS NULL;"
```
その後 redeploy。

### 症状: API レスポンスが断続的に 500 エラー

**原因 1**: 接続プール枯渇。Pooler に `?pgbouncer=true&connection_limit=1` が無い。

**対処**: `DATABASE_URL` を確認・修正して redeploy。

**原因 2**: Supabase 側の DB 接続上限超過。

**対処**: Supabase Dashboard → Database → Database Health で接続数を確認。Pro プランなら `direct connections` 60、`pooler connections` 200。

### 症状: 画像が `https://localhost/uploads/...` の URL で返る

**原因**: `STORAGE_PROVIDER=local` のまま。

**対処**: Vercel 環境変数で `STORAGE_PROVIDER=supabase` に変更し redeploy。既にアップロード済みの画像 URL は手動で書き換えるか、再アップロードする。

### 症状: Cron が 401 Unauthorized を返す

**原因**: `CRON_SECRET` 未設定 or 値違い。

**対処**: Vercel 環境変数を確認。値を変更したら **必ず redeploy**（環境変数変更だけではランタイムに反映されない）。

### 症状: マイグレーションが `relation "X" already exists`

**原因**: 既存 DB に対して init マイグレーションを流そうとしている。

**対処**: §9 の baseline 設定を行う。

---

## 9. 既存 Postgres 環境への baseline 適用（特殊ケース）

本リポジトリの初期構築は `20260425000000_init` 1 本のみ。もし既に同等のスキーマを持つ Postgres DB に対して接続する場合（移行案件など）は、以下の手順で baseline 化:

```bash
# 1. 既存 DB のスキーマと schema.prisma が一致していることを diff で確認
pnpm --filter backend exec prisma db pull --print > /tmp/current-schema.prisma
diff apps/backend/prisma/schema.prisma /tmp/current-schema.prisma

# 2. 一致していれば、init マイグレーションを「適用済み」としてマーク
pnpm --filter backend exec prisma migrate resolve --applied 20260425000000_init
```

> **【判断ポイント】** スキーマが一致しない場合は手動で差分を埋めるか、データを移行してから `init` をクリーンに流す。安易に `migrate resolve` するとデータ破壊につながる。

---

## 10. 将来対応（このドキュメントの対象外）

- JSON 文字列カラム（`imageUrls`, `tags`, `daysOfWeek`, `startTimes`, `supportedLanguages`, `payload` 等）を Postgres `jsonb` 型へ移行
- Supabase RLS（Row Level Security）ポリシー設計
- Supabase Auth 連携（現状は独自 JWT。Phase 1 以降）
- Cloudflare R2 / Image Resizing への Storage 移行（Egress 最適化）
- Mobile アプリの App Store / Google Play 配信

---

## 付録: 重要ファイル参照

| ファイル | 役割 |
|---------|------|
| [`apps/backend/.env.example`](../apps/backend/.env.example) | 環境変数テンプレート |
| [`apps/backend/vercel.json`](../apps/backend/vercel.json) | Vercel buildCommand / Cron 設定 |
| [`apps/backend/prisma/schema.prisma`](../apps/backend/prisma/schema.prisma) | DB スキーマ定義 |
| [`apps/backend/prisma/migrations/20260425000000_init/migration.sql`](../apps/backend/prisma/migrations/20260425000000_init/migration.sql) | 初期マイグレーション SQL |
| [`apps/backend/src/lib/storage/`](../apps/backend/src/lib/storage/) | Storage 抽象化レイヤ |
| [`apps/backend/src/lib/prisma.ts`](../apps/backend/src/lib/prisma.ts) | Prisma クライアント singleton |
| [`apps/mobile/.env.example`](../apps/mobile/.env.example) | Mobile 環境変数テンプレート |
| [`apps/mobile/lib/api.ts`](../apps/mobile/lib/api.ts) | Mobile API_BASE 解決ロジック |

---

## 付録: 完全実行サマリ（Claude Code 向けクイックスタート）

```bash
# Phase 1: ローカル動作確認
pnpm install
createdb deep_experience_dev
cp apps/backend/.env.example apps/backend/.env
# → エディタで .env の DATABASE_URL / DIRECT_URL を設定
pnpm --filter backend prisma:deploy
pnpm --filter backend prisma:seed
pnpm --filter backend test
./service.sh start backend
curl -s http://localhost:8001/api/v1/tours/<seed-tour-id>/schedules?dateFrom=2026-01-01\&dateTo=2027-12-31

# Phase 2-3: Supabase + Vercel は GUI 操作（事前準備のチェックリストに従う）

# Phase 4: 本番シード
DATABASE_URL="<DIRECT_URL>" DIRECT_URL="<DIRECT_URL>" pnpm --filter backend prisma:seed

# Phase 5: スモークテスト
curl -s "<APP_URL>/api/v1/tours/<id>/schedules?..." | head -c 500
# → 管理画面で画像アップロード
curl -X POST "<APP_URL>/api/v1/admin/jobs/finalize-bookings" -H "Authorization: Bearer <CRON_SECRET>"

# Phase 6: Mobile
cp apps/mobile/.env.example apps/mobile/.env
# → エディタで EXPO_PUBLIC_API_BASE_URL を設定
./service.sh start mobile
```
