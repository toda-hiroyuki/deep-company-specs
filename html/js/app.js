'use strict';

/* ===================================================
   MOCK DATA
=================================================== */
const BOOKINGS = [
  { id: 'DE-2026-0524', activity: '京都本格陶芸体験コース', scheduleDate: '2026/05/25 10:00', bookedAt: '2026/05/21 15:23', traveler: '田中 花子',  pax: '大人2名',           total: 7000,  status: 'pending'   },
  { id: 'DE-2026-0523', activity: 'ろくろ体験プレミアムコース',   scheduleDate: '2026/05/24 14:00', bookedAt: '2026/05/21 11:05', traveler: 'Smith, John', pax: '大人1名・子ども1名', total: 9000,  status: 'pending'   },
  { id: 'DE-2026-0522', activity: '京都本格陶芸体験コース', scheduleDate: '2026/05/22 10:00', bookedAt: '2026/05/20 09:40', traveler: '鈴木 一郎',  pax: '大人3名',           total: 10500, status: 'pending'   },
  { id: 'DE-2026-0521', activity: 'ろくろ体験プレミアムコース',   scheduleDate: '2026/05/21 14:00', bookedAt: '2026/05/19 18:22', traveler: '佐藤 美咲',  pax: '大人2名・子ども2名', total: 18000, status: 'confirmed' },
  { id: 'DE-2026-0519', activity: '京都本格陶芸体験コース', scheduleDate: '2026/05/18 10:00', bookedAt: '2026/05/16 14:10', traveler: 'Wang, Li',   pax: '大人4名',           total: 14000, status: 'confirmed' },
  { id: 'DE-2026-0515', activity: 'ろくろ体験プレミアムコース',   scheduleDate: '2026/05/15 14:00', bookedAt: '2026/05/13 10:00', traveler: '高橋 誠',    pax: '大人2名',           total: 11000, status: 'completed' },
  { id: 'DE-2026-0510', activity: '京都本格陶芸体験コース', scheduleDate: '2026/05/10 10:00', bookedAt: '2026/05/08 08:30', traveler: '山本 葵',    pax: '大人2名・子ども1名', total: 9000,  status: 'completed' },
  { id: 'DE-2026-0508', activity: '京都本格陶芸体験コース', scheduleDate: '2026/05/08 10:00', bookedAt: '2026/05/05 20:15', traveler: 'Lee, Jisu',  pax: '大人1名',           total: 3500,  status: 'cancelled' },
];

const CHART_DATA = {
  labels: ['5/16', '5/17', '5/18', '5/19', '5/20', '5/21', '5/22'],
  values: [3,       5,      2,      4,      6,      3,      4     ],
};

const STATUS_LABELS = {
  pending:   { label: '承認待ち', cls: 'pending'   },
  confirmed: { label: '確定',     cls: 'confirmed' },
  completed: { label: '完了',     cls: 'completed' },
  cancelled: { label: 'キャンセル', cls: 'cancelled' },
};

let paymentMonthOffset = 0;


/* ===================================================
   NAVIGATION
=================================================== */
function navigate(screenId) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  const target = document.getElementById('screen-' + screenId);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.screen === screenId);
  });
}

function setupNav() {
  document.querySelectorAll('.nav-item[data-screen]').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      navigate(item.dataset.screen);
    });
  });
}


/* ===================================================
   LOGIN / LOGOUT
=================================================== */
function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  if (!email) {
    showToast('メールアドレスを入力してください', 'danger');
    return;
  }
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  navigate('dashboard');
}

function doLogout() {
  if (!confirm('ログアウトしますか？')) return;
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-page').classList.remove('hidden');
  showLoginForm();
}

function showResetForm() {
  document.getElementById('login-form-section').classList.add('hidden');
  document.getElementById('reset-form-section').classList.remove('hidden');
  document.getElementById('reset-sent-section').classList.add('hidden');
}

function showLoginForm() {
  document.getElementById('login-form-section').classList.remove('hidden');
  document.getElementById('reset-form-section').classList.add('hidden');
  document.getElementById('reset-sent-section').classList.add('hidden');
}

function showResetSent() {
  document.getElementById('reset-form-section').classList.add('hidden');
  document.getElementById('reset-sent-section').classList.remove('hidden');
}


/* ===================================================
   TABS
=================================================== */
function switchTab(tabId, btn) {
  const tabContents = btn.closest('.card').querySelectorAll('.tab-content');
  tabContents.forEach(el => el.classList.remove('active'));
  const tabBtns = btn.closest('.tabs').querySelectorAll('.tab');
  tabBtns.forEach(el => el.classList.remove('active'));

  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');
  btn.classList.add('active');
}


/* ===================================================
   MODALS
=================================================== */
function showScheduleModal() {
  document.getElementById('modal-schedule').classList.remove('hidden');
}

function showCloseoutModal() {
  document.getElementById('modal-closeout').classList.remove('hidden');
}

function showApproveModal() {
  document.getElementById('modal-approve').classList.remove('hidden');
}

function showRejectModal() {
  document.getElementById('modal-reject').classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
  }
});


/* ===================================================
   APPROVE / REJECT
=================================================== */
function doApprove() {
  closeModal('modal-approve');
  showToast('✓ 予約を承認しました。予約者へ確定メールを送信しました。', 'success');
  setTimeout(() => navigate('bookings'), 800);
}

