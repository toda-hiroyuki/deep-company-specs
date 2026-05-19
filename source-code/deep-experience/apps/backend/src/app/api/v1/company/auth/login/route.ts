import { NextRequest } from "next/server";
import { compareSync } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/response";

const MAX_FAILURES = 3;
const LOCK_MINUTES = 5;

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("VALIDATION_ERROR", "リクエストの形式が正しくありません", 400);
  }
  const { email, password } = body;

  if (!email || !password) {
    return jsonError("VALIDATION_ERROR", "メールアドレスとパスワードを入力してください", 400);
  }

  try {
    const company = await prisma.company.findUnique({ where: { email } });

    // 存在しない場合も同じエラーを返す（ユーザー存在の漏洩防止）
    if (!company) {
      return jsonError("UNAUTHORIZED", "メールアドレスまたはパスワードが正しくありません", 401);
    }

    // アカウントロック確認
    if (company.lockedUntil && company.lockedUntil > new Date()) {
      const remainingMs = company.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      return jsonError(
        "ACCOUNT_LOCKED",
        `ログイン試行回数が上限に達しました。${remainingMin}分後に再度お試しください。`,
        429
      );
    }

    const passwordMatch = compareSync(password, company.passwordHash);

    if (!passwordMatch) {
      const newFailureCount = company.loginFailureCount + 1;
      const shouldLock = newFailureCount >= MAX_FAILURES;

      await prisma.company.update({
        where: { id: company.id },
        data: {
          loginFailureCount: newFailureCount,
          lockedUntil: shouldLock
            ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
            : null,
        },
      });

      if (shouldLock) {
        return jsonError(
          "ACCOUNT_LOCKED",
          `ログイン試行回数が上限に達しました。${LOCK_MINUTES}分後に再度お試しください。`,
          429
        );
      }

      return jsonError("UNAUTHORIZED", "メールアドレスまたはパスワードが正しくありません", 401);
    }

    // ログイン成功: 失敗カウントをリセット
    await prisma.company.update({
      where: { id: company.id },
      data: { loginFailureCount: 0, lockedUntil: null },
    });

    const token = signToken({ id: company.id, email: company.email, role: "company" });

    return jsonOk({
      token,
      company: { id: company.id, name: company.name, email: company.email },
    });
  } catch (err) {
    console.error("[company/auth/login]", err);
    return jsonError("INTERNAL_ERROR", "サーバーエラーが発生しました。しばらく時間をおいて再度お試しください。", 500);
  }
}
