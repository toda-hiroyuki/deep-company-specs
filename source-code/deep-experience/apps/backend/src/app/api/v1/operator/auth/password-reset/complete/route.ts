import { NextRequest } from "next/server";
import { hashSync } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, validationError } from "@/lib/response";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  const errors: { field: string; message: string }[] = [];
  if (!token) errors.push({ field: "token", message: "required" });
  if (!password) errors.push({ field: "password", message: "required" });
  if (password && password.length < 8)
    errors.push({ field: "password", message: "8文字以上で入力してください" });
  if (errors.length > 0) return validationError(errors);

  const operator = await prisma.operator.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpiresAt: { gt: new Date() },
    },
  });

  if (!operator) {
    return jsonError("INVALID_TOKEN", "リンクが無効または期限切れです", 400);
  }

  await prisma.operator.update({
    where: { id: operator.id },
    data: {
      passwordHash: hashSync(password, 12),
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      loginFailureCount: 0,
      lockedUntil: null,
    },
  });

  return jsonOk({ message: "パスワードを変更しました" });
}
