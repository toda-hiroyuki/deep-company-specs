export interface UploadResult {
  originalUrl: string;
  thumbnailUrl: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
}

export interface StorageProvider {
  upload(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult>;

  delete(originalUrl: string, thumbnailUrl: string): Promise<void>;
}
