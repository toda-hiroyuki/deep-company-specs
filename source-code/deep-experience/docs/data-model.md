# DeepExperience データモデル定義

DeepExperienceのデータモデルは Prisma ORM で定義されている（開発: SQLite / 本番: PostgreSQL）。
スキーマ定義: `apps/backend/prisma/schema.prisma`

## テーブル一覧

全18モデルをドメインごとに分類。

| # | ドメイン | テーブル数 | 主要テーブル |
|---|----------|-----------|-------------|
| 1 | ユーザー・認証 | 2 | Admin, Guide |
| 2 | ツアー商品 | 3 | Tour, Spot, PricingCategory |
| 3 | 料金 | 2 | Rate, RatePrice |
| 4 | スケジュール・空き状況 | 3 | CapacityRule, CloseOut, TourSchedule |
| 5 | 予約 | 3 | Booking, BookingPassenger, GuideAssignment |
| 6 | 通知 | 1 | Notification |
| 7 | メディア | 3 | Media, TourMedia, SpotMedia |
| 8 | 運用ログ | 1 | JobExecutionLog |

---

## ユーザー・認証

### Admin

管理者アカウント。JWT認証でAdmin APIへのアクセスに使用。

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| id | String | PK, cuid() | |
| email | String | unique | ログインメール |
| passwordHash | String | required | bcryptハッシュ |
| name | String | required | 表示名 |
| createdAt | DateTime | default(now()) | |

### Guide

ツアーガイド。JWT認証でGuide APIへのアクセスに使用。

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| id | String | PK, cuid() | |
| email | String | unique | ログインメール |
| passwordHash | String | required | bcryptハッシュ |
| name | String | required | 表示名 |
| profileImageUrl | String? | nullable | プロフィール画像URL |
| bio | String? | nullable | 自己紹介 |
| languages | String | default("[]") | 対応言語 (JSON: `string[]` 例: `["ja","en"]`) |
| areas | String | default("[]") | 対応エリア (JSON: `string[]` 例: `["Shibuya","Shinjuku"]`) |
| isActive | Boolean | default(true) | 有効フラグ |
| createdAt | DateTime | default(now()) | |
| updatedAt | DateTime | @updatedAt | |

**リレーション**: Guide →(1:N)→ GuideAssignment

---

## ツアー商品

### Spot

施設・スポット。ツアーの訪問先や集合場所の物理的な場所。

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| id | String | PK, cuid() | |
| name | String | required | 名称（日本語） |
| nameEn | String | default("") | 名称（英語） |
| description | String | default("") | 説明（日本語） |
| descriptionEn | String | default("") | 説明（英語） |
| imageUrls | String | default("[]") | 画像URL群 (JSON: `string[]`) |
| lat | Float | required | 緯度 |
| lng | Float | required | 経度 |
| locationName | String | default("") | 所在地名 |
| category | String | default("") | カテゴリ |
| contactEmail | String? | nullable | 連絡先メール |
| contactPhone | String? | nullable | 連絡先電話 |
| isActive | Boolean | default(true) | 有効フラグ |
| createdAt | DateTime | default(now()) | |
| updatedAt | DateTime | @updatedAt | |

**リレーション**: Spot →(1:N)→ Tour, Spot →(1:N)→ SpotMedia

### Tour

