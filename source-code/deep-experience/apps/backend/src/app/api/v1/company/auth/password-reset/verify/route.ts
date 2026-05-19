import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError } from "@/lib/response";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return jsonError("VALIDATION_ERROR", "トークンが指定されていません", 400);
  }

  const operator = await prisma.operator.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpiresAt: { gt: new Date() },
    },
    select: { id: true },
  });

  if (!operator) {
    return jsonError("INVALID_TOKEN", "リンクが無効または期限切れです", 400);
  }

  return jsonOk({ valid: true });
}
