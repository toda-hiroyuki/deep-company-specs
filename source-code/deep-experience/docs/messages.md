# DeepExperience メッセージ管理表

## i18n情報

- **i18nライブラリ**: i18next + react-i18next
- **翻訳ソース**: `packages/i18n/src/resources.ts`（インライン定義。`locales/*.json` は廃止済み）
- **対応言語**: English (en), 日本語 (ja)
- **ネームスペース**: common, mobile, admin
- **フォールバック言語**: English

## エラーメッセージのローカライズ規約

サーバ API が `error.code` を返すエラーは **クライアント側で code → i18n キー** で翻訳する。
サーバはユーザー向け文言を持たず、コードと debug 用 message のみ返す。

- 共通の例外型: `lib/api-error.ts` の `ApiError`（`apiFetch` / `guestFetch` / 管理画面 `authFetch` がスロー）
- ヘルパ: `localizeApiError(err, keyPrefix, t, fallback)` — code が未翻訳なら `err.message`、それも無ければ `fallback`
- 例: 予約失敗系は `guest.bookingErrors.<CODE>` 配下（[BookingRejectionReason](../apps/backend/src/lib/capacity/types.ts) の8コードと1対1）

---

## メッセージ一覧

### common ネームスペース

| Key | EN | JA |
|-----|----|----|
| active | Active | 有効 |
| add | Add | 追加 |
| back | Back | 戻る |
| cancel | Cancel | キャンセル |
| create | Create | 作成 |
| delete | Delete | 削除 |
| error | Error | エラー |
| go | Go | 検索 |
| inactive | Inactive | 無効 |
| loading | Loading... | 読み込み中... |
| no | No | いいえ |
| perPerson | / person | / 人 |
| save | Save | 保存 |
| search | Search | 検索 |
| status.cancelled | Cancelled | キャンセル済み |
| status.completed | Completed | 完了 |
| status.confirmed | Confirmed | 確定済み |
| status.expired | Expired | 期限切れ |
| status.inProgress | Tour in progress | ツアー中 |
| status.pending | Waiting for guide | ガイド待ち |
| status.accepted | Accepted | 承諾済み |
| status.declined | Declined | 辞退 |
| status.full | Full | 満席 |
| status.open | Open | 受付中 |
| tourType.group | Group | グループ |
| tourType.private | Private | プライベート |
| yes | Yes | はい |

### guest.tourDetail / guest.bookingErrors（common.guest 配下）

| Key | EN | JA |
|-----|----|----|
| guest.tourDetail.bookingFailed | Booking failed. Please try again. | 予約に失敗しました。もう一度お試しください。 |
| guest.tourDetail.gallery | Photos | 写真 |
| guest.bookingErrors.SCHEDULE_CLOSED_OUT | This date/time is closed for bookings. | この日時は予約を受け付けていません。 |
| guest.bookingErrors.TIME_SLOT_FULL | This time slot is full. | この時間帯は満席です。 |
| guest.bookingErrors.DAILY_CAPACITY_EXCEEDED | The daily capacity for this tour is full. | 本日の在庫枠は満席です。 |
| guest.bookingErrors.MAX_DEPARTURES_EXCEEDED | The maximum number of tours for this day has been reached. | 本日の催行上限に達しました。 |
| guest.bookingErrors.MIN_PARTICIPANTS_NOT_MET | Minimum participant count is not met. | 最少催行人数に達していません。 |
| guest.bookingErrors.MAX_PARTICIPANTS_EXCEEDED | The requested guest count exceeds the allowed maximum. | ご指定の人数は最大定員を超えています。 |
| guest.bookingErrors.BOOKING_CUTOFF_EXCEEDED | Bookings for this departure are closed (cutoff time passed). | この催行回の予約受付は締め切られました。 |
| guest.bookingErrors.DEPARTURE_FINALIZED | New departures cannot be created after the free-cancellation deadline. | 無料キャンセル締切後のため、新しい催行回は作成できません。 |

### mobile ネームスペース

