# DeepExperience 技術アーキテクチャ

AIエージェント（Claude Code等）がこのプロジェクトを安全に改修するための
技術的前提・共通パターン・規約をまとめたドキュメント。

## 1. 技術スタック

### 言語・ランタイム

| カテゴリ | 技術 | バージョン | 役割 |
|----------|------|-----------|------|
| 言語 | TypeScript | 5.8–5.9 | 全レイヤー共通言語 |
| ランタイム | Node.js | — | バックエンドランタイム |
| UIライブラリ | React | 19.1.0 | Backend SSR + Mobile |

### バックエンド

| カテゴリ | 技術 | バージョン | 役割 |
|----------|------|-----------|------|
| フレームワーク | Next.js | 15.3.0 | App Router APIサーバー（port 8001） |
| ORM | Prisma | 6.5.0 | ORM + マイグレーション |
| DB | SQLite | — | 開発用DB（本番はPostgreSQL予定） |
| バリデーション | Zod | 3.24.0 | リクエストバリデーション |
| 認証 | jsonwebtoken | 9.0.2 | JWT生成・検証 |
| パスワード | bcryptjs | 3.0.2 | パスワードハッシュ |
| 画像処理 | sharp | 0.34.5 | 画像リサイズ・サムネイル生成 |
| i18n | i18next | 24.2.2 | サーバーサイド多言語対応 |
| i18n React | react-i18next | 15.4.1 | React統合i18n |

### モバイル

| カテゴリ | 技術 | バージョン | 役割 |
|----------|------|-----------|------|
| フレームワーク | React Native | 0.81.5 | クロスプラットフォームUI |
| プラットフォーム | Expo | 54.0.33 | Managed workflow |
| ルーティング | Expo Router | 6.0.23 | ファイルベースルーティング |
| ロケール | expo-localization | 15.0.3 | デバイスロケール検出 |
| 位置情報 | expo-location | 19.0.8 | GPS位置情報取得 |
| 地図 | react-native-maps | 1.27.1 | ネイティブマップ表示 |
| Web対応 | react-native-web | 0.21.2 | Web対応 |
| ストレージ | @react-native-async-storage | 3.0.2 | ローカルデータ永続化 |
| アイコン | lucide-react-native | 1.7.0 | アイコンライブラリ |

### ビルド・開発ツール

| カテゴリ | 技術 | バージョン | 役割 |
|----------|------|-----------|------|
| パッケージ | pnpm | 10.30.2 | パッケージマネージャー（workspaces） |
| ビルド | Turborepo | — | モノレポビルドオーケストレーション |
| TS実行 | tsx | 4.19.0 | TypeScript実行（seed等） |
| Babel | babel-preset-expo | 55.0.13 | Expo用Babelプリセット |

### 共有パッケージ

| パッケージ | 役割 |
|-----------|------|
| `@deep-experience/i18n` | i18next設定 + リソースバンドル（en/ja） |
| `shared-types` | API型定義（ステータスenum、リクエスト/レスポンス型） |
| `api-client` | APIクライアント（スタブ、未実装） |

### 外部サービス

| サービス | 用途 |
|---------|------|
| Google Maps JavaScript API | Web版マップ表示（管理画面 + モバイルWeb） |
| Google Geocoding API | 住所⇔座標変換 |

## 2. ディレクトリ構造

