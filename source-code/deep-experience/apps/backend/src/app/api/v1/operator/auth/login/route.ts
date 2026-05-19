import { NextRequest } from "next/server";
import { compareSync } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/response";

const MAX_FAILURES = 3;
const LOCK_MINUTES = 5;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password } = body;

  if (!email || !password) {
    return jsonError("VALIDATION_ERROR", "メールアドレスとパスワードを入力してください", 400);
  }

  const operator = await prisma.operator.findUnique({ where: { email } });

  // 存在しない場合も同じエラーを返す（ユーザー存在の漏洩防止）
  if (!operator) {
    return jsonError("UNAUTHORIZED", "メールアドレスまたはパスワードが正しくありません", 401);
  }

  // アカウントロック確認
  if (operator.lockedUntil && operator.lockedUntil > new Date()) {
    const remainingMs = operator.lockedUntil.getTime() - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60000);
    return jsonError(
      "ACCOUNT_LOCKED",
      `ログイン試行回数が上限に達しました。${remainingMin}分後に再度お試しください。`,
      429
    );
  }

  const passwordMatch = compareSync(password, operator.passwordHash);

  if (!passwordMatch) {
    const newFailureCount = operator.loginFailureCount + 1;
    const shouldLock = newFailureCount >= MAX_FAILURES;

    await prisma.operator.update({
      where: { id: operator.id },
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
  await prisma.operator.update({
    where: { id: operator.id },
    data: { loginFailureCount: 0, lockedUntil: null },
  });

  const token = signToken({ id: operator.id, email: operator.email, role: "operator" });

  return jsonOk({
    token,
    operator: { id: operator.id, name: operator.name, email: operator.email },
  });
}