ツアー商品。バイリンガル対応、Bokun OTA Hub互換フィールドを含む。

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| id | String | PK, cuid() | |
| title | String | required | タイトル（日本語） |
| titleEn | String | required | タイトル（英語） |
| description | String | required | 説明（日本語） |
| descriptionEn | String | required | 説明（英語） |
| imageUrls | String | default("[]") | レガシー画像URL (JSON: `string[]`、TourMediaへ移行中) |
| meetingPointLat | Float | required | 集合地点 緯度 |
| meetingPointLng | Float | required | 集合地点 経度 |
| meetingPointName | String | required | 集合地点名 |
| durationMinutes | Int | required | 所要時間（分） |
| pricePerPersonCents | Int | required | **DEPRECATED**: Rate+RatePriceに移行済。マイグレーション用に残存 |
| maxParticipants | Int | required | 最大参加者数 |
| tourType | String | default("GROUP") | `GROUP` \| `PRIVATE` |
| category | String | required | カテゴリ（例: "Culture", "Food"） |
| bookingType | String | default("DATE_AND_TIME") | `DATE_AND_TIME` \| `DATE` \| `PASS` (Bokun互換) |
| meetingType | String | default("MEET_ON_LOCATION") | `MEET_ON_LOCATION` \| `PICK_UP` \| `MEET_ON_LOCATION_OR_PICK_UP` |
| ticketSupport | String | default("NOT_REQUIRED") | `PER_PERSON` \| `PER_BOOKING` \| `NOT_REQUIRED` |
| capacityModel | String | default("LIMITED") | `FREE_SALE` \| `LIMITED` \| `ON_REQUEST` |
| dailyCapacity | Int? | nullable | 日単位在庫上限（人/日）。null=無制限。集計対象は `status IN (PENDING, CONFIRMED, IN_PROGRESS, COMPLETED)` の予約人数合計（CANCELLED / EXPIRED は除外）[^tour-inventory] |
| maxDeparturesPerDay | Int? | nullable | 1日あたり催行回数上限。null=無制限。カウント対象は `status != CANCELLED` のTourSchedule件数（FULL / COMPLETED も含む）[^tour-inventory] |
| bookingCutoffMinutes | Int? | nullable | 予約受付締切（出発時刻の何分前まで受付可）。null=締切なし。判定基準は `TourSchedule.startDateTime`（UTC）と現在時刻のUTC差分[^tour-inventory] |
| freeCancellationDeadlineHours | Int? | nullable | 無料キャンセル期限（出発時刻の何時間前まで無料）。null=常に有料キャンセル。判定基準は `TourSchedule.startDateTime`（UTC）と現在時刻のUTC差分。MVPはTour単位（将来Rate単位化を別Issueで検討）[^tour-inventory] |
| spotId | String? | FK→Spot, nullable | 関連スポット |
| area | String | default("") | エリア |
| areaDetail | String | default("") | エリア詳細 |
| cancellationPolicy | String | default("") | キャンセルポリシー |
| paymentMethod | String | default("ON_SITE") | `ON_SITE` \| `ONLINE` \| `BOTH` |
| supportedLanguages | String | default('["ja","en"]') | 対応言語 (JSON: `string[]`) |
| highlightsJa | String | default("") | ハイライト（日本語） |
| highlightsEn | String | default("") | ハイライト（英語） |
| inclusionsJa | String | default("") | 含まれるもの（日本語） |
| inclusionsEn | String | default("") | 含まれるもの（英語） |
| importantNotesJa | String | default("") | 重要事項（日本語） |
| importantNotesEn | String | default("") | 重要事項（英語） |
| bookingNotesJa | String | default("") | 予約時注意（日本語） |
| bookingNotesEn | String | default("") | 予約時注意（英語） |
| meetingPointDescJa | String | default("") | 集合地点説明（日本語） |
| meetingPointDescEn | String | default("") | 集合地点説明（英語） |
| accessInfoJa | String | default("") | アクセス情報（日本語） |
| accessInfoEn | String | default("") | アクセス情報（英語） |
| tags | String | default("[]") | タグ (JSON: `string[]`) |
| isActive | Boolean | default(true) | 有効フラグ |
| createdAt | DateTime | default(now()) | |
| updatedAt | DateTime | @updatedAt | |

**インデックス**: `@@index([spotId])`

**リレーション**:
- Tour →(N:1)→ Spot (nullable)
- Tour →(1:N)→ TourSchedule
- Tour →(1:N)→ PricingCategory
- Tour →(1:N)→ Rate
- Tour →(1:N)→ CapacityRule
- Tour →(1:N)→ CloseOut
- Tour →(1:N)→ TourMedia

### PricingCategory