```
deep-experience/
├── apps/
│   ├── backend/              # Next.js 15 App Router (port 8001)
│   │   ├── prisma/
│   │   │   ├── schema.prisma # DBスキーマ（18モデル）
│   │   │   └── seed.ts       # シードデータ
│   │   └── src/
│   │       ├── app/
│   │       │   ├── api/v1/   # REST APIルート（43ファイル）
│   │       │   │   ├── admin/    # 管理者API（JWT必須）
│   │       │   │   ├── guide/    # ガイドAPI（JWT必須）
│   │       │   │   ├── tours/    # 公開ツアーAPI
│   │       │   │   ├── bookings/ # 公開予約API
│   │       │   │   ├── notifications/ # 通知API
│   │       │   │   └── geocode/  # ジオコーディングAPI
│   │       │   └── admin/    # 管理画面（Next.js SSR pages）
│   │       ├── lib/
│   │       │   ├── auth.ts       # JWT認証（admin/guide）
│   │       │   ├── client-auth.ts # クライアントサイド認証hook
│   │       │   ├── response.ts   # 標準レスポンスフォーマット
│   │       │   ├── prisma.ts     # Prismaシングルトン
│   │       │   ├── notification.ts # 通知作成サービス
│   │       │   ├── i18n.tsx      # サーバーサイドi18n設定
│   │       │   └── storage/      # ストレージ抽象化
│   │       │       ├── index.ts      # StorageProvider interface
│   │       │       ├── factory.ts    # Provider factory
│   │       │       ├── local.ts      # ローカルファイル実装
│   │       │       └── thumbnail.ts  # サムネイル生成
│   │       └── middleware.ts  # CORSミドルウェア
│   └── mobile/               # Expo 54 React Native
│       ├── app/
│       │   ├── _layout.tsx       # ルートレイアウト + i18n初期化
│       │   ├── (tabs)/          # タブナビゲーション
│       │   │   ├── index.tsx    # マップ画面
│       │   │   ├── list.tsx     # リスト画面
│       │   │   └── bookings.tsx # 予約一覧
│       │   ├── tour/[tourId].tsx    # ツアー詳細+予約フォーム
│       │   ├── booking/[bookingId].tsx # 予約詳細
│       │   └── notifications.tsx    # 通知一覧
│       ├── components/
│       │   └── WebMap.tsx       # Google Maps Webラッパー
│       └── lib/
│           ├── api.ts           # APIクライアント
│           ├── config.ts        # 設定（Maps APIキー等）
│           └── alert.tsx        # アラートプロバイダー
├── packages/
│   ├── shared-types/src/index.ts  # API型定義
│   ├── i18n/src/                  # 多言語リソース
│   └── api-client/                # APIクライアント（スタブ）
├── docs/                          # 技術ドキュメント
├── turbo.json                     # build: dependsOn ^build, dev: no cache
└── pnpm-workspace.yaml            # apps/*, packages/*
```

### ファイル配置規約

| 種類 | 配置先 | 命名規約 |
|------|--------|----------|
| APIルート | `apps/backend/src/app/api/v1/{domain}/route.ts` | Next.js App Router規約 |
| 管理画面ページ | `apps/backend/src/app/admin/{domain}/page.tsx` | Next.js App Router規約 |
| バックエンド共通処理 | `apps/backend/src/lib/*.ts` | 機能名.ts |
| モバイル画面 | `apps/mobile/app/**/*.tsx` | Expo Router規約 |
| モバイルコンポーネント | `apps/mobile/components/*.tsx` | PascalCase.tsx |
| 共有型定義 | `packages/shared-types/src/index.ts` | 単一ファイル |
| i18nリソース | `packages/i18n/src/locales/{lang}/{ns}.json` | 言語コード/ネームスペース.json |

## 3. APIルート/エンドポイントの共通パターン

### 認証・認可パターン

全APIルートで共通の認証パターンを使用。`requireAuth()`がJWT検証とロールチェックを一括処理し、失敗時はNextResponseを直接返す。

```typescript
// src/lib/auth.ts から引用
export function requireAuth(
  req: NextRequest,
  role: "admin" | "guide"
): JwtPayload | NextResponse {
  const token = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }
  const payload = verifyToken(token);
  if (!payload || payload.role !== role) {
    // ... 401 or 403
  }
  return payload;
}

// 各ルートでの使用パターン（全admin/guideルートで共通）
export async function POST(req: NextRequest, { params }: { params: Promise<{ tourId: string }> }) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;
  // auth はここで JwtPayload 型として確定
  // ...
}
```

### レスポンス形式の規約

`src/lib/response.ts` で統一されたレスポンスヘルパーを使用。

**成功レスポンス:**
```json
{ "tours": [...], "total": 10, "limit": 50, "offset": 0 }
```
または単一リソース:
```json
{ "id": "...", "status": "PENDING", ... }
```

