import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound, validationError } from "@/lib/response";

// GET /api/v1/admin/tours/:tourId/rates
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { tourId } = await params;
  const rates = await prisma.rate.findMany({
    where: { tourId },
    include: { ratePrices: { include: { pricingCategory: true } } },
    orderBy: { createdAt: "asc" },
  });

  return jsonOk({ rates });
}

// POST /api/v1/admin/tours/:tourId/rates
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { tourId } = await params;
  const tour = await prisma.tour.findUnique({ where: { id: tourId } });
  if (!tour) return notFound("Tour not found");

  const body = await req.json();
  const errors: { field: string; message: string }[] = [];
  if (!body.label) errors.push({ field: "label", message: "required" });
  if (!body.prices || !Array.isArray(body.prices))
    errors.push({ field: "prices", message: "required array of {pricingCategoryId, priceCents}" });
  if (errors.length > 0) return validationError(errors);

  const rate = await prisma.rate.create({
    data: {
      tourId,
      label: body.label,
      labelJa: body.labelJa || "",
      isDefault: body.isDefault ?? false,
      minPerBooking: body.minPerBooking ?? null,
      maxPerBooking: body.maxPerBooking ?? null,
      validFrom: body.validFrom ? new Date(body.validFrom) : null,
      validTo: body.validTo ? new Date(body.validTo) : null,
      ratePrices: {
        create: body.prices.map((p: { pricingCategoryId: string; priceCents: number }) => ({
          pricingCategoryId: p.pricingCategoryId,
          priceCents: p.priceCents,
        })),
      },
    },
    include: { ratePrices: { include: { pricingCategory: true } } },
  });

  return jsonOk(rate, 201);
}

// PUT /api/v1/admin/tours/:tourId/rates (bulk update all rates + prices)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { tourId } = await params;
  const body = await req.json();

  if (!Array.isArray(body.rates)) {
    return validationError([{ field: "rates", message: "must be an array" }]);
  }

  // Delete existing rates and prices, then recreate
  await prisma.ratePrice.deleteMany({
    where: { rate: { tourId } },
  });
  await prisma.rate.deleteMany({ where: { tourId } });

  const created = [];
  for (const r of body.rates) {
    const rate = await prisma.rate.create({
      data: {
        tourId,
        label: r.label,
        labelJa: r.labelJa || "",
        isDefault: r.isDefault ?? false,
        minPerBooking: r.minPerBooking ?? null,
        maxPerBooking: r.maxPerBooking ?? null,
        validFrom: r.validFrom ? new Date(r.validFrom) : null,
        validTo: r.validTo ? new Date(r.validTo) : null,
        ratePrices: {
          create: (r.prices || []).map((p: { pricingCategoryId: string; priceCents: number }) => ({
            pricingCategoryId: p.pricingCategoryId,
            priceCents: p.priceCents,
          })),
        },
      },
      include: { ratePrices: { include: { pricingCategory: true } } },
    });
    created.push(rate);
  }

  return jsonOk({ rates: created });
}
