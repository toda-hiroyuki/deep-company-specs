import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { jsonOk } from "@/lib/response";
import { sendMail, passwordResetMailHtml, SITE_URL } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  // セキュリティのため、メール存在有無にかかわらず同じレスポンスを返す
  if (!email) {
    return jsonOk({ message: "メールをご確認ください" });
  }

  const operator = await prisma.operator.findUnique({ where: { email } });

  if (operator) {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1時間

    await prisma.operator.update({
      where: { id: operator.id },
      data: {
        passwordResetToken: token,
        passwordResetExpiresAt: expiresAt,
      },
    });

    const resetUrl = `${SITE_URL}/operator/login/reset-password?token=${token}`;
    await sendMail(email, "【Deep Experience】パスワード再設定のご案内", passwordResetMailHtml(resetUrl));
  }

  return jsonOk({ message: "メールをご確認ください" });
}
