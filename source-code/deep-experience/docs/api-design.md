# API設計（Phase 0）

## 方針

- **フレームワーク**: Next.js App Router（Route Handlers）
- **形式**: REST API（JSON）
- **認証**: ガイド・運営は JWT（Bearer token）、旅行者は認証不要
- **パス規則**: `/api/v1/...`
- **ID形式**: CUID

---

## エンドポイント一覧

```mermaid
flowchart LR
    subgraph 旅行者（認証不要）
        A1[GET /tours/search]
        A2[GET /tours/:id]
        A3[GET /tours/:id/schedules]
        A4[POST /bookings]
        A5[GET /bookings/:id]
        A6[GET /bookings?email=]
        A7[POST /bookings/:id/cancel]
    end

    subgraph ガイド（JWT認証）
        B1[POST /guide/auth/login]
        B2[GET /guide/assignments]
        B3[GET /guide/assignments/:id]
        B4[POST /guide/assignments/:id/accept]
        B5[POST /guide/assignments/:id/decline]
        B6[POST /guide/bookings/:id/start]
        B7[POST /guide/bookings/:id/complete]
        B8[GET /guide/profile]
        B9[PUT /guide/profile]
    end

    subgraph 運営（JWT認証）
        C1[POST /admin/auth/login]
        C2[CRUD /admin/tours]
        C3[CRUD /admin/tours/:id/schedules]
        C4[GET /admin/bookings]
        C5[POST /admin/bookings/:id/assign]
        C6[CRUD /admin/guides]
    end
```

---

## 旅行者向けAPI（認証不要）

### ツアー検索

`GET /api/v1/tours/search`

地図表示・リスト表示用。現在地周辺のツアースケジュールを検索する。

**Query Parameters:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| lat | number | yes | 現在地の緯度 |
| lng | number | yes | 現在地の経度 |
| radiusKm | number | no | 検索半径（km）。デフォルト: 5 |
| category | string | no | カテゴリでフィルタ |
| dateFrom | string (ISO) | no | 開始日時の下限。デフォルト: 現在時刻 |
| dateTo | string (ISO) | no | 開始日時の上限。デフォルト: 3日後 |
| tourType | string | no | GROUP / PRIVATE |
| limit | number | no | 取得件数。デフォルト: 50 |
| offset | number | no | オフセット。デフォルト: 0 |

**Response: 200 OK**

```json
{
  "tours": [
    {
      "id": "tour_abc123",
      "title": "浅草寺周辺散策ツアー",
      "category": "歴史・文化",
      "tourType": "GROUP",
      "meetingPoint": {
        "lat": 35.7148,
        "lng": 139.7967,
        "name": "雷門前"
      },
      "durationMinutes": 120,
      "pricePerPersonCents": 3000,
      "currency": "USD",
      "maxParticipants": 8,
      "imageUrl": "https://...",
      "nextSchedule": {
        "id": "sched_xyz789",
        "startDateTime": "2026-02-26T14:00:00+09:00",
        "endDateTime": "2026-02-26T16:00:00+09:00",
        "remainingSlots": 3,
        "status": "OPEN"
      },
      "schedulesCount": 5,
      "distanceKm": 0.8
    }
  ],
  "total": 24,
  "limit": 50,
  "offset": 0
}
```

### ツアー詳細取得

`GET /api/v1/tours/:tourId`

**Response: 200 OK**

```json
{
  "id": "tour_abc123",
  "title": "浅草寺周辺散策ツアー",
  "description": "浅草寺周辺を地元ガイドと一緒に巡るツアーです...",
  "imageUrls": ["https://...", "https://..."],
  "category": "歴史・文化",
  "tourType": "GROUP",
  "meetingPoint": {
    "lat": 35.7148,
    "lng": 139.7967,
    "name": "雷門前"
  },
  "durationMinutes": 120,
  "pricePerPersonCents": 3000,
  "currency": "USD",
  "maxParticipants": 8
}
```

### ツアー日程一覧

`GET /api/v1/tours/:tourId/schedules`

**Query Parameters:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| dateFrom | string (ISO) | no | デフォルト: 現在時刻 |
| dateTo | string (ISO) | no | デフォルト: 3日後 |
| status | string | no | OPEN / FULL |

**Response: 200 OK**

