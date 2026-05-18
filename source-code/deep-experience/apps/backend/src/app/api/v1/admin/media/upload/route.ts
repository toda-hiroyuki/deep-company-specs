import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonOk, validationError } from "@/lib/response";
import { getStorageProvider } from "@/lib/storage/factory";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// POST /api/v1/admin/media/upload
export async function POST(req: NextRequest) {
  const auth = requireAuth(req, "admin");
  if (auth instanceof Response) return auth;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return validationError([{ field: "file", message: "required" }]);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return validationError([
      { field: "file", message: `unsupported type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(", ")}` },
    ]);
  }

  if (file.size > MAX_SIZE) {
    return validationError([
      { field: "file", message: `file too large (max ${MAX_SIZE / 1024 / 1024}MB)` },
    ]);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = getStorageProvider();
  const result = await storage.upload(buffer, file.name, file.type);

  const media = await prisma.media.create({
    data: {
      filename: file.name,
      originalUrl: result.originalUrl,
      thumbnailUrl: result.thumbnailUrl,
      mimeType: file.type,
      sizeBytes: result.sizeBytes,
      width: result.width,
      height: result.height,
    },
  });

  return jsonOk(media, 201);
}
