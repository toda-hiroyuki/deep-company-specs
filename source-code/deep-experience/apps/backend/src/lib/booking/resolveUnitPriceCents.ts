import { prisma } from "@/lib/prisma";

// Unit-price resolution shared between updateBookingGuests (mutation) and the
// admin booking detail GET (preview/display). Resolution order:
//   1. booking.rateId + PricingCategory.isDefault=true → RatePrice.priceCents
//   2. fallback: tour.pricePerPersonCents (legacy / missing setup)
// BookingPassenger-based pricing is intentionally out of scope.
export async function resolveUnitPriceCents(
  rateId: string | null,
  tourId: string,
  fallbackCents: number
): Promise<number> {
  if (!rateId) return fallbackCents;
  const defaultCategory = await prisma.pricingCategory.findFirst({
    where: { tourId, isDefault: true },
    select: { id: true },
  });
  if (!defaultCategory) return fallbackCents;
  const ratePrice = await prisma.ratePrice.findFirst({
    where: { rateId, pricingCategoryId: defaultCategory.id },
    select: { priceCents: true },
  });
  if (!ratePrice) return fallbackCents;
  return ratePrice.priceCents;
}