```json
{
  "schedules": [
    {
      "id": "sched_xyz789",
      "startDateTime": "2026-02-26T14:00:00+09:00",
      "endDateTime": "2026-02-26T16:00:00+09:00",
      "currentParticipants": 5,
      "maxParticipants": 8,
      "remainingSlots": 3,
      "status": "OPEN",
      "isCutoffClosed": false
    }
  ]
}
```

- `isCutoffClosed`: `Tour.bookingCutoffMinutes` に基づくサーバー時刻判定。`(startDateTime - now)/60000 < bookingCutoffMinutes` なら true。`bookingCutoffMinutes=null` の場合は常に false。Traveler クライアントはこのフラグで「受付終了」表示を行う
- 同フィールドは `GET /api/v1/tours/:tourId/availability` の各 slot にも同じ意味で含まれる

### 予約リクエスト作成

`POST /api/v1/bookings`

クライアントは特定の `tourScheduleId` を指定せず、希望のツアーと開始時刻を送信する。サーバが同時刻の既存催行回を探索 → 空きがあれば紐付け、なければ新規催行回を作成 → 予約を仮割当（`assignmentState=TENTATIVE`）で作成する（Issue #5）。

**Request Body:**

```json
{
  "tourId": "tour_abc123",
  "requestedStartDateTime": "2026-02-26T05:00:00Z",
  "travelerName": "John Smith",
  "travelerEmail": "john@example.com",
  "travelerPhone": "+819012345678",
  "numberOfGuests": 2,
  "specialRequests": "車椅子利用あり"
}
```

- `requestedStartDateTime`: UTC ISO 8601（末尾 `Z` または `±HH:MM` 必須、秒・ミリ秒は無視して分精度で比較）

**Response: 201 Created**

```json
{
  "id": "booking_def456",
  "tourScheduleId": "sched_xyz789",
  "scheduleId": "sched_xyz789",
  "assignmentState": "TENTATIVE",
  "assignmentMode": "EXISTING",
  "status": "PENDING",
  "numberOfGuests": 2,
  "totalPriceCents": 6000,
  "currency": "USD",
  "createdAt": "2026-02-25T10:30:00+09:00",
  "tour": {
    "title": "浅草寺周辺散策ツアー",
    "startDateTime": "2026-02-26T14:00:00+09:00",
    "meetingPointName": "雷門前"
  }
}
```

- `assignmentMode` は `"EXISTING"`（既存催行回に紐付け）または `"NEW"`（新規催行回作成）
- `assignmentState` は仮割当中 `"TENTATIVE"`。Issue #8 で確定時に `"FINALIZED"` に遷移

**エラーケース:**
- `400` — バリデーションエラー（必須項目不足、`requestedStartDateTime` の TZ 欠落）
- `404` — ツアー未存在または非アクティブ（`NOT_FOUND`）
- `409` — 自動割当が成立しない場合の詳細コード:
  - `SCHEDULE_CLOSED_OUT` — CloseOut が該当時刻をブロック
  - `MAX_DEPARTURES_EXCEEDED` — その日の催行回上限に到達
  - `DAILY_CAPACITY_EXCEEDED` — その日の日定員に到達
  - `MAX_PARTICIPANTS_EXCEEDED` — 予約人数が単一催行回で受入不可
  - `MIN_PARTICIPANTS_NOT_MET` — CapacityRule の最小人数条件に満たない
  - `BOOKING_CUTOFF_EXCEEDED` — 予約受付締切を過ぎた
  - `TIME_SLOT_FULL` — 候補催行回すべて満席（新規作成も不可の時）
  - `PRIVATE_SCHEDULE_ALREADY_BOOKED` — PRIVATE ツアーで同時刻が既に予約済み

### 予約詳細取得

`GET /api/v1/bookings/:bookingId`

**Response: 200 OK**

```json
{
  "id": "booking_def456",
  "status": "CONFIRMED",
  "travelerName": "John Smith",
  "travelerEmail": "john@example.com",
  "numberOfGuests": 2,
  "specialRequests": "車椅子利用あり",
  "totalPriceCents": 6000,
  "currency": "USD",
  "createdAt": "2026-02-25T10:30:00+09:00",
  "tour": {
    "id": "tour_abc123",
    "title": "浅草寺周辺散策ツアー",
    "imageUrl": "https://..."
  },
  "schedule": {
    "id": "sched_xyz789",
    "startDateTime": "2026-02-26T14:00:00+09:00",
    "endDateTime": "2026-02-26T16:00:00+09:00",
    "meetingPoint": {
      "lat": 35.7148,
      "lng": 139.7967,
      "name": "雷門前"
    }
  },
  "guide": {
    "name": "田中太郎",
    "profileImageUrl": "https://..."
  }
}
```

