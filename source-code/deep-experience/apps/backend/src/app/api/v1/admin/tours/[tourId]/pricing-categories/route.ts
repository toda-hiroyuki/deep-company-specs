import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, notFound, validationError } from "@/lib/response";

// GET /api/v1/admin/tours/:tourId/pricing-categories
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { tourId } = await params;
  const categories = await prisma.pricingCategory.findMany({
    where: { tourId },
    include: { ratePrices: true },
    orderBy: { sortOrder: "asc" },
  });

  return jsonOk({ pricingCategories: categories });
}

// POST /api/v1/admin/tours/:tourId/pricing-categories
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
  if (errors.length > 0) return validationError(errors);

  const category = await prisma.pricingCategory.create({
    data: {
      tourId,
      label: body.label,
      labelJa: body.labelJa || "",
      minAge: body.minAge ?? null,
      maxAge: body.maxAge ?? null,
      sortOrder: body.sortOrder ?? 0,
      isDefault: body.isDefault ?? false,
    },
  });

  return jsonOk(category, 201);
}

// PUT /api/v1/admin/tours/:tourId/pricing-categories (bulk update)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const { tourId } = await params;
  const body = await req.json();

  if (!Array.isArray(body.categories)) {
    return validationError([{ field: "categories", message: "must be an array" }]);
  }

  // Delete existing and recreate (simpler for bulk operations)
  await prisma.pricingCategory.deleteMany({ where: { tourId } });

  const created = [];
  for (const cat of body.categories) {
    const c = await prisma.pricingCategory.create({
      data: {
        tourId,
        label: cat.label,
        labelJa: cat.labelJa || "",
        minAge: cat.minAge ?? null,
        maxAge: cat.maxAge ?? null,
        sortOrder: cat.sortOrder ?? 0,
        isDefault: cat.isDefault ?? false,
      },
    });
    created.push(c);
  }

  return jsonOk({ pricingCategories: created });
}