参加者区分（大人/子供/幼児）。ツアーごとに定義。

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| id | String | PK, cuid() | |
| tourId | String | FK→Tour, required | |
| label | String | required | 英語ラベル（"Adult", "Child", "Infant"） |
| labelJa | String | default("") | 日本語ラベル（"大人", "子供", "幼児"） |
| minAge | Int? | nullable | 最小年齢 |
| maxAge | Int? | nullable | 最大年齢 |
| sortOrder | Int | default(0) | 表示順 |
| isDefault | Boolean | default(false) | デフォルト区分フラグ |
| createdAt | DateTime | default(now()) | |

**インデックス**: `@@index([tourId])`

**リレーション**: PricingCategory →(1:N)→ RatePrice, PricingCategory →(1:N)→ BookingPassenger

---

## 料金

### Rate

料金プラン（通常料金/早割/団体割引等）。ツアーごとに複数定義可。

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| id | String | PK, cuid() | |
| tourId | String | FK→Tour, required | |
| label | String | required | 英語ラベル（"Standard", "Early Bird"） |
| labelJa | String | default("") | 日本語ラベル（"通常料金", "早割"） |
| isDefault | Boolean | default(false) | デフォルト料金プランフラグ |
| minPerBooking | Int? | nullable | 1予約あたり最少人数 |
| maxPerBooking | Int? | nullable | 1予約あたり最大人数 |
| validFrom | DateTime? | nullable | 有効期間開始 |
| validTo | DateTime? | nullable | 有効期間終了 |
| isActive | Boolean | default(true) | 有効フラグ |
| createdAt | DateTime | default(now()) | |

**インデックス**: `@@index([tourId])`

**リレーション**: Rate →(1:N)→ RatePrice, Rate →(1:N)→ Booking

### RatePrice

Rate × PricingCategory のクロステーブル。区分別料金を定義。

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| id | String | PK, cuid() | |
| rateId | String | FK→Rate, required | |
| pricingCategoryId | String | FK→PricingCategory, required | |
| priceCents | Int | required | 料金（USDセント） |

**制約**: `@@unique([rateId, pricingCategoryId])`
**インデックス**: `@@index([rateId])`, `@@index([pricingCategoryId])`

---

## スケジュール・空き状況

### CapacityRule

繰り返しスケジュールルール（可能枠ルール）。ツアーの定期的な出発スケジュールを定義。

**注**: Prismaモデル名は `CapacityRule` だが、DBテーブル名は `AvailabilityRule`（`@@map("AvailabilityRule")`）。

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| id | String | PK, cuid() | |
| tourId | String | FK→Tour, required | |
| ruleType | String | required | `WEEKLY` \| `YEARLY` \| `RANGE` \| `SINGLE` |
| daysOfWeek | String | default("[]") | 対象曜日 (JSON: `number[]` 0=日〜6=土) |
| startDate | DateTime? | nullable | ルール開始日（RANGEタイプ用） |
| endDate | DateTime? | nullable | ルール終了日（RANGEタイプ用、null=無期限） |
| singleDate | DateTime? | nullable | 特定日（SINGLEタイプ用） |
| startTimes | String | default("[]") | 出発時刻群 (JSON: `{hour:number, minute:number}[]`) |
| capacity | Int | required | 1出発あたりの定員 |
| minParticipants | Int | default(1) | 催行最少人数 |
| maxPerBooking | Int? | nullable | 1予約あたり最大人数（null=capacity） |
| minPerBooking | Int | default(1) | 1予約あたり最少人数 |
| priority | Int | default(0) | 優先度（高い値が優先） |
| isActive | Boolean | default(true) | 有効フラグ |
| createdAt | DateTime | default(now()) | |

**インデックス**: `@@index([tourId])`

**ruleType別の使用フィールド:**

| ruleType | daysOfWeek | startDate/endDate | singleDate | 説明 |
|----------|-----------|-------------------|------------|------|
| WEEKLY | 使用 | — | — | 毎週特定曜日に繰り返し |
| RANGE | 使用 | 使用 | — | 期間内の特定曜日のみ |
| SINGLE | — | — | 使用 | 特定の1日のみ |
| YEARLY | — | startDate(月日のみ参照) | — | 毎年同じ月日に繰り返し |

