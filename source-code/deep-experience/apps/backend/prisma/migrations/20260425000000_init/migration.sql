-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "nationality" TEXT,
    "language" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "imageUrls" TEXT NOT NULL DEFAULT '[]',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "locationName" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Spot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tour" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "imageUrls" TEXT NOT NULL DEFAULT '[]',
    "meetingPointLat" DOUBLE PRECISION NOT NULL,
    "meetingPointLng" DOUBLE PRECISION NOT NULL,
    "meetingPointName" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "pricePerPersonCents" INTEGER NOT NULL,
    "maxParticipants" INTEGER NOT NULL,
    "tourType" TEXT NOT NULL DEFAULT 'GROUP',
    "category" TEXT NOT NULL,
    "bookingType" TEXT NOT NULL DEFAULT 'DATE_AND_TIME',
    "meetingType" TEXT NOT NULL DEFAULT 'MEET_ON_LOCATION',
    "ticketSupport" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
    "capacityModel" TEXT NOT NULL DEFAULT 'LIMITED',
    "spotId" TEXT,
    "area" TEXT NOT NULL DEFAULT '',
    "areaDetail" TEXT NOT NULL DEFAULT '',
    "cancellationPolicy" TEXT NOT NULL DEFAULT '',
    "paymentMethod" TEXT NOT NULL DEFAULT 'ON_SITE',
    "supportedLanguages" TEXT NOT NULL DEFAULT '["ja","en"]',
    "highlightsJa" TEXT NOT NULL DEFAULT '',
    "highlightsEn" TEXT NOT NULL DEFAULT '',
    "inclusionsJa" TEXT NOT NULL DEFAULT '',
    "inclusionsEn" TEXT NOT NULL DEFAULT '',
    "importantNotesJa" TEXT NOT NULL DEFAULT '',
    "importantNotesEn" TEXT NOT NULL DEFAULT '',
    "bookingNotesJa" TEXT NOT NULL DEFAULT '',
    "bookingNotesEn" TEXT NOT NULL DEFAULT '',
    "meetingPointDescJa" TEXT NOT NULL DEFAULT '',
    "meetingPointDescEn" TEXT NOT NULL DEFAULT '',
    "accessInfoJa" TEXT NOT NULL DEFAULT '',
    "accessInfoEn" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "dailyCapacity" INTEGER,
    "maxDeparturesPerDay" INTEGER,
    "bookingCutoffMinutes" INTEGER,
    "freeCancellationDeadlineHours" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingCategory" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelJa" TEXT NOT NULL DEFAULT '',
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rate" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelJa" TEXT NOT NULL DEFAULT '',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "minPerBooking" INTEGER,
    "maxPerBooking" INTEGER,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatePrice" (
    "id" TEXT NOT NULL,
    "rateId" TEXT NOT NULL,
    "pricingCategoryId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,

    CONSTRAINT "RatePrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityRule" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "daysOfWeek" TEXT NOT NULL DEFAULT '[]',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "singleDate" TIMESTAMP(3),
    "startTimes" TEXT NOT NULL DEFAULT '[]',
    "capacity" INTEGER NOT NULL,
    "minParticipants" INTEGER NOT NULL DEFAULT 1,
    "maxPerBooking" INTEGER,
    "minPerBooking" INTEGER NOT NULL DEFAULT 1,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CloseOut" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CloseOut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourSchedule" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "sourceRuleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TourSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "tourScheduleId" TEXT NOT NULL,
    "rateId" TEXT,
    "guestId" TEXT,
    "travelerName" TEXT NOT NULL,
    "travelerEmail" TEXT NOT NULL,
    "travelerPhone" TEXT,
    "travelerNationality" TEXT,
    "travelerLanguage" TEXT,
    "numberOfGuests" INTEGER NOT NULL,
    "totalPriceCents" INTEGER NOT NULL DEFAULT 0,
    "specialRequests" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignmentState" TEXT NOT NULL DEFAULT 'TENTATIVE',
    "bookingSource" TEXT NOT NULL DEFAULT 'DIRECT',
    "bookingChannel" TEXT,
    "externalBookingId" TEXT,
    "confirmationCode" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingPassenger" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "pricingCategoryId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,

    CONSTRAINT "BookingPassenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guide" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profileImageUrl" TEXT,
    "bio" TEXT,
    "languages" TEXT NOT NULL DEFAULT '[]',
    "areas" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideAssignment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "declineReason" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "GuideAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "bookingId" TEXT,
    "type" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "messageEn" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourMedia" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TourMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpotMedia" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SpotMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobExecutionLog" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "processedCount" INTEGER,
    "warnCount" INTEGER,
    "errorMessage" TEXT,
    "payload" TEXT,

    CONSTRAINT "JobExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Guest_email_key" ON "Guest"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Tour_spotId_idx" ON "Tour"("spotId");