function doReject() {
  closeModal('modal-reject');
  showToast('予約を拒否しました。予約者へ通知メールを送信しました。', 'danger');
  setTimeout(() => navigate('bookings'), 800);
}


/* ===================================================
   BOOKINGS TABLE
=================================================== */
function renderBookings() {
  const tbody = document.getElementById('bookings-tbody');
  if (!tbody) return;

  tbody.innerHTML = BOOKINGS.map(b => {
    const s = STATUS_LABELS[b.status] || { label: b.status, cls: '' };
    const actions = b.status === 'pending'
      ? `<button class="btn btn-success btn-sm" onclick="navigate('booking-detail')">承認</button>
         <button class="btn btn-ghost btn-sm" onclick="navigate('booking-detail')">詳細</button>`
      : `<button class="btn btn-ghost btn-sm" onclick="navigate('booking-detail')">詳細</button>`;
    return `<tr>
      <td class="order-no">${b.id}</td>
      <td>${b.activity}</td>
      <td>${b.scheduleDate}</td>
      <td>${b.traveler}</td>
      <td>${b.pax}</td>
      <td class="price-value">¥${b.total.toLocaleString()}</td>
      <td><span class="status-badge ${s.cls}">${s.label}</span></td>
      <td>${actions}</td>
    </tr>`;
  }).join('');
}


/* ===================================================
   ACTIVITY FILTER
=================================================== */
function filterActivities(type, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}


/* ===================================================
   BAR CHART (SVG)
=================================================== */
function drawChart() {
  const canvas = document.getElementById('bar-chart');
  if (!canvas) return;

  const W = canvas.offsetWidth || 400;
  const H = 180;
  const PAD = { top: 20, right: 16, bottom: 36, left: 32 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const max = Math.max(...CHART_DATA.values);

  const barW = (chartW / CHART_DATA.values.length) * 0.55;
  const gap  = chartW / CHART_DATA.values.length;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;

  // Y grid lines
  [0, 0.25, 0.5, 0.75, 1].forEach(t => {
    const y = PAD.top + chartH * (1 - t);
    const val = Math.round(max * t);
    svg += `<line x1="${PAD.left}" y1="${y}" x2="${W - PAD.right}" y2="${y}" stroke="#E2E8F0" stroke-width="1"/>`;
    svg += `<text x="${PAD.left - 4}" y="${y + 4}" text-anchor="end" font-size="10" fill="#94A3B8">${val}</text>`;
  });

  // Bars + labels
  CHART_DATA.values.forEach((v, i) => {
    const x = PAD.left + gap * i + (gap - barW) / 2;
    const barH = (v / max) * chartH;
    const y = PAD.top + chartH - barH;

    svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="3" fill="#0EA5E9" opacity="0.85"/>`;
    svg += `<text x="${x + barW / 2}" y="${y - 5}" text-anchor="middle" font-size="10" font-weight="600" fill="#334155">${v}</text>`;
    svg += `<text x="${x + barW / 2}" y="${H - 6}" text-anchor="middle" font-size="10" fill="#94A3B8">${CHART_DATA.labels[i]}</text>`;
  });

  svg += '</svg>';
  canvas.innerHTML = svg;
  canvas.style.display = 'block';
}


/* ===================================================
   PAYMENT MONTH
=================================================== */
const BASE_MONTH = { year: 2026, month: 5 };

function changePaymentMonth(dir) {
  paymentMonthOffset += dir;
  let m = BASE_MONTH.month + paymentMonthOffset;
  let y = BASE_MONTH.year;
  while (m < 1)  { m += 12; y--; }
  while (m > 12) { m -= 12; y++; }

  const label = document.getElementById('payment-month');
  if (label) label.textContent = `${y}年${m}月`;
}


/* ===================================================
   SCHEDULE MODAL UI
=================================================== */
function updateRuleTypeUI() {
  const type = document.getElementById('rule-type-select')?.value;
  const weeklyDays = document.getElementById('rule-weekly-days');
  if (weeklyDays) weeklyDays.style.display = (type === 'weekly') ? '' : 'none';
}

function saveSchedule() {
  closeModal('modal-schedule');
  showToast('✓ スケジュールルールを保存しました。', 'success');
}


/* ===================================================
   CSV EXPORT
=================================================== */
function exportCSV() {
  const header = ['受注番号', 'アクティビティ', '開催日時', '予約者名', '人数', '合計金額', 'ステータス'];
  const rows = BOOKINGS.map(b => [
    b.id, b.activity, b.scheduleDate, b.traveler, b.pax,
    `¥${b.total.toLocaleString()}`,
    STATUS_LABELS[b.status]?.label || b.status,
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `予約一覧_2026-05.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSVをダウンロードしました。', 'success');
}


/* ===================================================
   TOAST
=================================================== */
let toastTimer = null;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = 'toast' + (type ? ` ${type}` : '');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
}


/* ===================================================
   INIT
=================================================== */
window.addEventListener('DOMContentLoaded', () => {
  setupNav();
  renderBookings();
  // Chart is rendered after a small delay to let the layout settle
  setTimeout(drawChart, 50);
});
