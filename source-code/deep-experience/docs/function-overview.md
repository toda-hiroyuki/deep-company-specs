# DeepExperience 関数概要一覧

> ライブラリ関数、APIルート、コンポーネント、ページの包括的リファレンス。

## 目次

1. [ライブラリ関数](#1-ライブラリ関数)
2. [APIルート/エンドポイント](#2-apiルートエンドポイント)
3. [共有パッケージ](#3-共有パッケージ)
4. [コンポーネント](#4-コンポーネント)
5. [ページ/画面](#5-ページ画面)

---

## 1. ライブラリ関数

### 1.1 認証

#### `apps/backend/src/lib/auth.ts`

| 関数 | シグネチャ | 説明 |
|------|-----------|------|
| `signToken` | `(payload: JwtPayload) => string` | JWTトークンを生成（7日間有効） |
| `verifyToken` | `(token: string) => JwtPayload \| null` | JWTトークンを検証、無効時はnull |
| `getTokenFromRequest` | `(req: NextRequest) => string \| null` | AuthorizationヘッダーからBearerトークンを抽出 |
| `requireAuth` | `(req: NextRequest, role: "admin" \| "guide") => JwtPayload \| NextResponse` | JWT検証+ロールチェック、失敗時は401/403レスポンスを返す |

**型定義:**

| 型 | 定義 | 説明 |
|-----|------|------|
| `JwtPayload` | `{ id: string; email: string; role: "admin" \| "guide" }` | JWTペイロード |

#### `apps/backend/src/lib/client-auth.ts`

| 関数 | シグネチャ | 説明 |
|------|-----------|------|
| `useAuth` | `(role: "admin" \| "guide") => { token, loading, logout, authFetch }` | クライアントサイド認証hook（localStorage管理） |
| `statusBadgeClass` | `(status: string) => string` | ステータス文字列からCSSクラスを生成 |
| `formatDateTime` | `(iso: string) => string` | ISO文字列を "Mon 1, 10:00 AM" 形式にフォーマット |
| `formatPrice` | `(cents: number) => string` | セント値を "$30.00" 形式にフォーマット |

### 1.2 レスポンス

#### `apps/backend/src/lib/response.ts`

| 関数 | シグネチャ | 説明 |
|------|-----------|------|
| `jsonOk` | `(data: unknown, status?: number) => NextResponse` | 成功レスポンスを返す（デフォルト200） |
| `jsonError` | `(code: string, message: string, status: number, details?: {field,message}[]) => NextResponse` | エラーレスポンスを返す |
| `notFound` | `(message?: string) => NextResponse` | 404レスポンスを返す |
| `validationError` | `(details: {field: string, message: string}[]) => NextResponse` | 400バリデーションエラーを返す |

### 1.3 データベース

#### `apps/backend/src/lib/prisma.ts`

| 関数/変数 | シグネチャ | 説明 |
|----------|-----------|------|
| `prisma` | `PrismaClient` | Prismaシングルトンインスタンス（Hot Reload対応） |

### 1.3.1 予約割当（Issue #5）

#### `apps/backend/src/lib/booking/resolveScheduleAssignment.ts`

| 関数 | シグネチャ | 説明 |
|------|-----------|------|
| `resolveScheduleAssignment` | `(input: { tourId; requestedStartDateTime; requestedGuests; now? }) => Promise<ResolveResult>` | 自動割当オーケストレータ。同時刻の既存催行回を判定サービスで評価 → 空きがあれば EXISTING、なければ NEW の `AssignmentPlan` を返す（DB 書込は呼び出し側の tx） |
| `resolveInitialCapacity` | `(rule: CapacityRule \| null, tour) => number` | 新規催行回の初期 capacity を `CapacityRule.capacity → Tour.maxParticipants → 6` で解決 |
| `normalizeToMinutePrecision` | `(dt: Date) => Date` | 候補探索で使う「分精度」正規化ヘルパ |
| `TourNotAvailableError` | class | ツアー未存在・非アクティブ時に throw |

#### `apps/backend/src/lib/capacity/matchCapacityRuleForStart.ts`

| 関数 | シグネチャ | 説明 |
|------|-----------|------|
| `matchCapacityRuleForStart` | `({ startDateTime, rules }) => CapacityRule \| null` | JST 日時に適用可能な CapacityRule（priority 最高）を返す。新規催行回の初期定員と sourceRuleId 決定に使用 |
| `doesRuleApplyToDate` | `(rule, { year, month, day, dayOfWeek }) => boolean` | ruleType ごとの日付スコープ判定（WEEKLY/RANGE/SINGLE/YEARLY）。generate route と共有 |
| `toJstComponents` | `(utc: Date) => CalendarComponents` | UTC Date から JST カレンダー要素（年月日・曜日・時分）を抽出 |

#### `apps/backend/src/lib/capacity/checkCloseOut.ts`

| 関数 | シグネチャ | 説明 |
|------|-----------|------|
| `checkCloseOut` | `(ctx: AssessmentContext) => AssessmentResult` | 判定サービス項目 0。CloseOut が該当 JST 日時をブロックしていれば `SCHEDULE_CLOSED_OUT` を返す |

#### `apps/backend/src/lib/capacity/checkBookingCutoff.ts`

| 関数 | シグネチャ | 説明 |
|------|-----------|------|
| `isBookingCutoffExceeded` | `({ startDateTime, bookingCutoffMinutes, now }) => boolean` | 純関数。`bookingCutoffMinutes=null` は常に false、`(start - now)/60000 < cutoff` で true（等値は false）。判定サービスと Traveler 公開 API（`/tours/:tourId/schedules`・`/availability`）の両方から呼ばれ、締切判定をサーバー側で単一の真実源に保つ |
| `checkBookingCutoff` | `(ctx: AssessmentContext) => AssessmentResult` | 判定サービス項目 5。`isBookingCutoffExceeded` に委譲し、超過なら `BOOKING_CUTOFF_EXCEEDED` を返す |

#### `apps/backend/src/lib/booking/updateBookingGuests.ts`（Issue #6）

| 関数 | シグネチャ | 説明 |
|------|-----------|------|
| `updateBookingGuests` | `(input: { bookingId; newNumberOfGuests; now? }) => Promise<UpdateBookingGuestsResult>` | 予約人数変更サービス。delta を算出し、#2 判定サービスの `fetchContext` を流用しつつ二重カウント項目を override で補正。tx 内で `TourSchedule.capacity` の増減・`OPEN↔FULL` 自動遷移・`Booking.numberOfGuests/totalPriceCents` 更新をアトミックに実行。`BOOKING_NOT_FOUND / BOOKING_NOT_ACTIVE / GUESTS_UNCHANGED` と既存 `BookingRejectionReason` を返す |

#### `apps/backend/src/lib/booking/isDepartureFinalized.ts`（FINALIZE バッチ）

| 関数 | シグネチャ | 説明 |
|------|-----------|------|
| `isDepartureFinalized` | `({ startDateTime, freeCancellationDeadlineHours, now }) => boolean` | 出発時刻 - 無料キャンセル締切時間 ≤ now で true。`freeCancellationDeadlineHours=null` は常に false。`FINALIZE_GUARD_ENABLED=false` で常に false（ロールアウト制御） |
| `computeFinalizeAt` | `(startDateTime, hours \| null) => Date \| null` | 締切時刻の Date を返す UI 用ヘルパ |

### 1.3.2 バッチ実行基盤（FINALIZE バッチ）

#### `apps/backend/src/lib/jobs/runJob.ts`

| 関数 | シグネチャ | 説明 |
|------|-----------|------|
| `runJob` | `(jobName: string, fn: () => Promise<JobResult>) => Promise<RunJobOutcome>` | `JobExecutionLog` に RUNNING→SUCCESS/FAILED を記録する共通ラッパ。例外を捕捉して FAILED に遷移させる |

#### `apps/backend/src/lib/jobs/finalizeBookings.ts`

| 関数 | シグネチャ | 説明 |
|------|-----------|------|
| `finalizeBookings` | `(now?: Date) => Promise<JobResult>` | TENTATIVE 予約のうち `Tour.freeCancellationDeadlineHours` が設定済みで締切経過したものを `FINALIZED` に一括更新。null 設定の Tour に紐づく予約件数を `warnCount` に計上 |

### 1.3.3 Tour 設定バリデーション

#### `apps/backend/src/lib/tour/validateCancellationSettings.ts`

| 関数 | シグネチャ | 説明 |
|------|-----------|------|
| `validateCancellationSettings` | `(input, existing?) => ValidationIssue[]` | `bookingCutoffMinutes > freeCancellationDeadlineHours * 60` の逆転設定を検出。partial update 時は existing とマージして評価 |

### 1.4 通知

#### `apps/backend/src/lib/notification.ts`

| 関数 | シグネチャ | 説明 |
|------|-----------|------|
| `createNotification` | `(params: CreateNotificationParams, tx: TxClient) => Promise<Notification>` | トランザクション内で通知レコードを作成 |

**型定義:**

| 型 | フィールド | 説明 |
|-----|-----------|------|
| `CreateNotificationParams` | `{ recipientEmail, bookingId?, type, titleEn, messageEn }` | 通知作成パラメータ |

### 1.5 ストレージ

#### `apps/backend/src/lib/storage/index.ts`

| インターフェース | メソッド | 説明 |
|---------------|---------|------|
| `StorageProvider` | `upload(buffer, filename, mimeType) => Promise<UploadResult>` | ファイルアップロード |
| `StorageProvider` | `delete(originalUrl, thumbnailUrl) => Promise<void>` | ファイル削除 |

**型定義:**

| 型 | フィールド | 説明 |
|-----|-----------|------|
| `UploadResult` | `{ originalUrl, thumbnailUrl, width, height, sizeBytes }` | アップロード結果 |

#### `apps/backend/src/lib/storage/factory.ts`

| 関数 | シグネチャ | 説明 |
|------|-----------|------|
| `getStorageProvider` | `() => StorageProvider` | 環境変数 `STORAGE_PROVIDER` に基づきプロバイダーを返す |

#### `apps/backend/src/lib/storage/local.ts`

| クラス | メソッド | 説明 |
|--------|---------|------|
| `LocalStorageProvider` | `upload(buffer, filename, mimeType)` | `public/uploads/` にファイル保存+サムネイル生成 |
| `LocalStorageProvider` | `delete(originalUrl, thumbnailUrl)` | ローカルファイルを削除 |

#### `apps/backend/src/lib/storage/thumbnail.ts`

| 関数 | シグネチャ | 説明 |
|------|-----------|------|
| `generateThumbnail` | `(buffer: Buffer) => Promise<ThumbnailResult>` | sharp で 400x300 JPEG サムネイルを生成 |

**型定義:**

| 型 | フィールド | 説明 |
|-----|-----------|------|
| `ThumbnailResult` | `{ thumbnailBuffer: Buffer, width: number \| null, height: number \| null }` | サムネイル生成結果 |

### 1.6 i18n（バックエンド管理画面用）

#### `apps/backend/src/lib/i18n.tsx`

| 関数 | シグネチャ | 説明 |
|------|-----------|------|
| `useI18n` | `() => { locale: Locale, setLocale: (l: Locale) => void, t: (key, params?) => string }` | 管理画面用i18n hook（admin→commonネームスペースフォールバック） |

**型定義:**

| 型 | 定義 | 説明 |
|-----|------|------|
| `Locale` | `"en" \| "ja"` | サポートロケール |

### 1.7 モバイルAPI クライアント

#### `apps/mobile/lib/api.ts`

| 関数/変数 | シグネチャ | 説明 |
|----------|-----------|------|
| `API_BASE` | `string` | プラットフォーム別ベースURL (`http://localhost:8001/api/v1` or `10.0.2.2`) |
| `apiFetch` | `<T>(path: string, options?: RequestInit) => Promise<T>` | 汎用APIクライアント（エラーハンドリング付き） |

### 1.8 モバイル設定

#### `apps/mobile/lib/config.ts`

| 変数 | 型 | 説明 |
|------|-----|------|
| `GOOGLE_MAPS_API_KEY` | `string` | Google Maps APIキー |
| `GOOGLE_MAPS_SCRIPT_URL` | `string` | Web版Google Maps スクリプトURL（Nativeでは空文字） |

### 1.9 モバイルアラート

#### `apps/mobile/lib/alert.tsx`

| 関数 | シグネチャ | 説明 |
|------|-----------|------|
| `useAlert` | `() => AlertFn` | アラート表示関数を取得するhook |
| `AlertProvider` | `({ children }) => JSX.Element` | アラートコンテキストプロバイダー |

---

## 2. APIルート/エンドポイント

全ルートのベースパス: `/api/v1`

### 2.1 公開API（認証不要）

#### ツアー検索・詳細

| エンドポイント | メソッド | ファイル | 説明 |
|-------------|---------|--------|------|
| `/tours/search` | GET | `tours/search/route.ts` | 地理的検索（Haversine距離計算、半径/カテゴリ/日付フィルタ） |
| `/tours/[tourId]` | GET | `tours/[tourId]/route.ts` | ツアー詳細（メディア・スポット情報含む） |
| `/tours/[tourId]/schedules` | GET | `tours/[tourId]/schedules/route.ts` | ツアーのスケジュール一覧（容量情報付き） |
| `/tours/[tourId]/availability` | GET | `tours/[tourId]/availability/route.ts` | 空き状況計算（CapacityRule+CloseOut+既存スケジュールマージ） |

#### 予約

| エンドポイント | メソッド | ファイル | 説明 |
|-------------|---------|--------|------|
| `/bookings` | GET | `bookings/route.ts` | メールで予約検索 |
| `/bookings` | POST | `bookings/route.ts` | 予約作成（`tourId + requestedStartDateTime` から `resolveScheduleAssignment` で催行回を自動割当。`assignmentState=TENTATIVE`） |
| `/bookings/[bookingId]` | GET | `bookings/[bookingId]/route.ts` | 予約詳細（ガイド情報含む） |
| `/bookings/[bookingId]/cancel` | POST | `bookings/[bookingId]/cancel/route.ts` | 予約キャンセル（2時間前制限チェック） |

#### 通知

| エンドポイント | メソッド | ファイル | 説明 |
|-------------|---------|--------|------|
| `/notifications` | GET | `notifications/route.ts` | メールで通知一覧取得 |
| `/notifications/[notificationId]/read` | POST | `notifications/[..]/read/route.ts` | 通知を既読マーク |

#### ジオコーディング

| エンドポイント | メソッド | ファイル | 説明 |
|-------------|---------|--------|------|
| `/geocode` | GET | `geocode/route.ts` | Nominatim経由の住所⇔座標変換 |

### 2.2 ガイドAPI（Guide JWT必要）

| エンドポイント | メソッド | ファイル | 説明 |
|-------------|---------|--------|------|
| `/guide/auth/login` | POST | `guide/auth/login/route.ts` | ガイドログイン（email+password→JWT） |
| `/guide/profile` | GET | `guide/profile/route.ts` | 認証済みガイドのプロフィール取得 |
| `/guide/profile` | PUT | `guide/profile/route.ts` | ガイドプロフィール更新 |
| `/guide/assignments` | GET | `guide/assignments/route.ts` | 認証済みガイドのアサイン一覧 |
| `/guide/assignments/[id]` | GET | `guide/assignments/[id]/route.ts` | アサイン詳細（予約・ツアー情報含む） |
| `/guide/assignments/[id]/accept` | POST | `guide/assignments/[id]/accept/route.ts` | アサイン承諾（トランザクション: 確認+通知） |
| `/guide/assignments/[id]/decline` | POST | `guide/assignments/[id]/decline/route.ts` | アサイン辞退（理由付き+通知） |
| `/guide/bookings/[id]/start` | POST | `guide/bookings/[id]/start/route.ts` | ツアー開始（Booking→IN_PROGRESS） |
| `/guide/bookings/[id]/complete` | POST | `guide/bookings/[id]/complete/route.ts` | ツアー完了（Booking→COMPLETED） |

### 2.3 管理API（Admin JWT必要）

#### 認証

| エンドポイント | メソッド | ファイル | 説明 |
|-------------|---------|--------|------|
| `/admin/auth/login` | POST | `admin/auth/login/route.ts` | 管理者ログイン（email+password→JWT） |

#### ツアー管理

| エンドポイント | メソッド | ファイル | 説明 |
|-------------|---------|--------|------|
| `/admin/tours` | GET | `admin/tours/route.ts` | ツアー一覧（アクティブスケジュール付き） |
| `/admin/tours` | POST | `admin/tours/route.ts` | ツアー新規作成 |
| `/admin/tours/[tourId]` | GET | `admin/tours/[tourId]/route.ts` | ツアー詳細（スケジュール・料金・ルール全含む） |
| `/admin/tours/[tourId]` | PUT | `admin/tours/[tourId]/route.ts` | ツアー情報更新 |
| `/admin/tours/[tourId]` | DELETE | `admin/tours/[tourId]/route.ts` | ツアー論理削除（isActive=false） |

#### スケジュール管理

| エンドポイント | メソッド | ファイル | 説明 |
|-------------|---------|--------|------|
| `/admin/tours/[tourId]/schedules` | GET | `admin/tours/[tourId]/schedules/route.ts` | スケジュール一覧（from/to(JST)・status・zeroBookings フィルタ、3値定員・予約サマリ） |
| `/admin/tours/[tourId]/schedules` | POST | `admin/tours/[tourId]/schedules/route.ts` | スケジュール手動作成 |
| `/admin/tours/[tourId]/schedules/generate` | POST | `admin/tours/[..]/generate/route.ts` | CapacityRuleからスケジュール一括生成 |
| `/admin/schedules/[scheduleId]` | GET | `admin/schedules/[id]/route.ts` | スケジュール詳細（3値定員・予約サマリ） |
| `/admin/schedules/[scheduleId]` | PUT | `admin/schedules/[id]/route.ts` | スケジュール日時・定員更新（status は PATCH を使用） |
| `/admin/schedules/[scheduleId]` | PATCH | `admin/schedules/[id]/route.ts` | スケジュール status 更新専用（CANCELLED のみ、予約ありは 409） |
| `/admin/schedules/[scheduleId]` | DELETE | `admin/schedules/[id]/route.ts` | 廃止（410 Gone） |

#### 料金管理

| エンドポイント | メソッド | ファイル | 説明 |
|-------------|---------|--------|------|
| `/admin/tours/[tourId]/pricing-categories` | GET | `admin/tours/[..]/pricing-categories/route.ts` | 参加者区分一覧（料金付き） |
| `/admin/tours/[tourId]/pricing-categories` | POST | `admin/tours/[..]/pricing-categories/route.ts` | 参加者区分作成 |
| `/admin/tours/[tourId]/pricing-categories` | PUT | `admin/tours/[..]/pricing-categories/route.ts` | 参加者区分一括更新 |
| `/admin/tours/[tourId]/rates` | GET | `admin/tours/[tourId]/rates/route.ts` | 料金プラン一覧 |
| `/admin/tours/[tourId]/rates` | POST | `admin/tours/[tourId]/rates/route.ts` | 料金プラン作成（価格含む） |
| `/admin/tours/[tourId]/rates` | PUT | `admin/tours/[tourId]/rates/route.ts` | 料金プラン一括更新 |

#### CapacityRule・CloseOut管理

| エンドポイント | メソッド | ファイル | 説明 |
|-------------|---------|--------|------|
| `/admin/tours/[tourId]/capacity-rules` | GET | `admin/tours/[..]/capacity-rules/route.ts` | 可能枠ルール一覧 |
| `/admin/tours/[tourId]/capacity-rules` | POST | `admin/tours/[..]/capacity-rules/route.ts` | 可能枠ルール作成 |
| `/admin/tours/[tourId]/capacity-rules` | DELETE | `admin/tours/[..]/capacity-rules/route.ts` | 可能枠ルール削除（bodyでID指定） |
| `/admin/tours/[tourId]/close-outs` | GET | `admin/tours/[..]/close-outs/route.ts` | 除外日時一覧 |
| `/admin/tours/[tourId]/close-outs` | POST | `admin/tours/[..]/close-outs/route.ts` | 除外日時作成 |
| `/admin/tours/[tourId]/close-outs` | DELETE | `admin/tours/[..]/close-outs/route.ts` | 除外日時削除（bodyでID指定） |

#### メディア管理（ツアー・スポット紐付け）

| エンドポイント | メソッド | ファイル | 説明 |
|-------------|---------|--------|------|
| `/admin/tours/[tourId]/media` | GET | `admin/tours/[tourId]/media/route.ts` | ツアー紐付けメディア一覧 |
| `/admin/tours/[tourId]/media` | POST | `admin/tours/[tourId]/media/route.ts` | ツアーにメディア紐付け |
| `/admin/tours/[tourId]/media` | PUT | `admin/tours/[tourId]/media/route.ts` | ツアーメディア並び替え |
| `/admin/tours/[tourId]/media/[mediaId]` | DELETE | `admin/tours/[..]/media/[mediaId]/route.ts` | ツアーからメディア紐付け解除 |
| `/admin/spots/[spotId]/media` | GET | `admin/spots/[spotId]/media/route.ts` | スポット紐付けメディア一覧 |
| `/admin/spots/[spotId]/media` | POST | `admin/spots/[spotId]/media/route.ts` | スポットにメディア紐付け |
| `/admin/spots/[spotId]/media` | PUT | `admin/spots/[spotId]/media/route.ts` | スポットメディア並び替え |
| `/admin/spots/[spotId]/media/[mediaId]` | DELETE | `admin/spots/[..]/media/[mediaId]/route.ts` | スポットからメディア紐付け解除 |

#### メディアライブラリ

| エンドポイント | メソッド | ファイル | 説明 |
|-------------|---------|--------|------|
| `/admin/media` | GET | `admin/media/route.ts` | メディア一覧（ページネーション・検索） |
| `/admin/media/upload` | POST | `admin/media/upload/route.ts` | 画像アップロード+Media作成 |
| `/admin/media/[mediaId]` | GET | `admin/media/[mediaId]/route.ts` | メディア詳細（紐付けツアー・スポット情報） |
| `/admin/media/[mediaId]` | PATCH | `admin/media/[mediaId]/route.ts` | メディアaltテキスト更新 |
| `/admin/media/[mediaId]` | DELETE | `admin/media/[mediaId]/route.ts` | メディア削除（紐付けなしの場合のみ） |

#### スポット管理

| エンドポイント | メソッド | ファイル | 説明 |
|-------------|---------|--------|------|
| `/admin/spots` | GET | `admin/spots/route.ts` | スポット一覧（ツアー数付き） |
| `/admin/spots` | POST | `admin/spots/route.ts` | スポット新規作成 |
| `/admin/spots/[spotId]` | GET | `admin/spots/[spotId]/route.ts` | スポット詳細（関連ツアー含む） |
| `/admin/spots/[spotId]` | PUT | `admin/spots/[spotId]/route.ts` | スポット情報更新 |
| `/admin/spots/[spotId]` | DELETE | `admin/spots/[spotId]/route.ts` | スポット論理削除 |

#### 予約・ガイドアサイン管理

| エンドポイント | メソッド | ファイル | 説明 |
|-------------|---------|--------|------|
| `/admin/bookings` | GET | `admin/bookings/route.ts` | 予約一覧（ステータスフィルタ。`assignmentState` を返却） |
| `/admin/bookings/[id]` | PATCH | `admin/bookings/[id]/route.ts` | 予約更新（Issue #6：人数変更のみ。`updateBookingGuests` を通して capacity/totalPrice を同期） |
| `/admin/jobs/finalize-bookings` | POST | `admin/jobs/finalize-bookings/route.ts` | FINALIZE バッチ起動（Vercel Cron 経由。`CRON_SECRET` Bearer 認証） |
| `/admin/bookings/[id]/assign` | POST | `admin/bookings/[id]/assign/route.ts` | ガイドをアサイン |
| `/admin/bookings/[id]/assignments/[aid]/accept` | POST | `.../accept/route.ts` | アサイン承諾（予約確認+通知） |
| `/admin/bookings/[id]/assignments/[aid]/decline` | POST | `.../decline/route.ts` | アサイン辞退（理由付き） |

#### ガイド管理

| エンドポイント | メソッド | ファイル | 説明 |
|-------------|---------|--------|------|
| `/admin/guides` | GET | `admin/guides/route.ts` | ガイド一覧 |
| `/admin/guides` | POST | `admin/guides/route.ts` | ガイド新規作成（パスワードハッシュ） |
| `/admin/guides/[guideId]` | GET | `admin/guides/[guideId]/route.ts` | ガイド詳細（直近アサイン含む） |
| `/admin/guides/[guideId]` | PUT | `admin/guides/[guideId]/route.ts` | ガイドプロフィール更新 |

---

## 3. 共有パッケージ

### 3.1 shared-types (`packages/shared-types/src/index.ts`)

#### 定数

| 定数 | 型 | 説明 |
|------|-----|------|
| `TOUR_TYPES` | `["GROUP", "PRIVATE"]` | ツアータイプ定数 |
| `SCHEDULE_STATUSES` | `["OPEN", "FULL", "CANCELLED", "COMPLETED"]` | スケジュールステータス |
| `BOOKING_STATUSES` | `["PENDING", "CONFIRMED", "CANCELLED", "IN_PROGRESS", "COMPLETED", "EXPIRED"]` | 予約ステータス |
| `ASSIGNMENT_STATUSES` | `["PENDING", "ACCEPTED", "DECLINED"]` | アサインステータス |

#### 型定義

| 型 | 用途 |
|-----|------|
| `TourType` | `"GROUP" \| "PRIVATE"` |
| `ScheduleStatus` | スケジュールステータスのunion型 |
| `BookingStatus` | 予約ステータスのunion型 |
| `AssignmentStatus` | アサインステータスのunion型 |
| `MeetingPoint` | `{ lat, lng, name }` |
| `TourSummary` | ツアー検索結果の1件（距離・次回スケジュール含む） |
| `ScheduleSummary` | スケジュール概要（残席・ステータス） |
| `TourDetail` | ツアー詳細 |
| `BookingSummary` | 予約一覧の1件 |
| `BookingDetail` | 予約詳細（ガイド・スケジュール含む） |
| `CreateBookingRequest` | 予約作成リクエスト |
| `TourSearchParams` | ツアー検索パラメータ |
| `ApiError` | エラーレスポンス |

### 3.2 i18n (`packages/i18n/src/`)

#### `index.ts`（デフォルトエントリポイント）

| エクスポート | シグネチャ | 説明 |
|------------|-----------|------|
| `SUPPORTED_LOCALES` | `["en", "ja"] as const` | サポートロケール定数 |
| `SupportedLocale` | `"en" \| "ja"` | ロケール型 |
| `resources` | `{ en, ja }` | i18nextリソースバンドル |
| `initI18n` | `(lng?: string) => i18next` | i18next初期化（同期、バンドル内蔵） |
| `i18next` | `i18next` | i18nextインスタンス |
| `useTranslation` | (re-export) | react-i18nextのuseTranslation |

#### `native.ts`（React Nativeエントリポイント）

| エクスポート | シグネチャ | 説明 |
|------------|-----------|------|
| `initI18nNative` | `() => i18next` | expo-localizationでデバイスロケール検出+初期化 |
| `useTranslation` | (re-export) | react-i18nextのuseTranslation |

#### `web.ts`（Webエントリポイント）

| エクスポート | シグネチャ | 説明 |
|------------|-----------|------|
| `initI18nWeb` | `() => i18next` | localStorage/navigator.languageでロケール検出+初期化 |
| `changeLocale` | `(locale: SupportedLocale) => void` | ロケール変更+localStorage永続化 |
| `getCurrentLocale` | `() => SupportedLocale` | 現在のロケール取得 |
| `useTranslation` | (re-export) | react-i18nextのuseTranslation |
| `SUPPORTED_LOCALES` | (re-export) | サポートロケール定数 |

#### `resources.ts`

| エクスポート | 型 | 説明 |
|------------|-----|------|
| `resources` | `{ en: { common, mobile, admin }, ja: { common, mobile, admin } }` | 全ネームスペースのi18nリソース |

---

## 4. コンポーネント

### 4.1 モバイルコンポーネント

#### `apps/mobile/components/WebMap.tsx`

| コンポーネント | Props | 説明 |
|-------------|-------|------|
| `WebMap` | `{ center: [number, number], pins: Pin[], onPinPress: (id) => void, onMoveEnd: (lat, lng) => void }` | Google Maps JavaScript APIラッパー（ピン色分け・InfoWindow付き） |

**Props内型:**

| 型 | フィールド | 説明 |
|-----|-----------|------|
| `Pin` | `{ id, lat, lng, title, color, detail }` | マップピンデータ |

#### `apps/mobile/components/AlertModal.tsx`

| コンポーネント | Props | 説明 |
|-------------|-------|------|
| `AlertModal` | `{ visible, title, message?, buttons, onDismiss }` | クロスプラットフォームアラートダイアログ |

**Props内型:**

| 型 | フィールド | 説明 |
|-----|-----------|------|
| `AlertButton` | `{ text: string, onPress?: () => void, style?: "default" \| "cancel" \| "destructive" }` | アラートボタン定義 |

### 4.2 管理画面サブコンポーネント

#### `apps/backend/src/app/admin/tours/[tourId]/components/`

| コンポーネント | ファイル | 説明 |
|-------------|--------|------|
| `ScheduleManager` | `ScheduleManager.tsx` | CapacityRule・CloseOut・スケジュール管理のタブコンテナ |
| `CapacityRuleForm` | `CapacityRuleForm.tsx` | 可能枠ルール作成フォーム（WEEKLY/RANGE/SINGLE/YEARLY） |
| `MonthlyCalendar` | `MonthlyCalendar.tsx` | 月間カレンダー表示（空き/一部/満席の色分け+スロット情報） |
| `CloseOutManager` | `CloseOutManager.tsx` | 除外日時設定モーダル（日単位/時間単位のブロック） |

---

## 5. ページ/画面

### 5.1 管理画面ページ（Backend Next.js）

| ファイル | ページ名 | 説明 |
|--------|---------|------|
| `admin/layout.tsx` | AdminLayout | サイドバーナビ+言語切替+ログアウトのルートレイアウト |
| `admin/page.tsx` | AdminPage | `/admin/bookings` へのリダイレクト |
| `admin/login/page.tsx` | AdminLoginPage | 管理者ログインフォーム |
| `admin/bookings/page.tsx` | AdminBookingsPage | 予約一覧（ステータスフィルタタブ） |
| `admin/bookings/[bookingId]/page.tsx` | AdminBookingDetailPage | 予約詳細+ガイドアサインモーダル+辞退理由 |
| `admin/tours/page.tsx` | AdminToursPage | ツアー管理一覧（検索・作成モーダル） |
| `admin/tours/[tourId]/page.tsx` | AdminTourDetailPage | ツアー詳細編集（基本情報・スケジュール・料金・メディア） |
| `admin/guides/page.tsx` | AdminGuidesPage | ガイド一覧+作成モーダル（名前・メール・言語・エリア） |
| `admin/spots/page.tsx` | AdminSpotsPage | スポット管理（バイリンガル名・座標） |
| `admin/spots/[spotId]/page.tsx` | AdminSpotDetailPage | スポット詳細編集+メディア管理+地図表示 |
| `admin/media/page.tsx` | AdminMediaPage | メディアライブラリ（ドラッグ&ドロップアップロード・グリッド表示・紐付け追跡） |

### 5.2 モバイル画面（Expo Router）

| ファイル | 画面名 | 説明 |
|--------|--------|------|
| `app/_layout.tsx` | RootLayout | ルートStackレイアウト+i18next初期化+AlertProvider |
| `app/(tabs)/_layout.tsx` | TabLayout | ボトムタブナビ（Map/List/Bookings）+ロゴヘッダー+通知バッジ |
| `app/(tabs)/index.tsx` | MapScreen | 地図画面（プリセットロケーション検索・ステータス色分けピン） |
| `app/(tabs)/list.tsx` | ListScreen | ツアーリスト（サムネイル・料金・所要時間・距離） |
| `app/(tabs)/bookings.tsx` | BookingsScreen | 予約一覧（メール検索・AsyncStorage保存） |
| `app/tour/[tourId].tsx` | TourDetailScreen | ツアー詳細+画像+スケジュール選択+予約フォーム |
| `app/booking/[bookingId].tsx` | BookingDetailScreen | 予約詳細+ステータス+ガイド情報+キャンセル |
| `app/notifications.tsx` | NotificationsScreen | 通知一覧（未読バッジ・種別アイコン） |

### 5.3 ガイドページ（Backend Next.js）

| ファイル | ページ名 | 説明 |
|--------|---------|------|
| `guide/login/page.tsx` | GuideLoginPage | ガイドログインフォーム |
| `guide/assignments/[assignmentId]/page.tsx` | GuideAssignmentDetailPage | アサイン詳細+承諾/辞退アクション |