### CloseOut

除外日時。特定の日または時間帯をブロックする例外ルール。

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| id | String | PK, cuid() | |
| tourId | String | FK→Tour, required | |
| date | DateTime | required | 対象日（日付部分のみ使用） |
| startTime | String? | nullable | 対象時刻 (JSON: `{hour:number, minute:number}` \| null=全時間帯ブロック) |
| reason | String? | nullable | 除外理由 |
| createdAt | DateTime | default(now()) | |

**インデックス**: `@@index([tourId])`, `@@index([date])`

### TourSchedule

実際の出発スケジュール。CapacityRuleから自動生成、または手動作成。

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| id | String | PK, cuid() | |
| tourId | String | FK→Tour, required | |
| startDateTime | DateTime | required | 出発日時 |
| endDateTime | DateTime | required | 終了日時 |
| capacity | Int | default(0) | 残席数（予約時にデクリメント） |
| status | String | default("OPEN") | `OPEN` \| `FULL` \| `CANCELLED` \| `COMPLETED` |
| sourceRuleId | String? | nullable | 生成元CapacityRuleのID（null=手動作成） |
| createdAt | DateTime | default(now()) | |

**インデックス**: `@@index([tourId])`, `@@index([startDateTime])`, `@@index([status])`

**リレーション**: TourSchedule →(1:N)→ Booking

**注意**: `sourceRuleId` はCapacityRuleへの論理的な参照だが、Prisma上でFKリレーションは定義されていない（文字列フィールドのみ）。CapacityRule削除時にTourScheduleは影響を受けない。

---

## 予約

### Booking

予約レコード。ゲスト（Traveler）はアカウント不要、メールアドレスで管理。

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| id | String | PK, cuid() | |
| tourScheduleId | String | FK→TourSchedule, required | |
| rateId | String? | FK→Rate, nullable | 適用料金プラン（null=レガシー予約） |
| travelerName | String | required | 旅行者名 |
| travelerEmail | String | required | 旅行者メール |
| travelerPhone | String? | nullable | 旅行者電話 |
| travelerNationality | String? | nullable | 国籍（ISO 3166-1 alpha-2） |
| travelerLanguage | String? | nullable | 言語（ISO 639-1） |
| numberOfGuests | Int | required | **DEPRECATED**: passengersに移行。マイグレーション用に残存 |
| totalPriceCents | Int | default(0) | 合計金額（USDセント） |
| specialRequests | String? | nullable | 特別リクエスト |
| status | String | default("PENDING") | `PENDING` \| `CONFIRMED` \| `CANCELLED` \| `IN_PROGRESS` \| `COMPLETED` \| `EXPIRED` |
| assignmentState | String | default("TENTATIVE") | `TENTATIVE` \| `FINALIZED`（Issue #5）。サービス層で遷移制御。DB制約は意図的に追加しない。既存行はマイグレーションで `FINALIZED` に更新済み |
| bookingSource | String | default("DIRECT") | `DIRECT` \| `OTA` \| `AGENT` |
| bookingChannel | String? | nullable | チャネル識別子（"deepex", "viator", "klook"） |
| externalBookingId | String? | nullable | 外部システム予約ID |
| confirmationCode | String? | nullable | 予約確認コード |
| cancelledAt | DateTime? | nullable | キャンセル日時 |
| createdAt | DateTime | default(now()) | |
| updatedAt | DateTime | @updatedAt | |

**インデックス**: `@@index([tourScheduleId])`, `@@index([travelerEmail])`, `@@index([status])`

**リレーション**:
- Booking →(N:1)→ TourSchedule
- Booking →(N:1)→ Rate (nullable)
- Booking →(1:N)→ GuideAssignment
- Booking →(1:N)→ BookingPassenger
- Booking →(1:N)→ Notification

### BookingPassenger

