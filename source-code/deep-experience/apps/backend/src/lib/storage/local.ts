import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import type { StorageProvider, UploadResult } from "./index";
import { generateThumbnail } from "./thumbnail";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export class LocalStorageProvider implements StorageProvider {
  async upload(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    const ext = path.extname(filename) || ".jpg";
    const baseName = `${crypto.randomUUID()}_${Date.now()}`;
    const originalName = `${baseName}${ext}`;
    const thumbName = `${baseName}_thumb.jpg`;

    await mkdir(path.join(UPLOAD_DIR, "originals"), { recursive: true });
    await mkdir(path.join(UPLOAD_DIR, "thumbnails"), { recursive: true });

    // Save original
    await writeFile(path.join(UPLOAD_DIR, "originals", originalName), buffer);

    // Generate and save thumbnail
    const { thumbnailBuffer, width, height } =
      await generateThumbnail(buffer);
    await writeFile(
      path.join(UPLOAD_DIR, "thumbnails", thumbName),
      thumbnailBuffer
    );

    return {
      originalUrl: `/uploads/originals/${originalName}`,
      thumbnailUrl: `/uploads/thumbnails/${thumbName}`,
      width,
      height,
      sizeBytes: buffer.length,
    };
  }

  async delete(originalUrl: string, thumbnailUrl: string): Promise<void> {
    const originalPath = path.join(process.cwd(), "public", originalUrl);
    const thumbPath = path.join(process.cwd(), "public", thumbnailUrl);

    await unlink(originalPath).catch(() => {});
    await unlink(thumbPath).catch(() => {});
  }
}