| Key | EN | JA |
|-----|----|----|
| booking.cancelBooking | Cancel Booking | 予約をキャンセル |
| booking.cancelFailed | Cancel failed | キャンセルに失敗しました |
| booking.confirmCancel | Are you sure? | キャンセルしてもよろしいですか？ |
| booking.guestCount | {{count}} guest | {{count}}名 |
| booking.guestCount_other | {{count}} guests | {{count}}名 |
| booking.guests | Guests | 人数 |
| booking.loadFailed | Failed to load booking | 予約の読み込みに失敗しました |
| booking.meetingPoint | Meeting Point | 集合場所 |
| booking.schedule | Schedule | スケジュール |
| booking.specialRequests | Special Requests | 特別なリクエスト |
| booking.totalPayOnSite | Total (pay on-site) | 合計（現地払い） |
| booking.yesCancel | Yes, cancel | はい、キャンセルします |
| booking.yourGuide | Your Guide | 担当ガイド |
| bookings.emailPlaceholder | Enter your email to find bookings | メールアドレスで予約を検索 |
| bookings.enterEmail | Please enter your email address | メールアドレスを入力してください |
| bookings.guestCount | {{count}} guest | {{count}}名 |
| bookings.guestCount_other | {{count}} guests | {{count}}名 |
| bookings.noBookings | No bookings found | 予約が見つかりません |
| bookings.searchFailed | Failed to search bookings | 予約の検索に失敗しました |
| header.bookingDetails | Booking Details | 予約詳細 |
| header.tourDetails | Tour Details | ツアー詳細 |
| list.durationMin | {{minutes}}min | {{minutes}}分 |
| list.noTours | No tours available nearby | 近くにツアーがありません |
| list.spotsLeft | {{count}} spots left | 残り{{count}}枠 |
| map.kmAway | {{distance}}km away | {{distance}}km先 |
| map.nativeFallback | Map requires a development build. Showing list view. | マップは開発ビルドが必要です。リスト表示に切り替えます。 |
| map.next | Next: | 次回: |
| map.noToursNearby | No tours found nearby | 近くにツアーが見つかりません |
| map.searchPlaceholder | Search: Tokyo Station, Asakusa, Shibuya, or lat,lng | 検索: 東京駅、浅草、渋谷、または緯度,経度 |
| map.spotsCount | {{count}} spots | 残り{{count}}枠 |
| map.spotsLeft | {{count}} spots left | 残り{{count}}枠 |
| map.tourCount | {{count}} tours | {{count}}件のツアー |
| tabs.bookings | Bookings | 予約 |
| tabs.list | List | 一覧 |
| tabs.map | Map | マップ |
| tour.availableTimes | Available Times | 空き時間 |
| tour.bookingFailed | Booking failed | 予約に失敗しました |
| tour.bookingRequested | Booking Requested! | 予約リクエスト完了！ |
| tour.description | Description | 説明 |
| tour.emailLabel | Email * | メールアドレス * |
| tour.emailPlaceholder | john@example.com | taro@example.com |
| tour.fillRequired | Please fill in all required fields | 必須項目をすべて入力してください |
| tour.loadFailed | Failed to load tour | ツアーの読み込みに失敗しました |
| tour.meetingPoint | Meeting Point | 集合場所 |
| tour.nameLabel | Name * | お名前 * |
| tour.namePlaceholder | John Smith | 山田太郎 |
| tour.noSchedules | No available schedules | 利用可能なスケジュールがありません |
| tour.numberOfGuests | Number of Guests | 人数 |
| tour.requestBooking | Request Booking | 予約をリクエスト |
| tour.specialRequests | Special Requests | 特別なリクエスト |
| tour.specialRequestsPlaceholder | Any special requirements... | ご要望をお書きください... |
| tour.total | Total: ${{amount}} (pay on-site) | 合計: ${{amount}}（現地払い） |
| tour.viewBooking | View Booking | 予約を確認 |
| tour.viewDetails | View details → | 詳細を見る → |
| tour.waitingConfirmation | Waiting for guide confirmation. | ガイドの確認をお待ちください。 |
| tour.yourDetails | Your Details | お客様情報 |

### admin ネームスペース

