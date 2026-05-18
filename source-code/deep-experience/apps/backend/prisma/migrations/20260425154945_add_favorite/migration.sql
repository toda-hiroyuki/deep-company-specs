-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Favorite_guestId_idx" ON "Favorite"("guestId");

-- CreateIndex
CREATE INDEX "Favorite_tourId_idx" ON "Favorite"("tourId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_guestId_tourId_key" ON "Favorite"("guestId", "tourId");

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