予約内の個別参加者。区分別料金を保持。

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| id | String | PK, cuid() | |
| bookingId | String | FK→Booking, required | |
| pricingCategoryId | String | FK→PricingCategory, required | |
| firstName | String | required | 名 |
| lastName | String | required | 姓 |
| priceCents | Int | required | この参加者の料金（USDセント） |

**インデックス**: `@@index([bookingId])`

### GuideAssignment

ガイドのアサイン状態。1予約に複数ガイドをアサイン可能（辞退→再アサイン）。

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| id | String | PK, cuid() | |
| bookingId | String | FK→Booking, required | |
| guideId | String | FK→Guide, required | |
| status | String | default("PENDING") | `PENDING` \| `ACCEPTED` \| `DECLINED` |
| declineReason | String? | nullable | 辞退理由 |
| assignedAt | DateTime | default(now()) | アサイン日時 |
| respondedAt | DateTime? | nullable | 応答日時 |

**インデックス**: `@@index([bookingId])`, `@@index([guideId])`, `@@index([status])`

---

## 通知

### Notification

システム通知。メールアドレスベースの宛先（ユーザーテーブルとは独立）。

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| id | String | PK, cuid() | |
| recipientEmail | String | required | 宛先メール |
| bookingId | String? | FK→Booking, nullable | 関連予約 |
| type | String | required | 通知種別（例: `BOOKING_CONFIRMED`, `GUIDE_DECLINED`） |
| titleEn | String | required | タイトル（英語） |
| messageEn | String | required | 本文（英語） |
| isRead | Boolean | default(false) | 既読フラグ |
| readAt | DateTime? | nullable | 既読日時 |
| createdAt | DateTime | default(now()) | |

**インデックス**: `@@index([recipientEmail])`, `@@index([createdAt])`, `@@index([bookingId])`

---

## メディア

### Media

画像ファイル管理。アップロード時にサムネイルを自動生成。

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| id | String | PK, cuid() | |
| filename | String | required | 元ファイル名 |
| originalUrl | String | required | フルサイズ画像URL |
| thumbnailUrl | String | required | サムネイルURL |
| mimeType | String | required | MIMEタイプ（例: "image/jpeg"） |
| sizeBytes | Int | required | ファイルサイズ（バイト） |
| width | Int? | nullable | 画像幅（px） |
| height | Int? | nullable | 画像高さ（px） |
| alt | String | default("") | alt テキスト |
| createdAt | DateTime | default(now()) | |
| updatedAt | DateTime | @updatedAt | |

**リレーション**: Media →(1:N)→ TourMedia, Media →(1:N)→ SpotMedia

### TourMedia

Tour × Media の中間テーブル。表示順あり。

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| id | String | PK, cuid() | |
| tourId | String | FK→Tour, required | |
| mediaId | String | FK→Media, required | |
| sortOrder | Int | default(0) | 表示順 |

**制約**: `@@unique([tourId, mediaId])`
**インデックス**: `@@index([tourId])`, `@@index([mediaId])`
**カスケード**: `onDelete: Cascade`（Tour側）— Tour削除時にTourMediaも削除

### SpotMedia

Spot × Media の中間テーブル。表示順あり。

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| id | String | PK, cuid() | |
| spotId | String | FK→Spot, required | |
| mediaId | String | FK→Media, required | |
| sortOrder | Int | default(0) | 表示順 |

**制約**: `@@unique([spotId, mediaId])`
**インデックス**: `@@index([spotId])`, `@@index([mediaId])`
**カスケード**: `onDelete: Cascade`（Spot側）— Spot削除時にSpotMediaも削除

---

## 運用ログ

### JobExecutionLog

