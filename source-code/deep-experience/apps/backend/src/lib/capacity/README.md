# Booking Acceptance Assessment (`apps/backend/src/lib/capacity`)

予約受入時に「この催行回に載せられるか」を判定する共通サービス。
プライベート（Issue #3）・グループ（Issue #5）・管理画面からの手動予約投入など、
すべての予約経路から呼び出す。

## Public API

```ts
import { assessBookingAcceptance } from "@/lib/capacity";

const result = await assessBookingAcceptance({
  tourId: "tour-123",
  scheduleId: "schedule-456",     // optional. omitted = 新規催行回
  startDateTime: new Date("2026-05-01T01:00:00Z"),
  requestedGuests: 2,
  isNewDeparture: false,          // 既存催行回に乗せる場合は false
  now: new Date(),                // optional (default: new Date())
});

if (!result.ok) {
  console.log("rejected:", result.reason);
}
```

`scheduleId` を省略する場合は `isNewDeparture: true` が必須。矛盾入力は Zod で拒否される。

## Evaluation Order

判定は 1 → 5 の順に実施し、最初にNGとなった理由コードを返す。

| # | 項目 | 理由コード | 参照 |
|---|---|---|---|
| 1 | 時刻枠在庫 (scheduleId 指定時のみ) | `TIME_SLOT_FULL` | `TourSchedule.capacity` |
| 2 | 日在庫 | `DAILY_CAPACITY_EXCEEDED` | `Tour.dailyCapacity` |
| 3 | 催行回数上限 (isNewDeparture=true のみ) | `MAX_DEPARTURES_EXCEEDED` | `Tour.maxDeparturesPerDay` |
| 4 | 最小/最大人数 | `MIN_PARTICIPANTS_NOT_MET` / `MAX_PARTICIPANTS_EXCEEDED` | `Tour.maxParticipants` + `CapacityRule` |
| 5 | 予約受付カットオフ | `BOOKING_CUTOFF_EXCEEDED` | `Tour.bookingCutoffMinutes` |

各 Tour フィールドが `null` の場合は「制約なし」として扱い、その項目の判定はスキップされる。

## Skip 条件一覧

| 状態 | 項目1 | 項目2 | 項目3 | 項目4 | 項目5 |
|---|---|---|---|---|---|
| `isNewDeparture=true` (scheduleId 省略) | skip | 評価 | 評価 | 評価 | 評価 |
| `isNewDeparture=false` (既存催行回) | 評価 | 評価 | skip | 評価 | 評価 |
| 該当 Tour フィールド = null | — | skip | skip | 部分スキップ(※) | skip |
| `CapacityRule` が 0 件 | — | — | — | 部分スキップ(※※) | — |

- ※ `Tour.maxParticipants` は non-nullable なので常に評価される。
- ※※ CapacityRule 由来 (minParticipants / maxPerBooking / minPerBooking) のみスキップ。
  `Tour.maxParticipants` は継続して評価される（運営がルール未登録でも絶対上限は守られる）。

## Participant-Limit Rule Resolution (項目4)

既存催行回 (`scheduleId` 指定) は `TourSchedule.sourceRuleId` が指す CapacityRule を参照。
そのルールが inactive/削除済なら priority 最高の active ルールにフォールバック。
active ルールが 1 件もなければ null (CapacityRule 由来の制約はスキップ)。

## Timezone

- **日境界 (項目2/3)**: `Asia/Tokyo` (`DAILY_AGGREGATION_TIMEZONE`)
- **時刻差分 (項目5)**: UTC 基準の単純減算 (Issue #1 決定事項)

## Data Source Status Filters

- **日在庫・現在人数の集計対象 `Booking.status`**: `OCCUPYING_BOOKING_STATUSES` = PENDING / CONFIRMED / IN_PROGRESS / COMPLETED
  (CANCELLED, EXPIRED は除外)
- **催行回数カウント対象 `TourSchedule.status`**: `ACTIVE_SCHEDULE_STATUSES` = OPEN / FULL / COMPLETED
  (CANCELLED は除外 = キャンセル済み枠は再作成可能)

## File Layout

```
capacity/
├── index.ts                       # Public re-exports
├── assessBookingAcceptance.ts     # Orchestrator
├── fetchContext.ts                # Prisma access layer
├── resolveApplicableRule.ts       # CapacityRule selection
├── checkScheduleCapacity.ts       # 項目1
├── checkDailyCapacity.ts          # 項目2
├── checkDeparturesPerDay.ts       # 項目3
├── checkParticipantLimits.ts      # 項目4
├── checkBookingCutoff.ts          # 項目5
├── timezone.ts                    # JST <-> UTC helpers
├── constants.ts                   # Status filters, TZ id
├── types.ts                       # Reason codes + DTOs
└── __tests__/                     # Vitest unit tests
```