-- CreateIndex
CREATE INDEX "PricingCategory_tourId_idx" ON "PricingCategory"("tourId");

-- CreateIndex
CREATE INDEX "Rate_tourId_idx" ON "Rate"("tourId");

-- CreateIndex
CREATE INDEX "RatePrice_rateId_idx" ON "RatePrice"("rateId");

-- CreateIndex
CREATE INDEX "RatePrice_pricingCategoryId_idx" ON "RatePrice"("pricingCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "RatePrice_rateId_pricingCategoryId_key" ON "RatePrice"("rateId", "pricingCategoryId");

-- CreateIndex
CREATE INDEX "AvailabilityRule_tourId_idx" ON "AvailabilityRule"("tourId");

-- CreateIndex
CREATE INDEX "CloseOut_tourId_idx" ON "CloseOut"("tourId");

-- CreateIndex
CREATE INDEX "CloseOut_date_idx" ON "CloseOut"("date");

-- CreateIndex
CREATE INDEX "TourSchedule_tourId_idx" ON "TourSchedule"("tourId");

-- CreateIndex
CREATE INDEX "TourSchedule_startDateTime_idx" ON "TourSchedule"("startDateTime");

-- CreateIndex
CREATE INDEX "TourSchedule_status_idx" ON "TourSchedule"("status");

-- CreateIndex
CREATE INDEX "Booking_tourScheduleId_idx" ON "Booking"("tourScheduleId");

-- CreateIndex
CREATE INDEX "Booking_travelerEmail_idx" ON "Booking"("travelerEmail");

-- CreateIndex
CREATE INDEX "Booking_guestId_idx" ON "Booking"("guestId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "BookingPassenger_bookingId_idx" ON "BookingPassenger"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Guide_email_key" ON "Guide"("email");

-- CreateIndex
CREATE INDEX "GuideAssignment_bookingId_idx" ON "GuideAssignment"("bookingId");

-- CreateIndex
CREATE INDEX "GuideAssignment_guideId_idx" ON "GuideAssignment"("guideId");

-- CreateIndex
CREATE INDEX "GuideAssignment_status_idx" ON "GuideAssignment"("status");

-- CreateIndex
CREATE INDEX "Notification_recipientEmail_idx" ON "Notification"("recipientEmail");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_bookingId_idx" ON "Notification"("bookingId");

-- CreateIndex
CREATE INDEX "TourMedia_tourId_idx" ON "TourMedia"("tourId");

-- CreateIndex
CREATE INDEX "TourMedia_mediaId_idx" ON "TourMedia"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "TourMedia_tourId_mediaId_key" ON "TourMedia"("tourId", "mediaId");

-- CreateIndex
CREATE INDEX "SpotMedia_spotId_idx" ON "SpotMedia"("spotId");

-- CreateIndex
CREATE INDEX "SpotMedia_mediaId_idx" ON "SpotMedia"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "SpotMedia_spotId_mediaId_key" ON "SpotMedia"("spotId", "mediaId");

-- CreateIndex
CREATE INDEX "JobExecutionLog_jobName_idx" ON "JobExecutionLog"("jobName");

-- CreateIndex
CREATE INDEX "JobExecutionLog_startedAt_idx" ON "JobExecutionLog"("startedAt");

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCategory" ADD CONSTRAINT "PricingCategory_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rate" ADD CONSTRAINT "Rate_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatePrice" ADD CONSTRAINT "RatePrice_rateId_fkey" FOREIGN KEY ("rateId") REFERENCES "Rate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatePrice" ADD CONSTRAINT "RatePrice_pricingCategoryId_fkey" FOREIGN KEY ("pricingCategoryId") REFERENCES "PricingCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRule" ADD CONSTRAINT "AvailabilityRule_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CloseOut" ADD CONSTRAINT "CloseOut_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourSchedule" ADD CONSTRAINT "TourSchedule_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tourScheduleId_fkey" FOREIGN KEY ("tourScheduleId") REFERENCES "TourSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_rateId_fkey" FOREIGN KEY ("rateId") REFERENCES "Rate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPassenger" ADD CONSTRAINT "BookingPassenger_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPassenger" ADD CONSTRAINT "BookingPassenger_pricingCategoryId_fkey" FOREIGN KEY ("pricingCategoryId") REFERENCES "PricingCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideAssignment" ADD CONSTRAINT "GuideAssignment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideAssignment" ADD CONSTRAINT "GuideAssignment_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourMedia" ADD CONSTRAINT "TourMedia_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourMedia" ADD CONSTRAINT "TourMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpotMedia" ADD CONSTRAINT "SpotMedia_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpotMedia" ADD CONSTRAINT "SpotMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