### 予約一覧取得（メールで検索）

`GET /api/v1/bookings?email=john@example.com`

**Response: 200 OK**

```json
{
  "bookings": [
    {
      "id": "booking_def456",
      "status": "CONFIRMED",
      "numberOfGuests": 2,
      "tour": {
        "title": "浅草寺周辺散策ツアー",
        "imageUrl": "https://..."
      },
      "schedule": {
        "startDateTime": "2026-02-26T14:00:00+09:00",
        "meetingPointName": "雷門前"
      }
    }
  ]
}
```

### 予約キャンセル

`POST /api/v1/bookings/:bookingId/cancel`

**Response: 200 OK**

```json
{
  "id": "booking_def456",
  "status": "CANCELLED",
  "cancelledAt": "2026-02-25T12:00:00+09:00"
}
```

**エラーケース:**
- `400` — キャンセル不可（ツアー開始2時間前を過ぎている）
- `404` — 予約が見つからない

---

## ガイド向けAPI（JWT認証必須）

### ログイン

`POST /api/v1/guide/auth/login`

**Request Body:**

```json
{
  "email": "guide@example.com",
  "password": "password123"
}
```

**Response: 200 OK**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "guide": {
    "id": "guide_ghi789",
    "name": "田中太郎",
    "email": "guide@example.com"
  }
}
```

### アサイン一覧取得

`GET /api/v1/guide/assignments`

**Query Parameters:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| status | string | no | PENDING / ACCEPTED / DECLINED |

**Response: 200 OK**

```json
{
  "assignments": [
    {
      "id": "assign_jkl012",
      "status": "PENDING",
      "assignedAt": "2026-02-25T11:00:00+09:00",
      "booking": {
        "id": "booking_def456",
        "numberOfGuests": 2,
        "status": "PENDING"
      },
      "tour": {
        "title": "浅草寺周辺散策ツアー"
      },
      "schedule": {
        "startDateTime": "2026-02-26T14:00:00+09:00",
        "meetingPointName": "雷門前"
      }
    }
  ]
}
```

### アサイン承認

`POST /api/v1/guide/assignments/:assignmentId/accept`

**Response: 200 OK**

```json
{
  "id": "assign_jkl012",
  "status": "ACCEPTED",
  "respondedAt": "2026-02-25T11:30:00+09:00",
  "booking": {
    "id": "booking_def456",
    "status": "CONFIRMED"
  }
}
```

### アサイン拒否

`POST /api/v1/guide/assignments/:assignmentId/decline`

**Request Body:**

```json
{
  "reason": "その日は別の予定があります"
}
```

**Response: 200 OK**

```json
{
  "id": "assign_jkl012",
  "status": "DECLINED",
  "respondedAt": "2026-02-25T11:30:00+09:00"
}
```

### ツアー開始

`POST /api/v1/guide/bookings/:bookingId/start`

**Response: 200 OK**

```json
{
  "id": "booking_def456",
  "status": "IN_PROGRESS"
}
```

### ツアー完了

`POST /api/v1/guide/bookings/:bookingId/complete`

**Response: 200 OK**

```json
{
  "id": "booking_def456",
  "status": "COMPLETED"
}
```

### プロフィール取得 / 更新

`GET /api/v1/guide/profile`
`PUT /api/v1/guide/profile`

**PUT Request Body:**

```json
{
  "name": "田中太郎",
  "bio": "浅草で10年ガイドをしています",
  "languages": ["ja", "en"],
  "areas": ["asakusa", "ueno"]
}
```

---

## 運営向けAPI（JWT認証必須）

### ログイン

`POST /api/v1/admin/auth/login`

（ガイドログインと同じ形式）

### ツアー商品 CRUD

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/v1/admin/tours` | ツアー一覧 |
| POST | `/api/v1/admin/tours` | ツアー新規作成 |
| GET | `/api/v1/admin/tours/:id` | ツアー詳細 |
| PUT | `/api/v1/admin/tours/:id` | ツアー更新 |
| DELETE | `/api/v1/admin/tours/:id` | ツアー削除（論理削除: isActive=false） |

