import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import path from "path";
import crypto from "crypto";
import type { StorageProvider, UploadResult } from "./index";
import { generateThumbnail } from "./thumbnail";

// Supabase Storage provider for Vercel deployments.
// Uses the service role key on the server side — RLS is bypassed, which is
// fine because all uploads go through admin-authenticated API routes.
// The bucket must exist and be public; URLs returned are public URLs that
// CDN-cache the image. Switch to signed URLs if access control becomes
// necessary.

const ORIGINALS_PREFIX = "originals";
const THUMBNAILS_PREFIX = "thumbnails";

export class SupabaseStorageProvider implements StorageProvider {
  private client: SupabaseClient;
  private bucket: string;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET;
    if (!url || !key || !bucket) {
      throw new Error(
        "SupabaseStorageProvider requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET"
      );
    }
    this.client = createClient(url, key, { auth: { persistSession: false } });
    this.bucket = bucket;
  }

  async upload(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    const ext = path.extname(filename) || ".jpg";
    const baseName = `${crypto.randomUUID()}_${Date.now()}`;
    const originalPath = `${ORIGINALS_PREFIX}/${baseName}${ext}`;
    const thumbnailPath = `${THUMBNAILS_PREFIX}/${baseName}_thumb.jpg`;

    const { thumbnailBuffer, width, height } = await generateThumbnail(buffer);

    const originalUpload = await this.client.storage
      .from(this.bucket)
      .upload(originalPath, buffer, {
        contentType: mimeType,
        upsert: false,
      });
    if (originalUpload.error) {
      throw new Error(
        `Supabase upload failed (original): ${originalUpload.error.message}`
      );
    }

    const thumbUpload = await this.client.storage
      .from(this.bucket)
      .upload(thumbnailPath, thumbnailBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      });
    if (thumbUpload.error) {
      // Best-effort cleanup: delete original to avoid orphaned files.
      await this.client.storage
        .from(this.bucket)
        .remove([originalPath])
        .catch(() => {});
      throw new Error(
        `Supabase upload failed (thumbnail): ${thumbUpload.error.message}`
      );
    }

    return {
      originalUrl: this.publicUrl(originalPath),
      thumbnailUrl: this.publicUrl(thumbnailPath),
      width,
      height,
      sizeBytes: buffer.length,
    };
  }

  async delete(originalUrl: string, thumbnailUrl: string): Promise<void> {
    const targets = [originalUrl, thumbnailUrl]
      .map((u) => this.objectPathFromUrl(u))
      .filter((p): p is string => p !== null);
    if (targets.length === 0) return;
    await this.client.storage
      .from(this.bucket)
      .remove(targets)
      .catch(() => {});
  }

  private publicUrl(objectPath: string): string {
    const { data } = this.client.storage
      .from(this.bucket)
      .getPublicUrl(objectPath);
    return data.publicUrl;
  }

  // Reverse-derive the bucket-relative path from a public URL so delete() can
  // round-trip whatever upload() emitted.
  private objectPathFromUrl(url: string): string | null {
    const marker = `/object/public/${this.bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.slice(idx + marker.length);
  }
}