バッチ／遅延ジョブの実行記録。`FINALIZE_BOOKINGS` を皮切りに Phase 1 以降の他ジョブでも共有する独立テーブル。

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|------|------|
| id | String | PK, cuid() | |
| jobName | String | required | 例: `FINALIZE_BOOKINGS` |
| status | String | default("RUNNING") | `RUNNING` \| `SUCCESS` \| `FAILED` |
| startedAt | DateTime | default(now()) | 実行開始時刻 |
| finishedAt | DateTime? | nullable | 完了時刻（成功/失敗時に記録） |
| processedCount | Int? | nullable | 正常処理件数 |
| warnCount | Int? | nullable | WARN件数（例: FINALIZE 対象外の null 設定ツアー予約） |
| errorMessage | String? | nullable | 失敗時のメッセージ（2000文字でトリム） |
| payload | String? | nullable | JSON文字列。識別子のみ保存（PII 非含有） |

**インデックス**: `@@index([jobName])`, `@@index([startedAt])`

**リレーション**: なし（独立テーブル）

**保存規約**: `payload` は bookingId 等の ID 配列に限る。traveler 情報など個人特定情報は保存しない（business-rules.md §7.8）。

---

## カスケード削除

### Tour を削除した場合

```
Tour
├── TourMedia          → Cascade削除（onDelete: Cascade）
├── TourSchedule       → 削除ブロック（暗黙のRestrict）
│   └── Booking        → 削除ブロック
│       ├── BookingPassenger  → 削除ブロック
│       ├── GuideAssignment   → 削除ブロック
│       └── Notification      → 削除ブロック
├── PricingCategory    → 削除ブロック
│   ├── RatePrice      → 削除ブロック
│   └── BookingPassenger → 削除ブロック
├── Rate               → 削除ブロック
│   ├── RatePrice      → 削除ブロック
│   └── Booking        → FK null化されない（ブロック）
├── CapacityRule       → 削除ブロック
└── CloseOut           → 削除ブロック
```

**結論**: 予約・スケジュールが存在するTourは削除不可。TourMediaのみCascade削除。安全にTourを無効化するには `isActive = false` を使用。

### Spot を削除した場合

```
Spot
├── SpotMedia          → Cascade削除（onDelete: Cascade）
└── Tour.spotId        → 削除ブロック（FK制約、nullableだがRestrict）
```

**結論**: Tourが参照しているSpotは削除不可。先にTour.spotIdをnullにする必要あり。

### Booking を削除した場合

```
Booking
├── BookingPassenger   → 削除ブロック（暗黙のRestrict）
├── GuideAssignment    → 削除ブロック
└── Notification       → 削除ブロック
```

**結論**: 関連レコードがあるBookingは直接削除不可。

### Media を削除した場合

```
Media
├── TourMedia          → 削除ブロック（暗黙のRestrict）
└── SpotMedia          → 削除ブロック（暗黙のRestrict）
```

**結論**: TourMediaまたはSpotMediaで参照されているMediaは削除不可。先にリレーションを削除する必要あり。

---

## リレーションの特殊パターン

### Nullable外部キー

| テーブル.フィールド | 参照先 | 理由 |
|-------------------|--------|------|
| Tour.spotId | Spot | ツアーがSpotに紐付かない場合あり |
| Booking.rateId | Rate | レガシー予約（Rate導入前の予約）はnull |
| Notification.bookingId | Booking | 予約に紐付かないシステム通知の可能性 |
| TourSchedule.sourceRuleId | — (FK定義なし) | 生成元CapacityRuleの参照。Prisma上FKリレーション未定義 |

### 複合ユニーク制約

| テーブル | カラム | 意味 |
|---------|--------|------|
| RatePrice | `[rateId, pricingCategoryId]` | 同一Rate内で1カテゴリ1料金 |
| TourMedia | `[tourId, mediaId]` | 同一画像を同一ツアーに重複登録不可 |
| SpotMedia | `[spotId, mediaId]` | 同一画像を同一スポットに重複登録不可 |

### JSONフィールド

SQLiteがネイティブ配列をサポートしないため、JSON文字列として格納。API応答時にパース。