**エラーレスポンス:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [{ "field": "email", "message": "required" }]
  }
}
```

エラーコード一覧: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `VALIDATION_ERROR` (400), `CONFLICT` (409)

### 新規エンドポイント作成テンプレート

```typescript
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound, validationError, jsonError } from "@/lib/response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  // ... Prisma query
  if (!resource) return notFound("Resource not found");
  return jsonOk({ resource });
}
```

**注意**: Next.js 15 App Routerでは `params` は `Promise` 型。必ず `await params` で展開する。

### APIルート一覧（43ルートファイル）

**公開API（認証不要）: 9ルート**
- `GET /tours/search` — 地理的検索（Haversine距離計算）
- `GET /tours/[tourId]` — ツアー詳細
- `GET /tours/[tourId]/schedules` — スケジュール一覧
- `GET /tours/[tourId]/availability` — 空き状況（ルール+CloseOut+既存スケジュールのマージ）
- `POST /bookings` — 予約作成（トランザクション：予約+容量更新）
- `GET /bookings?email=` — メールで予約検索
- `GET /bookings/[bookingId]` — 予約詳細
- `POST /bookings/[bookingId]/cancel` — 予約キャンセル
- `GET /geocode` — ジオコーディング

**通知API（認証不要）: 2ルート**
- `GET /notifications?email=` — 通知一覧
- `POST /notifications/[notificationId]/read` — 既読マーク

**ガイドAPI（Guide JWT必要）: 7ルート**
- `POST /guide/auth/login` — ガイドログイン
- `GET /guide/profile` — プロフィール取得
- `GET /guide/assignments` — アサイン一覧
- `GET /guide/assignments/[assignmentId]` — アサイン詳細
- `POST /guide/assignments/[assignmentId]/accept` — 承諾（トランザクション）
- `POST /guide/assignments/[assignmentId]/decline` — 辞退
- `POST /guide/bookings/[bookingId]/start` — ツアー開始
- `POST /guide/bookings/[bookingId]/complete` — ツアー完了

**管理API（Admin JWT必要）: 25ルート**
- `POST /admin/auth/login` — 管理者ログイン
- Tours: CRUD + スケジュール管理 + 料金 + CapacityRule + CloseOut + メディア（11ルート）
- Spots: CRUD + メディア（4ルート）
- Bookings: 一覧 + ガイドアサイン + アサイン承諾/辞退（4ルート）
- Guides: CRUD（2ルート）
- Media: アップロード + 一覧 + 削除（3ルート）
- Schedules: 個別更新（1ルート）

## 4. フロントエンド/UIのパターン

### 管理画面（Next.js SSR）

バックエンドの `src/app/admin/` に配置。Next.js App Routerのページとして動作。

**クライアント認証hook** (`src/lib/client-auth.ts`):
```typescript
// 全管理画面で共通パターン
export function useAuth(role: "admin" | "guide") {
  // localStorage から token を読み込み
  // 未認証時は /admin/login へリダイレクト
  // authFetch: Bearer token 自動付与 + 401 時自動ログアウト
  return { token, loading, logout, authFetch };
}
```

管理画面のページは `"use client"` ディレクティブ + `useAuth("admin")` で統一。

### モバイルアプリ（React Native / Expo）

**ナビゲーション構造** (Expo Router):
```
Root Layout (_layout.tsx)
├── (tabs)/_layout.tsx  — タブバー設定
│   ├── index.tsx       — マップ画面（Google Maps Web / リストフォールバック）
│   ├── list.tsx        — リスト画面（カテゴリ・タイプフィルター）
│   └── bookings.tsx    — 予約一覧（メールで検索、AsyncStorage保存）
├── tour/[tourId].tsx   — ツアー詳細＋予約フォーム
├── booking/[bookingId].tsx — 予約詳細＋キャンセル
└── notifications.tsx   — 通知一覧（30秒ポーリング）
```

**APIクライアント** (`apps/mobile/lib/api.ts`):
```typescript
// Platform別ベースURL
const BASE = Platform.OS === "android"
  ? "http://10.0.2.2:8001"
  : "http://localhost:8001";

