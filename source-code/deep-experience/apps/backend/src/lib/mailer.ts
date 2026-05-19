const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL ?? "noreply@deepexperience.jp";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:8001";

export { SITE_URL };

export async function sendMail(to: string, subject: string, html: string) {
  if (!SENDGRID_API_KEY) {
    // 開発環境: コンソールに出力
    console.log(`\n[DEV MAIL] To: ${to}\nSubject: ${subject}\n${html}\n`);
    return;
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM_EMAIL, name: "Deep Experience" },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SendGrid error ${res.status}: ${body}`);
  }
}

export function passwordResetMailHtml(resetUrl: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#1f2937">パスワードリセット</h2>
      <p>以下のボタンからパスワードを再設定してください。<br>リンクの有効期限は<strong>1時間</strong>です。</p>
      <p style="margin:24px 0">
        <a href="${resetUrl}"
           style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
          パスワードを再設定する
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px">
        このメールに心当たりがない場合は無視してください。<br>
        リンク: <a href="${resetUrl}">${resetUrl}</a>
      </p>
    </div>
  `;
}
