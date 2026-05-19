-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordResetToken" TEXT,
    "passwordResetExpiresAt" TIMESTAMP(3),
    "loginFailureCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "locale" TEXT NOT NULL DEFAULT 'ja',
    "paymentClosingDay" INTEGER NOT NULL DEFAULT 31,
    "paymentTransferDay" INTEGER NOT NULL DEFAULT 25,
    "notifyOnNewBookingEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnNewBookingInApp" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnCancelEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnCancelInApp" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnPaymentEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmailLocale" TEXT NOT NULL DEFAULT 'ja',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySpot" (
    "companyId" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,

    CONSTRAINT "CompanySpot_pkey" PRIMARY KEY ("companyId","spotId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_email_key" ON "Company"("email");

-- CreateIndex
CREATE INDEX "CompanySpot_companyId_idx" ON "CompanySpot"("companyId");

-- CreateIndex
CREATE INDEX "CompanySpot_spotId_idx" ON "CompanySpot"("spotId");

-- AddForeignKey
ALTER TABLE "CompanySpot" ADD CONSTRAINT "CompanySpot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySpot" ADD CONSTRAINT "CompanySpot_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