// 汎用fetch関数 — 全画面で共通使用
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // Content-Type はbody有りの場合のみ自動設定
  // エラー時は data.error.message をthrow
}
```

**状態管理**: React hooks + AsyncStorage（Phase 0はRedux/Zustand不要）

**マップ表示** (`components/WebMap.tsx`):
- Web: Google Maps JavaScript API（スクリプト動的ロード、シングルトン管理）
- Native: リストフォールバック（Expo GoではMapView不可）
- ピン色分け: 緑（空き）、橙（残少）、灰（満席/スケジュールなし）、青（プライベート）

### 多言語対応

- `@deep-experience/i18n` パッケージで一元管理
- モバイルでの初期化: `_layout.tsx` 内でi18nextを直接セットアップ（pnpm dual-instance問題を回避するため、パッケージのinitI18nは使わずi18nextを直接使用）
- デバイスロケール検出: `expo-localization` → `navigator.language` フォールバック
- 対応言語: en, ja
- ネームスペース: common, mobile, admin
- フォールバック: English

## 5. データアクセスパターン

### Prismaシングルトン

```typescript
// src/lib/prisma.ts — 開発時のHot Reload対策
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

全APIルートで `import { prisma } from "@/lib/prisma"` を使用。直接 `new PrismaClient()` は禁止。

### トランザクションパターン

2箇所で `prisma.$transaction()` を使用（データ整合性の要）:

**予約作成** (`/bookings` POST):
```typescript
const booking = await prisma.$transaction(async (tx) => {
  const b = await tx.booking.create({ data: { ... } });
  await tx.tourSchedule.update({
    where: { id: body.tourScheduleId },
    data: { capacity: newCapacity, status: newCapacity <= 0 ? "FULL" : "OPEN" },
  });
  return b;
});
```

**ガイドアサイン承諾**: `assignment.update` + `booking.update` + `notification.create` をアトミック実行

### JSON配列のハンドリング

SQLiteがネイティブ配列をサポートしないため、JSON文字列として保存し読み取り時にパースするパターンが多数:
```typescript
// 保存時
data: { daysOfWeek: JSON.stringify(body.daysOfWeek || []) }
// 読み取り時
{ ...rule, daysOfWeek: JSON.parse(rule.daysOfWeek) }
```
対象フィールド: `Tour.imageUrls`, `Tour.supportedLanguages`, `Tour.tags`, `Guide.languages`, `Guide.areas`, `CapacityRule.daysOfWeek`, `CapacityRule.startTimes`, `CloseOut.startTime`

### 通知作成サービス

```typescript
// src/lib/notification.ts — トランザクション内で使用可能
export async function createNotification(params: CreateNotificationParams, tx: TxClient) {
  return tx.notification.create({ data: { ... } });
}
```

### ストレージ抽象化

```typescript
// src/lib/storage/index.ts — Provider interface
export interface StorageProvider {
  upload(buffer: Buffer, filename: string, mimeType: string): Promise<UploadResult>;
  delete(originalUrl: string, thumbnailUrl: string): Promise<void>;
}

// src/lib/storage/factory.ts — 環境変数で切り替え
const type = process.env.STORAGE_PROVIDER || "local";
```
現在はローカルファイルのみ実装。本番では `STORAGE_PROVIDER` を変更してS3等に切り替え予定。

### スケジュール自動生成

`POST /admin/tours/:tourId/schedules/generate` で CapacityRule からTourScheduleを一括生成:
1. CapacityRule（priority降順）を取得
2. CloseOutマップを構築（日単位 / 時間単位）
3. 既存スケジュールとの重複チェック
4. 日付範囲をイテレートし、最高優先度ルールにマッチするスロットを生成
5. `prisma.tourSchedule.createMany()` で一括作成

## 6. 外部サービス・環境変数

### 必須環境変数

| 変数名 | 用途 | 設定例 |
|--------|------|--------|
| `DATABASE_URL` | Prisma DB接続文字列 | `file:./dev.db`（SQLite）/ PostgreSQL接続文字列 |

### 任意環境変数

| 変数名 | 用途 | デフォルト |
|--------|------|-----------|
| `JWT_SECRET` | JWT署名シークレット | `dev-secret-change-in-production`（開発用フォールバック） |
| `STORAGE_PROVIDER` | ストレージ種別 | `local` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps APIキー（管理画面用） | 空文字 |
| `NODE_ENV` | 環境識別（Prismaシングルトン制御） | — |