| Key | EN | JA |
|-----|----|----|
| booking.accept | Accept | 承諾 |
| booking.acceptConfirm | Are you sure you want to accept this assignment? | このアサインを承諾しますか？ |
| booking.alreadyAssigned | Already assigned | 割当済み |
| booking.assign | Assign | 割り当てる |
| booking.assignGuide | Assign Guide | ガイドを割り当てる |
| booking.created | Created | 作成日 |
| booking.decline | Decline | 拒否 |
| booking.declineConfirm | Confirm Decline | 拒否を確定 |
| booking.declineReason | Decline Reason | 拒否理由 |
| booking.declineReasonPlaceholder | Enter reason for declining... | 拒否理由を入力... |
| booking.detail | Booking Detail | 予約詳細 |
| booking.guideAssignments | Guide Assignments | ガイド割当 |
| booking.meetingPoint | Meeting Point | 集合場所 |
| booking.noGuides | No guides assigned yet. | まだガイドが割り当てられていません。 |
| booking.selectGuide | Select Guide | ガイド選択 |
| booking.specialRequests | Special Requests | 特別リクエスト |
| bookings.all | All | すべて |
| bookings.date | Date | 日時 |
| bookings.empty | No bookings found. | 予約はありません。 |
| bookings.guide | Guide | ガイド |
| bookings.guests | Guests | 人数 |
| bookings.pending | Pending: {{name}} | 保留中: {{name}} |
| bookings.title | Bookings | 予約一覧 |
| bookings.tour | Tour | ツアー |
| bookings.traveler | Traveler | 旅行者 |
| bookings.unassigned | Unassigned | 未割当 |
| common.active | Active | 有効 |
| common.add | Add | 追加 |
| common.cancel | Cancel | キャンセル |
| common.create | Create | 作成 |
| common.delete | Delete | 削除 |
| common.inactive | Inactive | 無効 |
| common.loading | Loading... | 読み込み中... |
| common.no | No | いいえ |
| common.notConfigured | — (not configured) | — (未設定) |
| common.save | Save | 保存 |
| common.search | Search | 検索 |
| common.status | Status | ステータス |
| common.yes | Yes | はい |
| guideForm.areas | Areas (comma-separated, e.g. asakusa,shibuya) | エリア（カンマ区切り: asakusa,shibuya） |
| guideForm.bio | Bio | 自己紹介 |
| guideForm.create | Create Guide | ガイド作成 |
| guideForm.creating | Creating... | 作成中... |
| guideForm.email | Email | メールアドレス |
| guideForm.languages | Languages (comma-separated, e.g. ja,en) | 言語（カンマ区切り: ja,en） |
| guideForm.name | Name | 名前 |
| guideForm.password | Password | パスワード |
| guideForm.title | New Guide | 新規ガイド |
| guides.active | Active | 有効 |
| guides.areas | Areas | 対応エリア |
| guides.email | Email | メールアドレス |
| guides.languages | Languages | 言語 |
| guides.name | Name | 名前 |
| guides.new | + New Guide | + 新規ガイド |
| guides.title | Guides | ガイド一覧 |
| login.email | Email | メールアドレス |
| login.password | Password | パスワード |
| login.submit | Login | ログイン |
| login.submitting | Logging in... | ログイン中... |
| login.title | Admin Login | 管理者ログイン |
| media.cannotDelete | Cannot delete: linked | リンク中のため削除できません |
| media.createdAt | Created | 作成日 |
| media.deleteConfirm | Delete this media? | この画像を削除しますか？ |
| media.detail | Media Detail | 画像詳細 |
| media.dimensions | Dimensions | サイズ |
| media.dropzone | Drop files here or click to select | ここにファイルをドロップ、またはクリックして選択 |
| media.dropzoneActive | Drop here... | ここにドロップ... |
| media.empty | No media yet. | 画像はまだありません。 |
| media.fileSize | File Size | ファイルサイズ |
| media.gallery | Gallery | 画像・ギャラリー |
| media.linkedSpots | {{count}} spot(s) | スポット{{count}}件 |
| media.linkedSpotsLabel | Linked Spots | 紐付きスポット |
| media.linkedTours | {{count}} tour(s) | ツアー{{count}}件 |
| media.linkedToursLabel | Linked Tours | 紐付きツアー |
| media.noLinks | No links | リンクなし |
| media.selectExisting | Select from library | 既存画像から選択 |
| media.title | Media | 画像管理 |
| media.unlink | Unlink | リンク解除 |
| media.upload | Upload | アップロード |
| media.uploading | Uploading... | アップロード中... |
| nav.bookings | Bookings | 予約管理 |
| nav.guides | Guides | ガイド管理 |
| nav.logout | Logout | ログアウト |
| nav.media | Media | 画像管理 |
| nav.spots | Spots | スポット管理 |
| nav.tours | Tours | ツアー管理 |
| tour.activate | Activate | 有効にする |
| tour.addSchedule | Add Schedule | スケジュール追加 |
| tour.adding | Adding... | 追加中... |
| tour.basicInfo | Basic Info | 基本情報 |
| tour.category | Category | カテゴリ |
| tour.childPrice | Child Price | 子供料金 |
| tour.contactInfo | Contact Info | 連絡先情報 |
| tour.coordinates | Coordinates | 座標 |
| tour.date | Date | 日付 |
| tour.deactivate | Deactivate | 無効にする |
| tour.description | Description | 説明 |
| tour.duration | Duration | 所要時間 |
| tour.durationAuto | Duration: {{min}} min (auto-calculated) | 所要時間: {{min}}分（自動計算） |
| tour.durationUnit | min | 分 |
| tour.edit | Edit | 編集 |
| tour.email | Email | メールアドレス |
| tour.groupDiscount | Group Discount | 団体割引 |
| tour.maxParticipants | Max Participants | 最大定員 |
| tour.meetingPointLocation | Meeting Point / Location | 集合場所 / 所在地 |
| tour.name | Name | 名称 |
| tour.noSchedules | No schedules yet. | スケジュールはまだありません。 |
| tour.notificationEmail | Notification Email | 通知メール |
| tour.participants | {{current}} / {{max}} participants | {{current}} / {{max}} 名 |
| tour.paymentSettings | Payment Settings | 料金設定 |
| tour.phone | Phone | 電話番号 |
| tour.priceCentsUnit | cents | セント |
| tour.pricePerPerson | Price per Person | 1名あたり料金 |
| tour.saved | Saved | 保存しました |
| tour.saving | Saving... | 保存中... |
| tour.schedules | Schedules | スケジュール |
| tour.status | Status | ステータス |
| tour.time | Time | 時間 |
| tour.tourName | Tour Name | ツアー名 |
| tour.type | Type | 種別 |
| tourForm.category | Category | カテゴリ |
| tourForm.create | Create Tour | ツアー作成 |
| tourForm.creating | Creating... | 作成中... |
| tourForm.descEn | Description (EN) | 説明（英語） |
| tourForm.descJp | Description (JP) | 説明（日本語） |
| tourForm.duration | Duration (min) | 所要時間（分） |
| tourForm.lat | Lat | 緯度 |
| tourForm.lng | Lng | 経度 |
| tourForm.maxParticipants | Max Participants | 最大定員 |
| tourForm.meetingPointName | Meeting Point Name | 集合場所名 |
| tourForm.priceCents | Price (cents) | 料金（セント） |
| tourForm.title | New Tour | 新規ツアー |
| tourForm.titleEn | Title (EN) | タイトル（英語） |
| tourForm.titleJp | Title (JP) | タイトル（日本語） |
| tourForm.type | Type | 種別 |
| tours.capacity | Capacity | 定員 |
| tours.category | Category | カテゴリ |
| tours.count | {{filtered}} / {{total}} tours | {{filtered}} / {{total}} 件 |
| tours.csvExport | CSV Export | CSV出力 |
| tours.lastUpdated | Last Updated | 最終更新 |
| tours.meetingPoint | Meeting Point | 集合場所 |
| tours.new | + New Tour | + 新規ツアー |
| tours.no | No | No |
| tours.price | Price | 料金 |
| tours.schedules | Schedules | スケジュール |
| tours.searchPlaceholder | Search by name, category, location... | 名前、カテゴリ、場所で検索... |
| tours.title | Tours | ツアー一覧 |
| tours.tourName | Tour Name | ツアー名 |
| tours.type | Type | 種別 |

