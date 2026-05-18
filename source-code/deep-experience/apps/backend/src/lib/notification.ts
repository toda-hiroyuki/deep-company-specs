import { PrismaClient, Prisma } from "@prisma/client";

type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

interface CreateNotificationParams {
  recipientEmail: string;
  bookingId?: string;
  type: string;
  titleEn: string;
  messageEn: string;
}

export async function createNotification(
  params: CreateNotificationParams,
  tx: TxClient
) {
  return tx.notification.create({
    data: {
      recipientEmail: params.recipientEmail,
      bookingId: params.bookingId ?? null,
      type: params.type,
      titleEn: params.titleEn,
      messageEn: params.messageEn,
    },
  });
}