### 外部サービス連携

| サービス | 用途 | 連携方式 |
|---------|------|---------|
| Google Maps JavaScript API | 管理画面・モバイルWebでの地図表示 | クライアントサイドスクリプト読み込み |
| Google Geocoding API | バックエンドでの住所⇔座標変換 | サーバーサイドAPI呼び出し |

**Bokun OTA Hub（将来連携予定）**: Tour モデルに `bookingType`, `meetingType`, `ticketSupport`, `capacityModel`, `bookingSource`, `bookingChannel`, `externalBookingId` 等のBokun互換フィールドを事前定義済み。

## 7. 開発・ビルドコマンド

### ルートスクリプト (`package.json`)

| コマンド | 説明 |
|---------|------|
| `pnpm dev:backend` | バックエンド起動（port 8001） |
| `pnpm dev:mobile` | Expo モバイルアプリ起動 |
| `pnpm build` | Turborepo経由で全パッケージビルド |
| `pnpm lint` | Turborepo経由で全パッケージLint |
| `pnpm db:generate` | Prismaクライアント生成 |
| `pnpm db:push` | スキーマをDBに反映 |
| `pnpm db:seed` | シードデータ投入 |
| `pnpm db:studio` | Prisma Studio（DBブラウザ）起動 |

### バックエンドスクリプト (`apps/backend/package.json`)

| コマンド | 説明 |
|---------|------|
| `pnpm --filter backend dev` | Next.js開発サーバー起動（port 8001） |
| `pnpm --filter backend build` | Next.js本番ビルド |
| `pnpm --filter backend prisma:generate` | Prismaクライアント生成 |
| `pnpm --filter backend prisma:push` | スキーマDB反映 |
| `pnpm --filter backend prisma:seed` | `tsx prisma/seed.ts` 実行 |
| `pnpm --filter backend prisma:studio` | Prisma Studio起動 |

### 典型的な開発フロー

1. `pnpm db:push` — スキーマ変更時
2. `pnpm db:seed` — 初期データ投入
3. `pnpm dev:backend` — バックエンド起動
4. `pnpm dev:mobile` — モバイルアプリ起動（別ターミナル）
5. Expo GoアプリでQRコード読み取り — iOS実機テスト

### 制約事項

- **Xcode未インストール**: ネイティブビルドはEAS Build（クラウド）を使用
- **Expo Go制約**: `react-native-maps` のMapViewが使用不可 → Web版Google Maps JavaScriptAPIでフォールバック
- **Phase 0制約**:
  - 決済なし（現地払い）
  - ガイド自動マッチングなし（管理者手動アサイン）
  - 英語UIのみ（i18n基盤は整備済み）

### 主要ビジネスロジック

#### 空き状況計算アルゴリズム

```
CapacityRule (WEEKLY/YEARLY/RANGE/SINGLE)
  + CloseOut (除外日時)
  + 既存TourSchedule (予約済み容量)
  → 日付ごとの空きスロット一覧（容量・料金情報付き）
```

1. 指定期間の各日をイテレート
2. CloseOutで完全ブロックされた日を除外
3. 曜日に一致する最高優先度のルールを選択（`priority`降順で最初にマッチしたルールのみ使用）
4. ルールの各開始時間について時間単位のCloseOutを確認
5. 既存スケジュールがあればその容量を使用、なければルールの容量
6. 全Rate × PricingCategoryの料金情報を付与

#### ガイドアサインワークフロー

```
Booking(PENDING)
  → Admin assign → GuideAssignment(PENDING)
  → Guide accept → Assignment(ACCEPTED) + Booking(CONFIRMED) + Notification
  → Guide decline → Assignment(DECLINED) + Notification
  → Guide start → Booking(IN_PROGRESS)
  → Guide complete → Booking(COMPLETED)
```

#### トランザクション安全性

- **予約作成**: `booking.create` + `schedule.update`（容量減少）をアトミック実行
- **アサイン承諾**: `assignment.update` + `booking.update` + `notification.create` をアトミック実行