---

## i18n管理外のメッセージ

翻訳システムを経由せずハードコードされているメッセージ。主にAPIエラーメッセージと通知テンプレート。

| No | Message | ファイル | 備考 |
|----|---------|---------|------|
| 1 | Assignment already responded | guide/assignments/[id]/accept/route.ts, decline/route.ts | アサイン応答済みエラー (409) |
| 2 | Assignment not found | guide/assignments/[id]/accept/route.ts, decline/route.ts | アサイン未検出エラー (404) |
| 3 | Authentication required | lib/auth.ts | JWT未提供エラー (401) |
| 4 | Booking Confirmed | guide/assignments/[id]/accept/route.ts | 通知タイトル (BOOKING_CONFIRMED) |
| 5 | Booking cannot be cancelled | bookings/[id]/cancel/route.ts | キャンセル不可エラー (409) |
| 6 | Booking is not in CONFIRMED status | guide/bookings/[id]/start/route.ts | ツアー開始ステータスエラー (409) |
| 7 | Booking is not in IN_PROGRESS status | guide/bookings/[id]/complete/route.ts | ツアー完了ステータスエラー (409) |
| 8 | Booking is not in PENDING status | admin/bookings/[id]/assign/route.ts | アサイン前提エラー (409) |
| 9 | Booking not found | bookings/[id]/route.ts, cancel/route.ts, assign/route.ts | 予約未検出エラー (404) |
| 10 | Cannot cancel within 2 hours of tour start | bookings/[id]/cancel/route.ts | 2時間制限エラー (409) |
| 11 | Cannot delete: linked to N tour(s) and N spot(s). Unlink first. | admin/media/[id]/route.ts | メディア削除制約エラー (409) |
| 12 | Capacity rule not found | admin/tours/[id]/capacity-rules/route.ts | ルール未検出エラー (404) |
| 13 | Close-out not found | admin/tours/[id]/close-outs/route.ts | CloseOut未検出エラー (404) |
| 14 | Email and password are required | admin/auth/login/route.ts, guide/auth/login/route.ts | ログインバリデーション (400) |
| 15 | Guide Assignment Update | guide/assignments/[id]/decline/route.ts | 通知タイトル (GUIDE_DECLINED) |
| 16 | Guide not found | admin/bookings/[id]/assign/route.ts, admin/guides/[id]/route.ts | ガイド未検出エラー (404) |
| 17 | Insufficient permissions | lib/auth.ts | ロール不一致エラー (403) |
| 18 | Invalid email or password | admin/auth/login/route.ts, guide/auth/login/route.ts | 認証失敗エラー (401) |
| 19 | Invalid or expired token | lib/auth.ts | JWT無効エラー (401) |
| 20 | Media not found | admin/media/[id]/route.ts, admin/tours/[id]/media/route.ts | メディア未検出エラー (404) |
| 21 | Media not linked to this spot | admin/spots/[id]/media/[mediaId]/route.ts | スポットメディア紐付けエラー (404) |
| 22 | Media not linked to this tour | admin/tours/[id]/media/[mediaId]/route.ts | ツアーメディア紐付けエラー (404) |
| 23 | Notification not found | notifications/[id]/read/route.ts | 通知未検出エラー (404) |
| 24 | Only {{capacity}} spots remaining | bookings/route.ts | 残席不足エラー (409) |
| 25 | Resource not found | lib/response.ts | デフォルト404メッセージ |
| 26 | Schedule not found | admin/schedules/[id]/route.ts, bookings/route.ts | スケジュール未検出エラー (404) |
| 27 | Spot not found | admin/spots/[id]/route.ts, admin/spots/[id]/media/route.ts | スポット未検出エラー (404) |
| 28 | This schedule is full | bookings/route.ts | スケジュール満席エラー (409) |
| 29 | Tour not found | admin/tours/[id]/route.ts, tours/[id]/route.ts 他多数 | ツアー未検出エラー (404) |
| 30 | Validation failed | lib/response.ts | デフォルトバリデーションエラー (400) |
| 31 | We're finding another guide for your booking for {{tourTitle}}. We'll notify you once confirmed. | guide/assignments/[id]/decline/route.ts | 通知本文 (GUIDE_DECLINED) |
| 32 | Your booking for {{tourTitle}} has been confirmed! | guide/assignments/[id]/accept/route.ts | 通知本文 (BOOKING_CONFIRMED) |

---

## 集計

| 項目 | 数 |
|------|-----|
| i18n管理メッセージ数 (common) | 23 |
| i18n管理メッセージ数 (mobile) | 52 |
| i18n管理メッセージ数 (admin) | 112 |
| i18n管理メッセージ数 合計 | 187 |
| i18n管理外メッセージ数 | 32 |
| 対応言語数 | 2 (en, ja) |
| 合計メッセージ数 | 219 |
