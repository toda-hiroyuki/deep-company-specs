import sharp from "sharp";

const THUMB_MAX_WIDTH = 400;
const THUMB_MAX_HEIGHT = 300;
const THUMB_QUALITY = 80;

export interface ThumbnailResult {
  thumbnailBuffer: Buffer;
  width: number | null;
  height: number | null;
}

export async function generateThumbnail(
  buffer: Buffer
): Promise<ThumbnailResult> {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  const thumbnailBuffer = await image
    .resize(THUMB_MAX_WIDTH, THUMB_MAX_HEIGHT, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: THUMB_QUALITY })
    .toBuffer();

  return {
    thumbnailBuffer,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
  };
}