### ツアー日程 CRUD

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/v1/admin/tours/:tourId/schedules` | 日程一覧（`from`/`to`（JST）・`status`・`zeroBookings` フィルタ、3値定員・予約サマリ） |
| POST | `/api/v1/admin/tours/:tourId/schedules` | 日程追加 |
| GET | `/api/v1/admin/schedules/:id` | 日程詳細（3値定員・予約サマリ） |
| PUT | `/api/v1/admin/schedules/:id` | 日時・定員更新（`status` は PATCH を使用。`status` 同梱は 400） |
| PATCH | `/api/v1/admin/schedules/:id` | ステータス更新専用（`status: "CANCELLED"` のみ。非CANCELLED予約があれば 409 CONFLICT） |
| DELETE | `/api/v1/admin/schedules/:id` | **廃止（410 Gone）**。PATCH での論理無効化を使用 |

### 予約管理

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/v1/admin/bookings` | 予約一覧（ステータスフィルタ可） |
| GET | `/api/v1/admin/bookings/:id` | 予約詳細 |

### ガイドアサイン

`POST /api/v1/admin/bookings/:bookingId/assign`

**Request Body:**

```json
{
  "guideId": "guide_ghi789"
}
```

**Response: 201 Created**

```json
{
  "id": "assign_jkl012",
  "bookingId": "booking_def456",
  "guideId": "guide_ghi789",
  "status": "PENDING",
  "assignedAt": "2026-02-25T11:00:00+09:00"
}
```

### ガイド管理

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/v1/admin/guides` | ガイド一覧 |
| POST | `/api/v1/admin/guides` | ガイド新規登録 |
| GET | `/api/v1/admin/guides/:id` | ガイド詳細（アサイン履歴含む） |
| PUT | `/api/v1/admin/guides/:id` | ガイド情報更新 |

---

## 共通仕様

### エラーレスポンス形式

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "numberOfGuests must be at least 1",
    "details": [
      {
        "field": "numberOfGuests",
        "message": "must be at least 1"
      }
    ]
  }
}
```

### エラーコード一覧

| HTTPステータス | コード | 説明 |
|--------------|--------|------|
| 400 | VALIDATION_ERROR | バリデーションエラー |
| 401 | UNAUTHORIZED | 認証が必要 |
| 403 | FORBIDDEN | 権限不足 |
| 404 | NOT_FOUND | リソースが見つからない |
| 409 | CONFLICT | 競合（定員オーバー等） |
| 500 | INTERNAL_ERROR | サーバーエラー |

### 認証

- ガイド・運営のAPIは `Authorization: Bearer <token>` ヘッダーが必須
- トークンは JWT（有効期限: 7日）
- 旅行者向けAPIは認証不要

### 日時形式

- すべて ISO 8601 形式（タイムゾーン付き）
- 例: `2026-02-26T14:00:00+09:00`

---

## 運用API（ジョブ）

### FINALIZE バッチ起動

```
POST /api/v1/admin/jobs/finalize-bookings
Authorization: Bearer <CRON_SECRET>
```

- 呼出元: Vercel Cron（`vercel.json` の `0 * * * *`）。ローカル/手動起動は `CRON_SECRET` を Bearer で付ければ非 production でも通る
- 動作: `Booking.assignmentState='TENTATIVE'` かつ `Tour.freeCancellationDeadlineHours` が設定され締切経過した予約を `FINALIZED` に更新
- レスポンス（成功時）:

```json
{
  "logId": "clxxx...",
  "status": "SUCCESS",
  "durationMs": 42,
  "processedCount": 3,
  "warnCount": 1
}
```

- エラー: 401 `UNAUTHORIZED`（Bearer 不一致）、500 `JOB_FAILED`（例外時・`logId` 付き）、500 `CRON_SECRET_NOT_CONFIGURED`（production で未設定時）
- 副作用: `JobExecutionLog` に 1 レコード残る（RUNNING → SUCCESS/FAILED）

新規催行回作成に関する `DEPARTURE_FINALIZED` リジェクト理由は `POST /bookings` および `PATCH /admin/bookings/:id/assignment` にて 409 で返る（詳細は business-rules.md §7.8）。