| テーブル | フィールド | 型 | 内容 | 例 |
|---------|-----------|-----|------|-----|
| Tour | imageUrls | `string[]` | レガシー画像URL群 | `["https://...jpg"]` |
| Tour | supportedLanguages | `string[]` | 対応言語コード | `["ja","en"]` |
| Tour | tags | `string[]` | 検索用タグ | `["culture","walking"]` |
| Spot | imageUrls | `string[]` | レガシー画像URL群 | `["https://...jpg"]` |
| Guide | languages | `string[]` | 対応言語コード | `["ja","en","zh"]` |
| Guide | areas | `string[]` | 対応エリア名 | `["Shibuya","Asakusa"]` |
| CapacityRule | daysOfWeek | `number[]` | 対象曜日（0=日〜6=土） | `[1,2,3,4,5]` |
| CapacityRule | startTimes | `{hour,minute}[]` | 出発時刻 | `[{"hour":10,"minute":0}]` |
| CloseOut | startTime | `{hour,minute}\|null` | 除外時刻（null=全日） | `{"hour":14,"minute":30}` |

### Enum値一覧（文字列カラム）

SQLiteはネイティブEnumをサポートしないため、Stringフィールドにアプリケーションレベルで制約。

| フィールド | 取りうる値 |
|-----------|-----------|
| Tour.tourType | `GROUP`, `PRIVATE` |
| Tour.bookingType | `DATE_AND_TIME`, `DATE`, `PASS` |
| Tour.meetingType | `MEET_ON_LOCATION`, `PICK_UP`, `MEET_ON_LOCATION_OR_PICK_UP` |
| Tour.ticketSupport | `PER_PERSON`, `PER_BOOKING`, `NOT_REQUIRED` |
| Tour.capacityModel | `FREE_SALE`, `LIMITED`, `ON_REQUEST` |
| Tour.paymentMethod | `ON_SITE`, `ONLINE`, `BOTH` |
| CapacityRule.ruleType | `WEEKLY`, `YEARLY`, `RANGE`, `SINGLE` |
| TourSchedule.status | `OPEN`, `FULL`, `CANCELLED`, `COMPLETED` |
| Booking.status | `PENDING`, `CONFIRMED`, `CANCELLED`, `IN_PROGRESS`, `COMPLETED`, `EXPIRED` |
| Booking.bookingSource | `DIRECT`, `OTA`, `AGENT` |
| GuideAssignment.status | `PENDING`, `ACCEPTED`, `DECLINED` |

### DBテーブル名マッピング

| Prismaモデル名 | DBテーブル名 | 備考 |
|---------------|-------------|------|
| CapacityRule | AvailabilityRule | `@@map("AvailabilityRule")` でリネーム。マイグレーション互換性のため |
| その他全モデル | モデル名と同一 | マッピングなし |

---

## 設計上の注意点

1. **旅行者はエンティティ化しない（Phase 0）**: ゲスト予約のため、旅行者情報はBookingに直接埋め込み。Phase 1でアカウント機能追加時にTravelerテーブルを検討

2. **GuideAssignmentを中間テーブルにする理由**: 1予約に対してガイドA→辞退→ガイドB→承諾という履歴を保持。将来の自動マッチング時のオファー記録にも対応

3. **TourとTourScheduleの分離**: 同じツアー商品を異なる日時で繰り返し開催可能。ツアー情報の重複回避

4. **DEPRECATEDフィールド**:
   - `Tour.pricePerPersonCents` → Rate + RatePrice による柔軟な料金体系に移行
   - `Booking.numberOfGuests` → BookingPassenger による個別参加者管理に移行
   - いずれもマイグレーション互換性のため残存

5. **通貨はUSD（セント単位）**: `priceCents` / `totalPriceCents` 等、全料金フィールドはUSDセント（例: $30.00 = 3000）

6. **Bokun互換フィールド**: `bookingType`, `meetingType`, `ticketSupport`, `capacityModel`, `bookingSource`, `bookingChannel`, `externalBookingId` は将来のOTA Hub連携に向けた事前定義

[^tour-inventory]: Deep在庫モデルMVP（Issue #1）で追加。判定ロジック本体は後続Issueで実装。時刻計算はDB値・サービス層ともUTC基準で統一し、JST/現地時刻への変換は管理画面UI層で行う。
